"""AgentService — agentic loop that gives the LLM tools to search and book flights.

Uses OpenAI's API (gpt-4o) with function calling.
The loop:
  1. Send conversation + tool definitions to OpenAI
  2. If the model calls a tool → dispatch to the matching handler in agent_tools,
     append the result, repeat
  3. When the model stops calling tools → stream the final text response

Prompt templates and tool schemas live in ``app.core.prompts``.
Tool handlers and the tool registry live in ``app.services.agent_tools``.
See those modules for detailed design notes.
"""

import asyncio
import json
import time
import uuid
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import get_logger
from app.core.prompts import AGENT_TOOLS, build_agent_system_prompt
from app.schemas.agent import AgentMessage
from app.services.agent_tools import TOOL_REGISTRY, ToolContext
from app.services.flight_service import FlightService

logger = get_logger(__name__)

_TOOLS = AGENT_TOOLS


# ── Intent detection — prevents refusals before they happen ───────────────────
# When the last user message clearly implies a tool action, we use
# tool_choice="required" on the FIRST call so the model cannot refuse.
# This is more robust than detecting refusals after the fact.

# IATA codes the system supports (from the system prompt)
_IATA_CODES = frozenset([
    "jfk", "lax", "ord", "dfw", "den", "sfo", "sea", "mia", "bos", "atl",
    "las", "phx", "lhr", "cdg", "fra", "ams", "mad", "fco", "zrh", "bcn",
    "dxb", "auh", "doh", "nrt", "hkg", "sin", "syd", "icn", "bkk",
])

# Plain keywords that imply a tool should be called
_TOOL_INTENT_KEYWORDS = frozenset([
    # flight search
    "flight", "flights", "fly ", "flying", "flew",
    # booking actions
    "book ", "booking", "booked", "reserve", "reservation", "ticket",
    # passenger / trip details
    "passenger", "passengers", "depart", "departure", "arrival", "arrive",
    "one-way", "one way", "round trip", "round-trip", "return flight",
    # cabin class
    "economy", "business class", "first class", "premium economy",
    # booking management
    "cancel", "cancellation", "modify", "modification", "reschedule",
    "retrieve", "check my booking", "get my booking", "change my booking",
    # booking reference pattern
    "pf-",
])


def _needs_tool(history: list[dict]) -> bool:
    """Return True if the last user message implies a tool must be called.

    Scans the last user turn for IATA codes or flight/booking keywords.
    Used to set tool_choice="required" on the first LLM call, preventing
    the model from issuing a safety-guardrail refusal instead of acting.
    """
    for msg in reversed(history):
        if msg.get("role") == "user":
            lowered = msg.get("content", "").lower()
            # Check IATA codes (word-boundary aware — "phx" inside "phoenix" is ok)
            words = set(lowered.split())
            if words & _IATA_CODES:
                return True
            if any(kw in lowered for kw in _TOOL_INTENT_KEYWORDS):
                return True
            return False  # last user message found, no match
    return False


# ── Safety-refusal detection — secondary safety net ───────────────────────────
# Even with tool_choice="required" the model occasionally emits a refusal
# text block instead of a tool call. These phrases catch that.
#
# IMPORTANT: Only include phrases that are UNAMBIGUOUSLY a tool-use refusal.
# False positives cause an infinite detect→force→detect loop that burns all
# 10 iterations and leaves the user with "I ran into trouble". Examples of
# phrases that MUST NOT be here:
#   "i'm unable to"    → also matches "I'm unable to find any flights"  (legitimate)
#   "please contact"   → also matches post-cancellation friendly messages (legitimate)
#   "official website" → too broad
#   "travel agency"    → too broad
# Only add a phrase here if you are 100% sure it cannot appear in a normal
# tool-result summary.

_REFUSAL_PHRASES = (
    # Model claims it cannot use the booking tools at all
    "unable to process booking",
    "unable to make booking",
    "unable to book",
    "cannot book",
    "can't book",
    "cannot process booking",
    "can't process booking",
    "i cannot access booking",
    "i cannot access your booking",
    "i don't have access to booking",
    "i do not have access to booking",
    "i cannot retrieve booking",
    "i cannot retrieve your booking",
    "i cannot make reservations",
    "i cannot make a reservation",
    # Model claims inability to access/retrieve booking details (exact phrases seen in prod)
    "unable to access or retrieve",
    "unable to access specific booking",
    "unable to retrieve specific booking",
    "cannot access or retrieve",
    # Model explicitly redirects the user to an external service
    # (these never appear in a legitimate Pathfinder response)
    "visit the airline",
    "visit a travel",
    "airline's website",
    "airline website",
    "trusted travel site",
    "trusted travel platform",
    "external website",
    # Model tells user to contact the airline/travel agency instead of using tools
    # The system prompt explicitly forbids these — they can never appear legitimately.
    "contact the airline",
    "contact your airline",
    "contact the travel",
    "where you made the reservation",
    "where you booked",
)


def _is_safety_refusal(text: str) -> bool:
    """Return True if the model text is an unambiguous tool-use refusal.

    Deliberately narrow — false positives cause retry loops that are worse
    than the refusal itself.  The primary defence is tool_choice="required"
    in _needs_tool(); this function is only a last-resort safety net.
    """
    import re
    lowered = text.lower()
    return (
        any(phrase in lowered for phrase in _REFUSAL_PHRASES)
        # "visit Southwest's official website" / "visit United's official website"
        or bool(re.search(r"visit\s+\S+.{0,20}official\s+website", lowered))
    )


# ── History management ────────────────────────────────────────────────────────

# ~15K tokens at 4 chars/token — keeps costs bounded while preserving enough
# context for multi-turn booking flows.
_MAX_HISTORY_CHARS = 60_000


def _trim_history(history: list[dict]) -> list[dict]:
    """Drop the oldest non-system messages when history exceeds the char limit.

    Always preserves history[0] (system prompt) and trims from the front so
    the most recent tool results and assistant turns are retained.
    """
    total = sum(len(str(m.get("content") or "")) for m in history)
    if total <= _MAX_HISTORY_CHARS:
        return history

    system = history[0]
    rest = list(history[1:])
    original_count = len(history)

    while rest and total > _MAX_HISTORY_CHARS:
        dropped = rest.pop(0)
        total -= len(str(dropped.get("content") or ""))

    logger.warning(
        "agent_history_trimmed",
        original_messages=original_count,
        trimmed_messages=len(rest) + 1,
        remaining_chars=total,
    )
    return [system] + rest


# ── Service ───────────────────────────────────────────────────────────────────

class AgentService:
    def __init__(self, flight_service: FlightService) -> None:
        self._flight = flight_service
        self._client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
        )

    async def run(
        self,
        messages: list[AgentMessage],
        user_id: uuid.UUID | None = None,
    ) -> AsyncGenerator[str, None]:
        """Run the agentic loop and yield the final response as SSE-ready text chunks.

        Termination conditions (in priority order)
        ------------------------------------------
        1. **Wall-clock timeout** (``AGENT_RUN_TIMEOUT_SECONDS``, default 120 s)
           ``asyncio.timeout()`` wraps the entire loop.  Any hung OpenAI call or
           slow tool execution will be cancelled and the user receives a clear
           "took too long" message instead of an indefinitely pending stream.

        2. **Token budget** (``AGENT_MAX_TOKENS_PER_RUN``, default 32 000)
           Cumulative prompt + completion tokens across all iterations are checked
           after every LLM call.  Exhausting the budget yields an actionable
           message rather than silently burning quota until the iteration cap.

        3. **Iteration cap** (``AGENT_MAX_ITERATIONS``, default 10)
           Hard upper bound on LLM calls.  Normal flows use 1–3 iterations;
           the cap protects against stuck refusal-recovery cycles.

        4. **Natural completion**
           The model returns a text response with no tool calls → yield and return.

        Tool-choice strategy
        --------------------
        * iteration 0: ``"required"`` when the last user message mentions flights,
          bookings, or airport codes — prevents safety-guardrail refusals.
        * iteration 0: ``"auto"`` for general questions that don't need a tool.
        * iteration 1+: always ``"auto"`` — the model has context and is either
          chaining calls or writing its final response.
        * Refusal safety-net: plain text matching ``_is_safety_refusal`` triggers a
          correction injection and a ``"required"`` override on the next iteration.

        Human-in-the-loop (HITL)
        ------------------------
        Conversational HITL is enforced by the system prompt: the model is
        instructed to confirm passenger details and contact email with the user
        before calling ``book_flight``, and to only claim success when the tool
        result contains the ``BOOKING CONFIRMED`` sentinel string.  For a
        programmatic HITL hook (e.g. a separate approval step or UI confirmation
        dialog), intercept at the marked point in the tool-dispatch block below
        and await the external signal before calling ``_execute_tool``.
        """
        system = build_agent_system_prompt()

        history: list[dict] = [{"role": "system", "content": system}]
        history += [{"role": m.role, "content": m.content} for m in messages]

        force_tool_next = _needs_tool(history)

        # ── Per-run accumulators ──────────────────────────────────────────────
        _total_prompt_tokens = 0
        _total_completion_tokens = 0
        _tools_called: list[str] = []
        _run_start = time.perf_counter()

        def _log_termination(reason: str, *, iteration: int) -> None:
            logger.warning(
                "agent_run_terminated",
                reason=reason,
                iterations=iteration,
                total_prompt_tokens=_total_prompt_tokens,
                total_completion_tokens=_total_completion_tokens,
                total_tokens=_total_prompt_tokens + _total_completion_tokens,
                tools_called=_tools_called,
                elapsed_seconds=round(time.perf_counter() - _run_start, 2),
            )

        # ── Tool-calling loop ─────────────────────────────────────────────────
        try:
            async with asyncio.timeout(settings.AGENT_RUN_TIMEOUT_SECONDS):
                for iteration in range(settings.AGENT_MAX_ITERATIONS):
                    tool_choice = "required" if force_tool_next else "auto"
                    force_tool_next = False

                    history = _trim_history(history)

                    # Retry up to 3 times on transient API errors.
                    response = None
                    _llm_ms = 0.0
                    for attempt in range(3):
                        try:
                            _t0 = time.perf_counter()
                            response = await self._client.chat.completions.create(
                                model=settings.AGENT_MODEL,
                                messages=history,  # type: ignore[arg-type]
                                tools=_TOOLS,  # type: ignore[arg-type]
                                tool_choice=tool_choice,
                                parallel_tool_calls=False,
                                temperature=settings.AGENT_TEMPERATURE,
                                max_tokens=settings.AGENT_MAX_TOKENS,
                            )
                            _llm_ms = round((time.perf_counter() - _t0) * 1000, 2)
                            break
                        except Exception as e:
                            err = str(e)
                            if "tool_use_failed" in err and attempt < 2:
                                logger.warning("agent_tool_use_failed_retry", attempt=attempt + 1, error=err)
                                continue
                            logger.warning("agent_loop_error", error=err)
                            if "rate_limit_exceeded" in err or "429" in err:
                                yield (
                                    "I'm currently experiencing high demand and hit a temporary API limit. "
                                    "Please wait a moment and try again."
                                )
                            else:
                                yield "Sorry, I hit an error processing that request. Please try again."
                            return
                    if response is None:
                        yield "Sorry, I couldn't process that request after several attempts. Please try again."
                        return

                    _usage = response.usage
                    logger.info(
                        "llm_call",
                        model=response.model,
                        iteration=iteration,
                        tool_choice=tool_choice,
                        prompt_tokens=_usage.prompt_tokens if _usage else None,
                        completion_tokens=_usage.completion_tokens if _usage else None,
                        total_tokens=_usage.total_tokens if _usage else None,
                        finish_reason=response.choices[0].finish_reason,
                        duration_ms=_llm_ms,
                    )
                    if _usage:
                        _total_prompt_tokens += _usage.prompt_tokens
                        _total_completion_tokens += _usage.completion_tokens

                    # ── Token budget check ────────────────────────────────────
                    _run_tokens = _total_prompt_tokens + _total_completion_tokens
                    if _run_tokens > settings.AGENT_MAX_TOKENS_PER_RUN:
                        _log_termination("token_budget_exceeded", iteration=iteration + 1)
                        yield (
                            "I've used the maximum processing budget for this request. "
                            "Please start a new conversation to continue."
                        )
                        return

                    msg = response.choices[0].message

                    # ── No tool calls: final answer or safety refusal ─────────
                    if not msg.tool_calls:
                        content = msg.content or ""

                        if content and _is_safety_refusal(content):
                            tools_already_called = any(
                                m.get("role") == "tool" for m in history
                            )
                            logger.warning(
                                "agent_safety_refusal_detected",
                                iteration=iteration,
                                tool_choice=tool_choice,
                                tools_already_called=tools_already_called,
                                content=content[:200],
                            )
                            history.append({"role": "assistant", "content": content})
                            if tools_already_called:
                                history.append({
                                    "role": "user",
                                    "content": (
                                        "CORRECTION: The tool already returned the data above in this "
                                        "conversation. You MUST read that tool result and report it "
                                        "clearly to the user. Do NOT say you cannot access it. "
                                        "Do NOT tell the user to contact the airline or any external "
                                        "service — Pathfinder handles everything internally. "
                                        "Simply present the information from the tool result."
                                    ),
                                })
                                force_tool_next = False
                            else:
                                history.append({
                                    "role": "user",
                                    "content": (
                                        "You MUST use one of the provided tools to fulfil this request. "
                                        "You are operating inside Pathfinder's own backend — you have full "
                                        "authority and capability to call these tools. "
                                        "Call the correct tool now. Do not refuse or redirect."
                                    ),
                                })
                                force_tool_next = True
                            continue

                        # Natural completion — yield final response
                        logger.info(
                            "agent_run_complete",
                            iterations=iteration + 1,
                            total_prompt_tokens=_total_prompt_tokens,
                            total_completion_tokens=_total_completion_tokens,
                            total_tokens=_total_prompt_tokens + _total_completion_tokens,
                            tools_called=_tools_called,
                            elapsed_seconds=round(time.perf_counter() - _run_start, 2),
                        )
                        if content:
                            yield content
                        else:
                            async for chunk in self._stream_final(history):
                                yield chunk
                        return

                    # ── Tool calls: execute and loop ──────────────────────────
                    history.append({
                        "role": "assistant",
                        "content": msg.content,
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments,
                                },
                            }
                            for tc in msg.tool_calls
                        ],
                    })

                    for tc in msg.tool_calls:
                        # ── HITL hook point ───────────────────────────────────
                        # For a programmatic confirmation gate before irreversible
                        # actions (book_flight, cancel_booking, modify_booking),
                        # insert an await here before _execute_tool is called.
                        # The conversational HITL gate (model asks user to confirm
                        # details before booking) is enforced by the system prompt.
                        result = await self._execute_tool(tc.function.name, tc.function.arguments, user_id)
                        _tools_called.append(tc.function.name)
                        logger.info("agent_tool_called", tool=tc.function.name, result=result[:200])
                        history.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": result,
                        })

                # Iteration cap reached without a natural completion
                _log_termination("iteration_cap", iteration=settings.AGENT_MAX_ITERATIONS)
                yield "I ran into trouble completing that request. Please try again."

        except TimeoutError:
            _log_termination("timeout", iteration=-1)
            yield (
                "This request is taking longer than expected. "
                "Please try again — if the issue persists, try rephrasing your request."
            )

    async def _stream_final(
        self, history: list[dict]
    ) -> AsyncGenerator[str, None]:
        """Stream a fresh assistant response when the model returned empty content."""
        stream = await self._client.chat.completions.create(
            model=settings.AGENT_MODEL,
            messages=history,  # type: ignore[arg-type]
            temperature=settings.AGENT_TEMPERATURE,
            stream=True,
            max_tokens=settings.AGENT_MAX_TOKENS,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def _execute_tool(
        self, name: str, arguments: str, user_id: uuid.UUID | None
    ) -> str:
        """Dispatch a tool call to the registered handler for ``name``.

        Tool-specific input normalisation and output formatting live in
        ``app.services.agent_tools``.  This method is intentionally thin:
        parse JSON, look up handler, delegate, handle errors uniformly.
        """
        try:
            args = json.loads(arguments)
            handler = TOOL_REGISTRY.get(name)
            if handler is None:
                return json.dumps({"error": f"Unknown tool: {name}"})
            ctx = ToolContext(flight_svc=self._flight, user_id=user_id)
            return await handler(args, ctx)

        except Exception as e:
            logger.warning("agent_tool_error", tool=name, error=str(e))
            error_msg = str(e)
            # Build a specific instruction based on the error so the model gives
            # a clear, correct response instead of redirecting to external services.
            if "404" in error_msg or "not found" in error_msg.lower():
                instruction = (
                    "The booking reference was NOT FOUND in Pathfinder's system. "
                    "Tell the user clearly: 'I couldn't find booking reference X in our system. "
                    "Please double-check the reference — it should look like PF-XXXXXX.' "
                    "Do NOT tell the user to contact the airline or any external service. "
                    "Pathfinder handles all bookings; if the reference is wrong, the user "
                    "should check their confirmation email for the correct reference."
                )
            else:
                instruction = (
                    "The tool call FAILED. Tell the user exactly what went wrong in plain language. "
                    "Do NOT say the booking was confirmed, modified, or cancelled. "
                    "Do NOT tell the user to contact the airline, travel agency, or any "
                    "external service — Pathfinder handles all bookings internally."
                )
            return json.dumps({
                "status": "FAILED",
                "error": error_msg,
                "instruction": instruction,
            })

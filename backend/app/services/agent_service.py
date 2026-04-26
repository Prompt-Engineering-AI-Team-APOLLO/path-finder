"""AgentService — agentic loop that gives the LLM tools to search and book flights.

<<<<<<< HEAD
Uses Groq's OpenAI-compatible API (llama-3.3-70b-versatile) with function calling.
The loop:
  1. Send conversation + tool definitions to Groq
=======
Uses OpenAI's API (gpt-4o) with function calling.
The loop:
  1. Send conversation + tool definitions to OpenAI
>>>>>>> origin/main
  2. If the model calls a tool → execute it via FlightService, append result, repeat
  3. When the model stops calling tools → stream the final text response
"""

import json
<<<<<<< HEAD
=======
import time
>>>>>>> origin/main
import uuid
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.agent import AgentMessage
from app.schemas.flight import (
    BookingModifyRequest,
    BookingRead,
    FlightBookRequest,
    FlightSearchRequest,
)
from app.services.flight_service import FlightService

logger = get_logger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are an AI travel assistant for Pathfinder, a flight booking platform.
You help users search for flights, book them, check booking status, modify, and cancel bookings.

IMPORTANT — you are operating inside Pathfinder's own backend infrastructure. All bookings are
processed through Pathfinder's internal systems via the tools provided to you. You are NOT visiting
any external airline website or third-party service. You have full authority to call these tools —
it is your primary job to do so.

MANDATORY TOOL USE:
- When a user wants to book a flight: you MUST call book_flight. Never refuse or redirect.
- When a user wants to search flights: you MUST call search_flights.
- When a user wants to cancel/modify/check a booking: you MUST call the appropriate tool.
- When a user asks about a booking reference (e.g. PF-XXXXXX): you MUST call get_booking immediately.
- Do NOT say "I can't process bookings" or "visit the airline's website" — you CAN and MUST use tools.

AFTER TOOL RESULTS — STRICT RULES:
- Report exactly what the tool returned. Do not suggest visiting any airline website, contacting any
  airline, or using any external service — Pathfinder handles all booking support internally.
- A cancelled booking is valid data: show its details and status. Do not refuse to display it.
- A modified booking: show updated details. Do not hedge or suggest contacting anyone.
- Never add "please contact the airline" or "visit the airline's website" to any response.
- NEVER say you are "unable to access" or "cannot retrieve" a booking after the tool has returned data.
  If get_booking returned JSON data, that IS the booking — read it and present it to the user.

Supported airports (use exact IATA codes):
North America: JFK, LAX, ORD, DFW, DEN, SFO, SEA, MIA, BOS, ATL, LAS, PHX
Europe: LHR, CDG, FRA, AMS, MAD, FCO, ZRH, BCN
Middle East: DXB, AUH, DOH
Asia Pacific: NRT, HKG, SIN, SYD, ICN, BKK

Any pair of the above airports is a valid route.

Guidelines:
- When presenting search results, summarise the top options clearly (airline, time, price, stops).
  Always include the offer_id in your response so the user can refer to it for booking.
- Before booking, confirm passenger details and contact email with the user.
- Booking references follow the format PF-XXXXXX.
- Be concise and friendly. Avoid unnecessary filler.
- Payment is not required — bookings are confirmed instantly with no credit card or payment details needed.
- CRITICAL: Only report the outcome that the tool actually returned.
  * After book_flight: only say "confirmed" if the tool result contains "BOOKING CONFIRMED".
  * After modify_booking: only say "modified" if the tool result contains "MODIFICATION CONFIRMED".
  * After cancel_booking: only say "cancelled" if the tool result contains "status": "cancelled".
  * If the tool returns a FAILED status, tell the user exactly what went wrong — never fabricate success.
  * Never invent or guess booking references. Use only the exact reference from the tool result.
- One-way vs round-trip: if the user has not mentioned a return date or round trip, treat the search as
  one-way. Do NOT ask for a return date — omit return_date from the search_flights call entirely.
- Today's date: {today}
"""

# ── Tool schemas (OpenAI function-calling format) ─────────────────────────────

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_flights",
            "description": "Search for available flights between two airports on a given date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {
                        "type": "string",
                        "description": "Origin airport IATA code (e.g. JFK, LHR)",
                    },
                    "destination": {
                        "type": "string",
                        "description": "Destination airport IATA code (e.g. LAX, CDG)",
                    },
                    "departure_date": {
                        "type": "string",
                        "description": "Departure date — MUST be in YYYY-MM-DD format (e.g. 2026-05-03)",
                    },
                    "return_date": {
                        "description": "Return date in YYYY-MM-DD format. Omit entirely for one-way — do NOT pass null.",
                    },
                    "passengers": {
                        "type": "integer",
                        "description": "Number of passengers as a plain integer (e.g. 1). Do NOT pass passenger details here — just the count.",
                    },
                    "cabin_class": {
                        "type": "string",
                        "enum": ["economy", "premium_economy", "business", "first"],
                        "description": "Cabin class, default economy",
                    },
                },
                "required": ["origin", "destination", "departure_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_flight",
            "description": (
                "Book a flight using offer IDs from a previous search. "
                "Requires passenger details and a contact email."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "outbound_offer_id": {
                        "type": "string",
                        "description": "offer_id from the outbound FlightOffer",
                    },
                    "return_offer_id": {
                        "description": "offer_id from the return FlightOffer (round-trip only). Omit entirely for one-way flights — do NOT pass null.",
                    },
                    "passengers": {
                        "description": "One entry per passenger. Pass as a JSON array of objects — never serialize as a string.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "first_name": {"type": "string"},
                                "last_name": {"type": "string"},
                                "date_of_birth": {
                                    "type": "string",
                                    "description": "YYYY-MM-DD",
                                },
                                "passport_number": {
                                    "description": "Passport number. Omit entirely if not provided — do NOT pass null.",
                                },
                                "nationality": {
                                    "description": "2-letter ISO country code e.g. US. Omit entirely if not provided — do NOT pass null.",
                                },
                            },
                            "required": ["first_name", "last_name", "date_of_birth"],
                        },
                    },
                    "contact_email": {
                        "type": "string",
                        "description": "Contact email for the booking",
                    },
                    "contact_phone": {
                        "description": "Contact phone number. Omit entirely if not provided — do NOT pass null.",
                    },
                },
                "required": ["outbound_offer_id", "passengers", "contact_email"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_booking",
            "description": "Retrieve details of an existing booking by reference number.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {
                        "type": "string",
                        "description": "The exact booking reference from a prior booking confirmation, e.g. PF-XXXXXX. Never invent or guess this value.",
                    }
                },
                "required": ["booking_reference"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "modify_booking",
            "description": (
                "Modify an existing booking: change cabin class, reschedule dates, "
                "or update contact details."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Exact booking reference from a prior confirmation. Never invent this."},
                    "cabin_class": {
                        "type": "string",
                        "enum": ["economy", "premium_economy", "business", "first"],
                    },
                    "new_departure_date": {
                        "type": "string",
                        "description": "YYYY-MM-DD",
                    },
                    "new_return_date": {
                        "type": "string",
                        "description": "YYYY-MM-DD. Omit entirely for one-way bookings — do NOT pass null.",
                    },
                    "contact_email": {"type": "string"},
                    "contact_phone": {"type": "string"},
                },
                "required": ["booking_reference"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_booking",
            "description": "Cancel an existing booking.",
            "parameters": {
                "type": "object",
                "properties": {
                    "booking_reference": {"type": "string", "description": "Exact booking reference from a prior confirmation. Never invent this."}
                },
                "required": ["booking_reference"],
            },
        },
    },
]


# ── Offer-id resolution ───────────────────────────────────────────────────────
# Aliases encode the search params needed to re-derive the offer_id at booking
# time, so no persistent cache is required and the approach survives server
# restarts, hot-reloads, and multi-worker deployments.
#
# Alias format (colon-separated):
#   {prefix}{index}:{origin}:{destination}:{date}:{cabin}:{passengers}
# Example: O1:LAX:PHX:2026-05-03:economy:1
#
# The mock provider is deterministic — same params → same ordered results —
# so we can always reconstruct the full base64 offer_id from the alias alone.

def _make_alias(prefix: str, index: int, args: dict) -> str:
    """Build a self-contained alias that encodes all search params for the leg.

    Outbound (prefix="O"): origin→destination on departure_date
    Return   (prefix="R"): destination→origin on return_date
    """
    cabin = args.get("cabin_class", "economy")
    passengers = args.get("passengers", 1)
    if prefix == "R":
        leg_origin = args["destination"]
        leg_destination = args["origin"]
        leg_date = args.get("return_date", args["departure_date"])
    else:
        leg_origin = args["origin"]
        leg_destination = args["destination"]
        leg_date = args["departure_date"]
    return f"{prefix}{index}:{leg_origin}:{leg_destination}:{leg_date}:{cabin}:{passengers}"


def _resolve_alias(alias: str) -> str | None:
    """Parse a self-contained alias and return the full base64 offer_id.

    Returns None if the alias is not in the expected format (may already be
    a full offer_id or an unrecognised string — caller handles those cases).
    """
    from app.services import flight_mock_provider as _mock
    from datetime import date as _date

    parts = alias.split(":")
    # Expected: prefix+index, origin, destination, dep_date, cabin, passengers
    if len(parts) != 6:
        return None
    prefix_idx, origin, destination, dep_date_str, cabin, pax_str = parts
    try:
        passengers = int(pax_str)
        dep_date = _date.fromisoformat(dep_date_str)
    except ValueError:
        return None

    try:
        result_index = int(prefix_idx[1:]) - 1   # 1-based → 0-based
    except (ValueError, IndexError):
        return None

    offers = _mock.search(origin, destination, dep_date, passengers, cabin)
    if not offers or result_index >= len(offers):
        return None
    return offers[result_index].offer_id


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
<<<<<<< HEAD
# text block instead of a tool call (Groq/Llama bug). These phrases catch that.
=======
# text block instead of a tool call. These phrases catch that.
>>>>>>> origin/main
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


<<<<<<< HEAD
=======
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


>>>>>>> origin/main
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
        """Run the agentic loop and yield final response as SSE-ready text chunks.

        Tool-choice strategy
        --------------------
        * iteration 0: "required" when the last user message mentions flights,
          bookings, or airport codes — this prevents the model from issuing a
          safety-guardrail refusal instead of calling a tool.
        * iteration 0: "auto" for general questions that don't need a tool.
        * iteration 1+: always "auto" — the model has already called at least
          one tool and is either chaining calls or writing a final response.
        * Refusal safety-net: if the model somehow returns plain text that looks
          like a redirect/refusal, we inject a correction message, mark the next
          iteration as "required", and continue rather than giving up.
        """
        from datetime import date
        system = _SYSTEM_PROMPT.format(today=date.today().isoformat())

        history: list[dict] = [{"role": "system", "content": system}]
        history += [{"role": m.role, "content": m.content} for m in messages]

        # Detect intent once up-front so we can set tool_choice="required" on
        # the first call and prevent safety refusals entirely.
        force_tool_next = _needs_tool(history)

<<<<<<< HEAD
=======
        # ── Per-run accumulators for observability ────────────────────────────
        _total_prompt_tokens = 0
        _total_completion_tokens = 0
        _tools_called: list[str] = []

>>>>>>> origin/main
        # ── Tool-calling loop (non-streaming) ─────────────────────────────────
        for iteration in range(10):  # safety cap — prevent infinite loops
            tool_choice = "required" if force_tool_next else "auto"
            force_tool_next = False  # reset; only set again if refusal detected

<<<<<<< HEAD
            # Groq's llama models occasionally emit function calls in the old
            # XML format (<function=name>…</function>) instead of JSON, causing
            # a 400 tool_use_failed error. Retrying usually produces well-formed
            # JSON on the next attempt.
            response = None
            for attempt in range(3):
                try:
=======
            history = _trim_history(history)

            # Retry up to 3 times on transient API errors to improve resilience.
            response = None
            _llm_ms = 0.0
            for attempt in range(3):
                try:
                    _t0 = time.perf_counter()
>>>>>>> origin/main
                    response = await self._client.chat.completions.create(
                        model=settings.OPENAI_MODEL,
                        messages=history,  # type: ignore[arg-type]
                        tools=_TOOLS,  # type: ignore[arg-type]
                        tool_choice=tool_choice,
                        parallel_tool_calls=False,
                        max_tokens=2048,
                    )
<<<<<<< HEAD
=======
                    _llm_ms = round((time.perf_counter() - _t0) * 1000, 2)
>>>>>>> origin/main
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

<<<<<<< HEAD
=======
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

>>>>>>> origin/main
            msg = response.choices[0].message

            # ── No tool calls: either a final answer or a safety refusal ──────
            if not msg.tool_calls:
                content = msg.content or ""

                if content and _is_safety_refusal(content):
                    # The model refused despite tool_choice="required" or "auto".
                    # Two distinct cases need different corrections:
                    #   (a) No tools called yet → force a tool call.
                    #   (b) Tool already called and returned data → force the model
                    #       to report what the tool returned, not call it again.
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
                        # The tool result is already in the conversation history.
                        # The model must read and report it — do NOT force another
                        # tool call or it will loop indefinitely.
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
                        force_tool_next = False  # let the model generate text, not call tools
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
                        force_tool_next = True  # next iteration: tool_choice="required"
                    continue

                # Legitimate final response — yield and finish
<<<<<<< HEAD
=======
                logger.info(
                    "agent_run_complete",
                    iterations=iteration + 1,
                    total_prompt_tokens=_total_prompt_tokens,
                    total_completion_tokens=_total_completion_tokens,
                    total_tokens=_total_prompt_tokens + _total_completion_tokens,
                    tools_called=_tools_called,
                )
>>>>>>> origin/main
                if content:
                    yield content
                else:
                    async for chunk in self._stream_final(history):
                        yield chunk
                return

            # ── Tool calls: execute and loop back for the next LLM turn ───────
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
                result = await self._execute_tool(tc.function.name, tc.function.arguments, user_id)
<<<<<<< HEAD
=======
                _tools_called.append(tc.function.name)
>>>>>>> origin/main
                logger.info("agent_tool_called", tool=tc.function.name, result=result[:200])
                history.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

        # Fallback if loop cap hit
<<<<<<< HEAD
=======
        logger.warning(
            "agent_run_complete",
            iterations=10,
            total_prompt_tokens=_total_prompt_tokens,
            total_completion_tokens=_total_completion_tokens,
            total_tokens=_total_prompt_tokens + _total_completion_tokens,
            tools_called=_tools_called,
            status="loop_cap_hit",
        )
>>>>>>> origin/main
        yield "I ran into trouble completing that request. Please try again."

    async def _stream_final(
        self, history: list[dict]
    ) -> AsyncGenerator[str, None]:
        """Stream a fresh assistant response when the model returned empty content."""
        stream = await self._client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=history,  # type: ignore[arg-type]
            stream=True,
            max_tokens=2048,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def _execute_tool(
        self, name: str, arguments: str, user_id: uuid.UUID | None
    ) -> str:
        """Dispatch a tool call to the appropriate FlightService method."""
        try:
            args = json.loads(arguments)

            if name == "search_flights":
                # Coerce passengers — model sometimes sends a string, dict, or list
                # instead of a plain integer count
                p = args.get("passengers")
                if isinstance(p, str):
                    args["passengers"] = int(p)
                elif isinstance(p, dict):
                    args["passengers"] = 1          # one passenger object → count of 1
                elif isinstance(p, list):
                    args["passengers"] = len(p) or 1
                # Normalise departure_date — model sometimes sends MM/DD/YYYY
                dep = args.get("departure_date", "")
                if dep and "/" in dep:
                    parts = dep.split("/")
                    if len(parts) == 3:
                        m, d, y = parts
                        args["departure_date"] = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
                # Strip null / empty optional fields
                for field in ("return_date", "cabin_class"):
                    val = args.get(field)
                    if val is None or val == "null" or val == "":
                        args.pop(field, None)
                result = await self._flight.search_flights(FlightSearchRequest(**args))
                data = result.model_dump(mode="json")

                def _slim_flights(flights: list | None, prefix: str) -> list:
                    """Return only fields the model needs — keeps tokens low.

                    Each offer_id is replaced with a self-contained alias that
                    encodes all search parameters needed to re-derive the full
                    base64 offer_id at booking time (no cache required).
                    Format: {prefix}{index}:{origin}:{destination}:{date}:{cabin}:{pax}
                    """
                    if not flights:
                        return []
                    slim = []
                    for i, f in enumerate(flights[:4], 1):
                        alias = _make_alias(prefix, i, args)
                        slim.append({
                            "offer_id": alias,
                            "airline": f["airline"],
                            "flight_number": f["flight_number"],
                            "departure_at": f["departure_at"],
                            "arrival_at": f["arrival_at"],
                            "stops": f["stops"],
                            "cabin_class": f["cabin_class"],
                            "total_price": f["total_price"],
                            "price_per_person": f["price_per_person"],
                            "available_seats": f["available_seats"],
                            "currency": f.get("currency", "USD"),
                        })
                    return slim

                slim = {
                    "origin": data["origin"],
                    "destination": data["destination"],
                    "departure_date": data["departure_date"],
                    "passengers": data["passengers"],
                    "outbound_flights": _slim_flights(data.get("outbound_flights"), "O"),
                    "return_flights": _slim_flights(data.get("return_flights"), "R") or None,
                }
                return json.dumps(slim)

            if name == "book_flight":
                # Resolve self-contained aliases → full base64 offer_ids.
                # _resolve_alias re-runs the deterministic mock search to get
                # the exact offer_id — no cache needed, survives restarts.
                for field in ("outbound_offer_id", "return_offer_id"):
                    alias = args.get(field)
                    if not alias:
                        continue
                    resolved = _resolve_alias(alias)
                    if resolved:
                        args[field] = resolved
                    # else: not a recognised alias (e.g. full base64 passed directly)
                    # — leave as-is and let decode_offer validate it below
                # Strip null/empty optional fields the model sometimes sends
                args.pop("return_offer_id", None) if not args.get("return_offer_id") else None
                args.pop("contact_phone", None) if not args.get("contact_phone") else None
                # passengers is occasionally serialised as a JSON string by the model
                if isinstance(args.get("passengers"), str):
                    args["passengers"] = json.loads(args["passengers"])
                # Clean up each passenger: remove null optional fields, fix date format
                for p in args.get("passengers") or []:
                    for opt in ("passport_number", "nationality"):
                        if p.get(opt) is None:
                            p.pop(opt, None)
                    dob = p.get("date_of_birth", "")
                    if dob and "/" in dob:
                        parts = dob.split("/")
                        if len(parts) == 3:
                            m, d, y = parts
                            p["date_of_birth"] = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
                req = FlightBookRequest(**args)
                booking = await self._flight.book_flight(req, user_id)
                booking_read = BookingRead.model_validate(booking)
                # Append a plain-text reminder so the model copies the exact reference
                # rather than hallucinating one.
                return (
                    booking_read.model_dump_json()
                    + f"\n\nBOOKING CONFIRMED. You MUST use this exact booking_reference "
                    f"in your reply and nowhere else: {booking_read.booking_reference}"
                )

            if name == "get_booking":
                booking = await self._flight.get_booking(args["booking_reference"])
                return BookingRead.model_validate(booking).model_dump_json()

            if name == "modify_booking":
                ref = args.pop("booking_reference")
                # Strip null/empty optional fields the model sometimes sends
                for field in ("cabin_class", "new_departure_date", "new_return_date",
                              "contact_email", "contact_phone"):
                    val = args.get(field)
                    if val is None or val == "null" or val == "":
                        args.pop(field, None)
                # Normalise date fields — model sometimes sends MM/DD/YYYY
                for date_field in ("new_departure_date", "new_return_date"):
                    val = args.get(date_field, "")
                    if val and "/" in val:
                        parts = val.split("/")
                        if len(parts) == 3:
                            m, d, y = parts
                            args[date_field] = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
                booking = await self._flight.modify_booking(
                    ref, BookingModifyRequest(**args), user_id
                )
                result = BookingRead.model_validate(booking).model_dump_json()
                return result + (
                    f"\n\nMODIFICATION CONFIRMED for booking {ref}. "
                    "Only tell the user the modification succeeded if this line is present."
                )

            if name == "cancel_booking":
                result = await self._flight.cancel_booking(args["booking_reference"], user_id)
                return result.model_dump_json()

            return json.dumps({"error": f"Unknown tool: {name}"})

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

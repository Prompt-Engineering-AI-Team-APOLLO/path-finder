# Pathfinder Agent Architecture

This document explains the agent design, orchestration strategy, and key decisions
for Pathfinder's AI flight-booking assistant.

---

## Router Separation: `/ai` vs `/agent`

Two routers coexist in `app/api/v1/router.py` — they serve different purposes:

| Router | Endpoint | Purpose |
|--------|----------|---------|
| `/ai`  | `POST /ai/chat`, `/ai/chat/stream`, `/ai/embed`, `/ai/search` | Raw LLM primitives. Thin pass-through to `AIService` (OpenAI wrapper). No tool use, no domain logic. Used by the general chat UI and RAG pipeline. |
| `/agent` | `POST /agent/chat` | Domain-aware agentic loop. Runs tool-calling cycles against `FlightService`. Always streams SSE. |

The split keeps generic LLM utility endpoints (embeddings, free-form chat) decoupled
from the flight-booking domain. Adding a new domain agent later (hotels, car hire)
does not require touching the `/ai` layer.

---

## Pattern: Single Stateless Agent

Pathfinder uses a **single stateless agent** for all flight-assistant interactions.

**Why single-agent (not multi-agent)?**

- The flight-booking task is a linear pipeline: search → confirm → book → manage.
  There is no benefit to specialist sub-agents — every turn uses the same five tools.
- Coordination overhead (routing messages between agents, merging partial results)
  would increase latency and complexity with no user-visible gain at MVP scope.
- A single agent with `parallel_tool_calls=False` enforces the correct ordering
  naturally without an orchestration layer.

**Why stateless?**

- Conversation history is owned and maintained by the client (frontend). Each
  `POST /agent/chat` receives the full `messages` array. The server is a pure
  function: `(history, user_id) → token stream`.
- This eliminates server-side session state: no cache invalidation, no session
  lookup on every request, and no coordination across multiple workers.
- `user_id` is the only server-side context, used to scope bookings to the
  authenticated user.

If persistence becomes a requirement (resumable conversations, audit log), add a
`ConversationRepository` and store turns after each `_execute_tool` call —
the service interface does not need to change.

---

## Agentic Loop (`AgentService.run`)

The loop in `app/services/agent_service.py` follows the standard ReAct pattern:

```
while iterations < 10:
    response = LLM(history, tools, tool_choice)
    
    if no tool calls:
        if safety_refusal(response):
            inject correction → continue   # secondary safety net
        else:
            yield response → done          # final answer
    
    for each tool_call:
        result = execute_tool(tool_call)
        append (assistant turn + tool result) to history
    
    continue  # next LLM call with updated history
```

**Iteration cap** — 10 is intentionally generous. The booking pipeline rarely needs
more than 3 iterations (search → user confirms → book). The cap prevents runaway
costs from a stuck refusal loop.

**Tool-choice strategy**

| Condition | `tool_choice` value | Reason |
|-----------|--------------------|----|
| First call, user message mentions flights/IATA codes | `"required"` | Prevents GPT-4o safety-guardrail refusals before they happen |
| First call, general question | `"auto"` | Let the model answer directly |
| Any subsequent call | `"auto"` | Model has context; forced tool call would cause infinite loop |
| Safety refusal detected, no tools called yet | `"required"` (next iter) | Recovery: force a tool call |
| Safety refusal detected, tool already called | `"auto"` (next iter) | Recovery: force a text summary of existing tool result |

---

## Tool Catalog

All tools map directly to `FlightService` methods. Schemas (OpenAI function-calling
format) are defined in `app/core/prompts.py` alongside the system prompt so both
can be reviewed and versioned together. Handlers live in `app/services/agent_tools.py`.

| Tool | Handler | Service method | When the agent calls it |
|------|---------|---------------|------------------------|
| `search_flights` | `handle_search_flights` | `FlightService.search_flights` | User asks about available flights |
| `book_flight` | `handle_book_flight` | `FlightService.book_flight` | User confirms and requests a booking |
| `get_booking` | `handle_get_booking` | `FlightService.get_booking` | User provides a `PF-XXXXXX` reference |
| `modify_booking` | `handle_modify_booking` | `FlightService.modify_booking` | User wants to change dates, cabin, or contacts |
| `cancel_booking` | `handle_cancel_booking` | `FlightService.cancel_booking` | User requests cancellation |

### Tool input / output contract

- **Input**: each handler receives `args: dict` — the parsed JSON object from the
  model's tool call. The model occasionally sends malformed values (wrong date format,
  wrong type for passenger count, `null` for optional fields it should omit).
  Normalisation helpers in `agent_tools.py` (`_coerce_date`, `_coerce_passengers_count`,
  `_strip_null_fields`) fix these before constructing Pydantic schemas.
- **Output**: each handler returns a `str` — a JSON string appended verbatim to the
  conversation history as the tool result. The model reads this to compose its reply.
  Booking/modification outputs include a sentinel string (`BOOKING CONFIRMED`,
  `MODIFICATION CONFIRMED`) that the system prompt instructs the model to verify
  before claiming success, preventing hallucinated confirmations.
- **Errors**: handlers raise exceptions normally. `AgentService._execute_tool` wraps
  all handlers in a try/except and returns a structured `{"status": "FAILED", ...}`
  JSON string so the model can report the failure in plain language.

### Adding a new tool

1. Write `async def handle_<name>(args: dict, ctx: ToolContext) -> str` in
   `app/services/agent_tools.py`.
2. Add it to `TOOL_REGISTRY` at the bottom of that file.
3. Add its schema dict to `AGENT_TOOLS` in `app/core/prompts.py`.

No other files need changing — `AgentService._execute_tool` dispatches via the
registry automatically.

**Why `parallel_tool_calls=False`?**

Booking is an ordered pipeline. Allowing parallel calls could book a flight before
the user has confirmed the search result, or cancel before retrieving details.
Sequential execution is enforced at the API level, not by prompt instruction.

---

## Offer-ID Alias System

The mock flight provider returns opaque base64 `offer_id` values. Passing these
verbatim in the context window would waste tokens and risk the model truncating them.

Instead, `_make_alias` encodes all search parameters into a short, human-readable
alias (`O1:JFK:LAX:2026-05-03:economy:1`). At booking time, `_resolve_alias`
re-runs the deterministic mock search and recovers the full `offer_id`.

This is possible because `flight_mock_provider.search` is **deterministic** —
same inputs always produce the same ordered results. No cache is needed and the
system survives server restarts and multi-worker deployments.

---

## Refusal Detection & Recovery

GPT-4o occasionally issues safety-guardrail refusals ("I can't book flights for
you") despite `tool_choice="required"` and an explicit system prompt. Two defences:

1. **Pre-emptive**: `_needs_tool(history)` detects flight intent in the last user
   message and sets `tool_choice="required"` on the first call. This prevents most
   refusals.

2. **Reactive**: `_is_safety_refusal(content)` checks the model's text against a
   narrow list of unambiguous refusal phrases. When triggered, a correction message
   is injected and the loop continues. The phrase list is deliberately narrow — see
   the `_REFUSAL_PHRASES` comment in `agent_service.py` for the false-positive risk.

---

## Termination & Control

Every agent run has three independent termination signals, checked in this order:

| Signal | Setting | Default | Trigger |
|--------|---------|---------|---------|
| Wall-clock timeout | `AGENT_RUN_TIMEOUT_SECONDS` | 120 s | `asyncio.timeout()` wraps the entire loop — fires if any `await` (LLM call or tool) exceeds the budget |
| Token budget | `AGENT_MAX_TOKENS_PER_RUN` | 32 000 | Cumulative prompt + completion tokens checked after every LLM response |
| Iteration cap | `AGENT_MAX_ITERATIONS` | 10 | Hard upper bound on LLM calls per run |

A fourth condition — **natural completion** — exits the loop when the model returns
a text response with no tool calls.

All three settings are in `app/core/config.py` under `Settings` and can be overridden
via environment variables (`AGENT_MAX_ITERATIONS`, `AGENT_RUN_TIMEOUT_SECONDS`,
`AGENT_MAX_TOKENS_PER_RUN`).

When a termination signal fires, `_log_termination(reason, iteration=...)` emits a
structured `agent_run_terminated` log event with the reason tag, iteration count,
cumulative token counts, tools called, and elapsed seconds — giving full observability
into which guard tripped and why.

### Why three signals?

Each catches a different failure mode:

- **Timeout** catches a hung OpenAI API call. Without it, an SSE stream could pend
  indefinitely — the client would wait forever with no signal. Normal flows complete
  in under 30 s; 120 s covers degraded infrastructure.
- **Token budget** catches a refusal-recovery loop that burns tokens on every
  iteration but hasn't yet hit the iteration cap. A normal search-and-book flow
  uses ~3 000–6 000 tokens; 32 000 gives 5–10× headroom before alerting.
- **Iteration cap** catches infinite loops from a broken refusal-detection circuit
  or an unexpected model behaviour. 10 iterations is generous for the longest
  legitimate flow (search → refusal-recover → confirm → book → get confirmation).

### Human-in-the-Loop (HITL)

**Conversational HITL** is the primary gate: the system prompt in `app/core/prompts.py`
instructs the model to confirm passenger details and contact email with the user
before calling `book_flight`, and to only report success when the tool result
contains the `BOOKING CONFIRMED` sentinel string. The model cannot book without
the user first approving the details in the conversation.

**Programmatic HITL hook**: for use cases requiring a non-conversational approval
step (e.g. a separate UI confirmation dialog, a manager approval queue, or a fraud
check), insert an `await` at the marked `# ── HITL hook point` comment in
`AgentService.run()` (`agent_service.py`) immediately before `_execute_tool` is
called. The hook point is reached for every tool call; filter by `tc.function.name`
to target only irreversible actions (`book_flight`, `cancel_booking`, `modify_booking`).

---

## History Management

History is trimmed when total character count exceeds `_MAX_HISTORY_CHARS` (60K ≈
15K tokens). The system message is always preserved; oldest non-system messages are
dropped first. This bounds per-request cost while keeping recent tool results and
booking context intact for multi-turn flows.

---

## Key Files

| File | Role |
|------|------|
| `app/api/v1/endpoints/agent.py` | HTTP layer: SSE streaming, rate limiting, error boundary |
| `app/services/agent_service.py` | Agentic loop, refusal recovery, history trimming, tool dispatch |
| `app/services/agent_tools.py` | Tool handlers, `TOOL_REGISTRY`, input normalisation, alias system |
| `app/services/flight_service.py` | Domain implementation: search, book, get, modify, cancel |
| `app/core/prompts.py` | System prompt + OpenAI tool schemas — all LLM-facing text lives here |
| `app/schemas/flight.py` | Typed Pydantic schemas for all tool inputs and outputs |
| `app/schemas/agent.py` | `AgentMessage`, `AgentChatRequest` — wire format between client and endpoint |
| `app/api/deps.py` | `AgentServiceDep` — wires `AgentService(FlightService(db))` |

---

## Error Handling

The `StreamingResponse` has already sent HTTP 200 before the generator yields its
first chunk, so middleware cannot intercept exceptions mid-stream. All errors are
caught inside `event_stream` in the endpoint and emitted as structured SSE events:

```
data: {"error": "..."}
data: [DONE]
```

Tool errors (e.g. booking not found) are returned as structured JSON to the agent
rather than raised as exceptions, so the model can formulate a user-friendly reply
instead of receiving a hard stop.

"""Prompt templates and tool schemas for Pathfinder's AI layer.

Design philosophy
-----------------
All LLM-facing text lives here so it can be reviewed, versioned, and tested
independently of service logic. Keeping prompts in one place also makes it
easy to compare versions and understand *why* each instruction exists.

Prompt design choices
---------------------
1. **Date injection** — today's date is formatted into the system prompt at
   runtime so the model never has to guess what "tomorrow" means. Without this,
   multi-day booking conversations drift when the context window spans midnight.

2. **Enumerated IATA codes** — rather than asking the model to infer valid
   airports, we list every supported code explicitly. This prevents the model
   from confidently generating routes to airports the mock provider doesn't
   support (e.g. MUC, YYZ) which would silently produce wrong results.

3. **Mandatory tool-use rules** — the MANDATORY TOOL USE section exists because
   GPT-4o has been observed issuing safety-guardrail refusals ("I can't book
   flights") when the phrase "book a flight" appears, even though a tool_choice
   is set. Explicit permission grants in the system prompt reduce this to near
   zero without needing to detect and retry refusals.

4. **AFTER TOOL RESULTS rules** — after tool results are injected into the
   conversation, GPT-4o sometimes ignores the JSON and writes a generic "please
   contact the airline" message. The STRICT RULES block overrides this by
   specifying exactly what to do with each tool outcome.

5. **Confirmation keywords** — "BOOKING CONFIRMED", "MODIFICATION CONFIRMED",
   "status": "cancelled" are sentinel strings injected into tool results
   (see agent_service._execute_tool). The system prompt instructs the model to
   only claim success when those exact strings are present, preventing
   hallucinated confirmations when the tool returns an error.

6. **One-way default** — unless the user explicitly mentions a return date we
   omit return_date entirely. This avoids the model guessing a round-trip and
   over-spending mock inventory.

Tool schema design choices
--------------------------
- ``parallel_tool_calls=False`` — flight booking is an ordered pipeline:
  search → confirm → book. Parallel calls can produce a booking before the
  user has confirmed details, so we force sequential execution.

- **"Omit entirely … do NOT pass null"** descriptions — the OpenAI API rejects
  null values for parameters that have no ``"type"`` field (i.e. truly optional).
  Instructing the model to omit rather than null avoids 422 validation errors
  without requiring every optional field to have a fallback coercion layer.

- **Exact description wording for offer_id** — "Never invent or guess this
  value" prevents the model from fabricating booking references when the user
  refers to a booking it has not retrieved yet.
"""

from datetime import date as _date

# ── General-purpose chat system prompt ───────────────────────────────────────
# Used by AIService.chat() / AIService.chat_stream() when no system_prompt
# is supplied by the caller. Deliberately concise — callers that need
# domain-specific behaviour pass their own system_prompt.

CHAT_SYSTEM_PROMPT: str = (
    "You are Pathfinder, a premium AI travel curator. "
    "Help users find flights, explore destinations, and plan trips. "
    "Be concise, friendly, and direct — max 2 short paragraphs per reply. "
    "When the user asks to search for flights and you know origin, destination, and date, "
    "confirm you are searching and briefly describe what you found. "
    "Never tell the user to 'use the booking feature in the app' or redirect them elsewhere."
)

# ── Agentic flight-assistant system prompt ────────────────────────────────────
# Injected as the first message in every agent conversation.
# ``{today}`` is replaced with today's ISO date at call time so the model
# always has an accurate anchor for relative date references ("next Friday",
# "in two weeks", etc.).

AGENT_SYSTEM_PROMPT: str = """You are an AI travel assistant for Pathfinder, a flight booking platform.
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


def build_agent_system_prompt() -> str:
    """Return the agent system prompt with today's date injected.

    Called once per agent run so the date is always current even in
    long-running processes.
    """
    return AGENT_SYSTEM_PROMPT.format(today=_date.today().isoformat())


# ── Tool schemas (OpenAI function-calling format) ─────────────────────────────
# Each tool maps to a FlightService method.  The schema descriptions serve
# double duty: they guide the model's argument construction AND document the
# expected contract for human readers.
#
# Key conventions in these schemas:
#   - Required fields are listed in "required" arrays — the model must always
#     supply them.
#   - Truly optional fields have NO "type" key at the top level (OpenAI will
#     reject null for a typed field). Descriptions say "Omit entirely … do NOT
#     pass null" — this single instruction eliminates the most common source of
#     422 validation errors from the model.
#   - Date fields include format examples ("YYYY-MM-DD") because the model
#     occasionally emits "MM/DD/YYYY" without guidance; the service layer still
#     normalises wrong formats but the schema is the first line of defence.
#   - booking_reference descriptions include "Never invent or guess" to prevent
#     the model from fabricating PF-XXXXXX references.

AGENT_TOOLS: list[dict] = [
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
                        # No "type" — truly optional. Absence = one-way trip.
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
                        # No "type" — truly optional. Omit for one-way.
                        "description": "offer_id from the return FlightOffer (round-trip only). Omit entirely for one-way flights — do NOT pass null.",
                    },
                    "passengers": {
                        # Array of passenger objects — no top-level "type" because
                        # some model versions serialise this differently; we coerce
                        # in the service layer.
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
                    "booking_reference": {
                        "type": "string",
                        "description": "Exact booking reference from a prior confirmation. Never invent this.",
                    },
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
                    "booking_reference": {
                        "type": "string",
                        "description": "Exact booking reference from a prior confirmation. Never invent this.",
                    }
                },
                "required": ["booking_reference"],
            },
        },
    },
]

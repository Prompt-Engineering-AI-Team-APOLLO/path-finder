"""AgentService — agentic loop that gives the LLM tools to search and book flights.

Uses Groq's OpenAI-compatible API (llama-3.3-70b-versatile) with function calling.
The loop:
  1. Send conversation + tool definitions to Groq
  2. If the model calls a tool → execute it via FlightService, append result, repeat
  3. When the model stops calling tools → stream the final text response
"""

import json
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


# ── Service ───────────────────────────────────────────────────────────────────

class AgentService:
    def __init__(self, flight_service: FlightService) -> None:
        self._flight = flight_service
        self._client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL,
        )

    async def run(
        self,
        messages: list[AgentMessage],
        user_id: uuid.UUID | None = None,
    ) -> AsyncGenerator[str, None]:
        """Run the agentic loop and yield final response as SSE-ready text chunks."""
        from datetime import date
        system = _SYSTEM_PROMPT.format(today=date.today().isoformat())

        history: list[dict] = [{"role": "system", "content": system}]
        history += [{"role": m.role, "content": m.content} for m in messages]

        # ── Tool-calling loop (non-streaming) ─────────────────────────────────
        for _ in range(10):  # safety cap — prevent infinite loops
            # Groq's llama models occasionally emit function calls in the old
            # XML format (<function=name>…</function>) instead of JSON, causing
            # a 400 tool_use_failed error. Retrying the same call usually
            # produces well-formed JSON on the next attempt.
            response = None
            for attempt in range(3):
                try:
                    response = await self._client.chat.completions.create(
                        model=settings.GROQ_MODEL,
                        messages=history,  # type: ignore[arg-type]
                        tools=_TOOLS,  # type: ignore[arg-type]
                        tool_choice="auto",
                        parallel_tool_calls=False,
                        max_tokens=2048,
                    )
                    break  # success
                except Exception as e:
                    err = str(e)
                    if "tool_use_failed" in err and attempt < 2:
                        logger.warning("agent_tool_use_failed_retry", attempt=attempt + 1, error=err)
                        continue
                    logger.warning("agent_loop_error", error=err)
                    yield f"Sorry, I hit an error processing that request. Please try again."
                    return
            if response is None:
                yield "Sorry, I couldn't process that request after several attempts. Please try again."
                return
            msg = response.choices[0].message

            if not msg.tool_calls:
                # No more tool calls — stream the final text response
                async for chunk in self._stream_final(history, msg.content or ""):
                    yield chunk
                return

            # Append assistant turn with tool calls
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

            # Execute each tool and append results
            for tc in msg.tool_calls:
                result = await self._execute_tool(tc.function.name, tc.function.arguments, user_id)
                logger.info("agent_tool_called", tool=tc.function.name, result=result)
                history.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

        # Fallback if loop cap hit
        yield "I ran into trouble completing that request. Please try again."

    async def _stream_final(
        self, history: list[dict], fallback_content: str
    ) -> AsyncGenerator[str, None]:
        """Stream the final assistant response."""
        stream = await self._client.chat.completions.create(
            model=settings.GROQ_MODEL,
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
            return json.dumps({
                "status": "FAILED",
                "error": str(e),
                "instruction": (
                    "The tool call FAILED. You MUST tell the user exactly what went wrong. "
                    "Do NOT say the booking was confirmed, modified, or cancelled. "
                    "Do NOT invent a booking reference or report a success that did not happen."
                ),
            })

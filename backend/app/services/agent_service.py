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
                        "description": "Departure date in YYYY-MM-DD format",
                    },
                    "return_date": {
                        "type": "string",
                        "description": "Return date in YYYY-MM-DD (omit for one-way)",
                    },
                    "passengers": {
                        "type": "integer",
                        "description": "Number of passengers (1–9), default 1",
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
                        "type": "string",
                        "description": "offer_id from the return FlightOffer (round-trip only)",
                    },
                    "passengers": {
                        "type": "array",
                        "description": "One entry per passenger",
                        "items": {
                            "type": "object",
                            "properties": {
                                "first_name": {"type": "string"},
                                "last_name": {"type": "string"},
                                "date_of_birth": {
                                    "type": "string",
                                    "description": "YYYY-MM-DD",
                                },
                                "passport_number": {"type": "string"},
                                "nationality": {
                                    "type": "string",
                                    "description": "2-letter ISO country code e.g. US",
                                },
                            },
                            "required": ["first_name", "last_name", "date_of_birth"],
                        },
                    },
                    "contact_email": {
                        "type": "string",
                        "description": "Contact email for the booking",
                    },
                    "contact_phone": {"type": "string"},
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
                        "description": "Booking reference e.g. PF-A1B2C3",
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
                    "booking_reference": {"type": "string"},
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
                        "description": "YYYY-MM-DD (round-trip only)",
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
                    "booking_reference": {"type": "string"}
                },
                "required": ["booking_reference"],
            },
        },
    },
]


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
            response = await self._client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=history,  # type: ignore[arg-type]
                tools=_TOOLS,  # type: ignore[arg-type]
                tool_choice="auto",
                parallel_tool_calls=False,
                max_tokens=2048,
            )
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
                logger.info("agent_tool_called", tool=tc.function.name, result_len=len(result))
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
                result = await self._flight.search_flights(FlightSearchRequest(**args))
                return result.model_dump_json()

            if name == "book_flight":
                req = FlightBookRequest(**args)
                booking = await self._flight.book_flight(req, user_id)
                return BookingRead.model_validate(booking).model_dump_json()

            if name == "get_booking":
                booking = await self._flight.get_booking(args["booking_reference"])
                return BookingRead.model_validate(booking).model_dump_json()

            if name == "modify_booking":
                ref = args.pop("booking_reference")
                booking = await self._flight.modify_booking(
                    ref, BookingModifyRequest(**args), user_id
                )
                return BookingRead.model_validate(booking).model_dump_json()

            if name == "cancel_booking":
                result = await self._flight.cancel_booking(args["booking_reference"], user_id)
                return result.model_dump_json()

            return json.dumps({"error": f"Unknown tool: {name}"})

        except Exception as e:
            logger.warning("agent_tool_error", tool=name, error=str(e))
            return json.dumps({"error": str(e)})

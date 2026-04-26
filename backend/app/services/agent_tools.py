"""Handlers for each agent tool.

Each handler normalises raw args from the LLM, calls FlightService, and returns
a JSON string appended to the conversation as a tool result.

Adding a new tool
-----------------
1. Write a new ``handle_<tool_name>`` async function in this file.
2. Register it in ``TOOL_REGISTRY`` at the bottom of this file.
3. Add its schema dict to ``AGENT_TOOLS`` in ``app/core/prompts.py``.
No other files need changing.

Input / output contract
-----------------------
- Input:  ``args: dict`` — the parsed JSON object the model sends for a tool call.
          These may contain malformed values (wrong date format, wrong types) that
          the normalisation helpers below fix before constructing Pydantic schemas.
- Output: ``str`` — a JSON string appended verbatim to the conversation history as
          the tool result.  The model reads this string to compose its reply.
- Errors: handlers raise exceptions normally; ``AgentService._execute_tool`` wraps
          all handlers in a try/except and returns a structured FAILED JSON string
          so the model can report the failure rather than silently stopping.
"""

import json
import uuid
from collections.abc import Callable, Coroutine
from dataclasses import dataclass
from datetime import date as _date
from typing import Any

from app.core.logging import get_logger
from app.schemas.flight import (
    BookingModifyRequest,
    BookingRead,
    FlightBookRequest,
    FlightSearchRequest,
)
from app.services.flight_service import FlightService

logger = get_logger(__name__)


# ── Tool execution context ────────────────────────────────────────────────────


@dataclass
class ToolContext:
    """Dependencies injected into every tool handler per agent run."""

    flight_svc: FlightService
    user_id: uuid.UUID | None


# ── Input normalisation helpers ───────────────────────────────────────────────
# The LLM occasionally sends malformed values (wrong date format, wrong type
# for numeric fields, null for optional fields it should omit).  These helpers
# normalise args before constructing Pydantic schemas so validation errors
# surface as clean 422s rather than cryptic internal failures.


def _coerce_date(value: str) -> str:
    """Normalise MM/DD/YYYY → YYYY-MM-DD.  No-op if already correct or empty."""
    if value and "/" in value:
        parts = value.split("/")
        if len(parts) == 3:
            m, d, y = parts
            return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    return value


def _coerce_passengers_count(value: Any) -> int:
    """Coerce the model's various representations of passenger count to int.

    The model sometimes sends a string ("2"), a dict (one passenger object),
    or a list (multiple passenger objects) instead of a plain integer.
    """
    if isinstance(value, str):
        return int(value)
    if isinstance(value, dict):
        return 1          # one passenger object → count of 1
    if isinstance(value, list):
        return len(value) or 1
    return value or 1


def _strip_null_fields(args: dict, fields: tuple[str, ...]) -> None:
    """Remove fields whose value is None, "null", or "" (in-place)."""
    for field in fields:
        val = args.get(field)
        if val is None or val == "null" or val == "":
            args.pop(field, None)


# ── Offer-ID alias system ─────────────────────────────────────────────────────
# Aliases encode all search params needed to re-derive an offer_id at booking
# time, so no persistent cache is required and the system survives restarts.
# The mock provider is deterministic: same inputs → same ordered results →
# same offer_ids.
#
# Alias format: {prefix}{index}:{origin}:{destination}:{date}:{cabin}:{pax}
# Example:      O1:JFK:LAX:2026-05-03:economy:1


def make_alias(prefix: str, index: int, args: dict) -> str:
    """Build a self-contained alias encoding all search params for one leg.

    ``prefix="O"`` for outbound, ``prefix="R"`` for return.
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


def resolve_alias(alias: str) -> str | None:
    """Parse a self-contained alias and return the full base64 offer_id.

    Returns ``None`` if the alias is not in the expected format (it may already
    be a full base64 offer_id or an unrecognised string — the caller handles
    those cases by leaving the value unchanged).
    """
    from app.services import flight_mock_provider as _mock

    parts = alias.split(":")
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


# ── Tool handlers ─────────────────────────────────────────────────────────────


async def handle_search_flights(args: dict, ctx: ToolContext) -> str:
    """Search for available flights and return slim offer data.

    Offer IDs in the response are replaced with self-contained aliases (see
    ``make_alias``) to keep token usage low while preserving bookability.
    """
    args["passengers"] = _coerce_passengers_count(args.get("passengers"))
    dep = args.get("departure_date", "")
    if dep:
        args["departure_date"] = _coerce_date(dep)
    _strip_null_fields(args, ("return_date", "cabin_class"))

    result = await ctx.flight_svc.search_flights(FlightSearchRequest(**args))
    data = result.model_dump(mode="json")

    def _slim(flights: list | None, prefix: str) -> list:
        if not flights:
            return []
        out = []
        for i, f in enumerate(flights[:4], 1):
            out.append({
                "offer_id": make_alias(prefix, i, args),
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
        return out

    return json.dumps({
        "origin": data["origin"],
        "destination": data["destination"],
        "departure_date": data["departure_date"],
        "passengers": data["passengers"],
        "outbound_flights": _slim(data.get("outbound_flights"), "O"),
        "return_flights": _slim(data.get("return_flights"), "R") or None,
    })


async def handle_book_flight(args: dict, ctx: ToolContext) -> str:
    """Book a flight using offer IDs from a previous search."""
    # Resolve self-contained aliases → full base64 offer_ids
    for field in ("outbound_offer_id", "return_offer_id"):
        alias = args.get(field)
        if alias:
            resolved = resolve_alias(alias)
            if resolved:
                args[field] = resolved

    _strip_null_fields(args, ("return_offer_id", "contact_phone"))

    # Passengers is occasionally serialised as a JSON string by the model
    if isinstance(args.get("passengers"), str):
        args["passengers"] = json.loads(args["passengers"])

    # Normalise each passenger: remove null optionals, fix date format
    for p in args.get("passengers") or []:
        for opt in ("passport_number", "nationality"):
            if p.get(opt) is None:
                p.pop(opt, None)
        dob = p.get("date_of_birth", "")
        if dob:
            p["date_of_birth"] = _coerce_date(dob)

    booking = await ctx.flight_svc.book_flight(FlightBookRequest(**args), ctx.user_id)
    booking_read = BookingRead.model_validate(booking)
    # Sentinel string checked by the system prompt: model only claims "BOOKING CONFIRMED"
    # when this exact string is present, preventing hallucinated confirmations.
    return (
        booking_read.model_dump_json()
        + f"\n\nBOOKING CONFIRMED. You MUST use this exact booking_reference "
        f"in your reply and nowhere else: {booking_read.booking_reference}"
    )


async def handle_get_booking(args: dict, ctx: ToolContext) -> str:
    """Retrieve an existing booking by reference number."""
    booking = await ctx.flight_svc.get_booking(args["booking_reference"])
    return BookingRead.model_validate(booking).model_dump_json()


async def handle_modify_booking(args: dict, ctx: ToolContext) -> str:
    """Modify an existing booking (dates, cabin class, or contact details)."""
    ref = args.pop("booking_reference")
    _strip_null_fields(args, (
        "cabin_class", "new_departure_date", "new_return_date",
        "contact_email", "contact_phone",
    ))
    for date_field in ("new_departure_date", "new_return_date"):
        val = args.get(date_field, "")
        if val:
            args[date_field] = _coerce_date(val)

    booking = await ctx.flight_svc.modify_booking(ref, BookingModifyRequest(**args), ctx.user_id)
    result = BookingRead.model_validate(booking).model_dump_json()
    # Sentinel string checked by the system prompt (same pattern as BOOKING CONFIRMED).
    return result + (
        f"\n\nMODIFICATION CONFIRMED for booking {ref}. "
        "Only tell the user the modification succeeded if this line is present."
    )


async def handle_cancel_booking(args: dict, ctx: ToolContext) -> str:
    """Cancel an existing booking."""
    result = await ctx.flight_svc.cancel_booking(args["booking_reference"], ctx.user_id)
    return result.model_dump_json()


# ── Tool registry ─────────────────────────────────────────────────────────────
# Maps OpenAI function tool names to their handler functions.
# ``AgentService._execute_tool`` looks up handlers here — it knows nothing about
# individual tool logic.  Adding a new tool only requires a new handler above
# and a new entry below (plus a schema dict in app/core/prompts.py).

ToolHandler = Callable[[dict, ToolContext], Coroutine[Any, Any, str]]

TOOL_REGISTRY: dict[str, ToolHandler] = {
    "search_flights": handle_search_flights,
    "book_flight":    handle_book_flight,
    "get_booking":    handle_get_booking,
    "modify_booking": handle_modify_booking,
    "cancel_booking": handle_cancel_booking,
}

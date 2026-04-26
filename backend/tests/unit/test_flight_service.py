"""Unit tests for FlightService — uses in-memory SQLite (same as conftest)."""

import uuid
from datetime import date, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.flight import (
    BookingModifyRequest,
    FlightBookRequest,
    FlightSearchRequest,
    PassengerInfo,
)
from app.services.flight_mock_provider import search as mock_search
from app.services.flight_service import FlightService

# ── helpers ───────────────────────────────────────────────────────────────────

_FUTURE = date.today() + timedelta(days=30)
_USER_ID = uuid.uuid4()

_PASSENGER = PassengerInfo(
    first_name="Jane",
    last_name="Doe",
    date_of_birth=date(1990, 7, 4),
    passport_number="A12345678",
    nationality="US",
)


def _offer_id(origin: str, destination: str, dep_date: date, cabin: str = "economy") -> str:
    offers = mock_search(origin, destination, dep_date, 1, cabin)  # type: ignore[arg-type]
    assert offers, f"No mock offers for {origin}->{destination}"
    return offers[0].offer_id


@pytest_asyncio.fixture
async def svc(db_session: AsyncSession) -> FlightService:
    return FlightService(db_session)


# ── search_flights ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_valid_route(svc: FlightService):
    req = FlightSearchRequest(
        origin="JFK", destination="LAX",
        departure_date=_FUTURE, passengers=1, cabin_class="economy",
    )
    result = await svc.search_flights(req)
    assert result.origin == "JFK"
    assert result.destination == "LAX"
    assert len(result.outbound_flights) >= 4
    assert result.return_flights is None


@pytest.mark.asyncio
async def test_search_round_trip(svc: FlightService):
    req = FlightSearchRequest(
        origin="JFK", destination="LAX",
        departure_date=_FUTURE,
        return_date=_FUTURE + timedelta(days=7),
        passengers=2, cabin_class="economy",
    )
    result = await svc.search_flights(req)
    assert result.return_flights is not None
    assert len(result.return_flights) >= 4


@pytest.mark.asyncio
async def test_search_unsupported_route_raises_404(svc: FlightService):
    from fastapi import HTTPException

    req = FlightSearchRequest(
        origin="JFK", destination="XYZ",
        departure_date=_FUTURE, passengers=1, cabin_class="economy",
    )
    with pytest.raises(HTTPException) as exc_info:
        await svc.search_flights(req)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_search_past_date_raises_422(svc: FlightService):
    from fastapi import HTTPException

    req = FlightSearchRequest(
        origin="JFK", destination="LAX",
        departure_date=date.today() - timedelta(days=1),
        passengers=1, cabin_class="economy",
    )
    with pytest.raises(HTTPException) as exc_info:
        await svc.search_flights(req)
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_search_same_origin_destination_raises_422(svc: FlightService):
    from fastapi import HTTPException

    req = FlightSearchRequest(
        origin="JFK", destination="JFK",
        departure_date=_FUTURE, passengers=1, cabin_class="economy",
    )
    with pytest.raises(HTTPException) as exc_info:
        await svc.search_flights(req)
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_search_return_before_departure_raises_422(svc: FlightService):
    from fastapi import HTTPException

    req = FlightSearchRequest(
        origin="JFK", destination="LAX",
        departure_date=_FUTURE,
        return_date=_FUTURE - timedelta(days=1),
        passengers=1, cabin_class="economy",
    )
    with pytest.raises(HTTPException) as exc_info:
        await svc.search_flights(req)
    assert exc_info.value.status_code == 422


# ── book_flight ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_book_flight_one_way(svc: FlightService):
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=_USER_ID)
    assert booking.booking_reference.startswith("PF-")
    assert booking.status == "confirmed"
    assert booking.outbound_origin == "JFK"
    assert booking.outbound_destination == "LAX"
    assert booking.return_flight_number is None
    assert booking.passenger_count == 1
    assert booking.contact_email == "jane@example.com"
    assert booking.user_id == _USER_ID


@pytest.mark.asyncio
async def test_book_flight_round_trip(svc: FlightService):
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        return_offer_id=_offer_id("LAX", "JFK", _FUTURE + timedelta(days=7)),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=_USER_ID)
    assert booking.return_flight_number is not None
    assert booking.return_origin == "LAX"
    assert booking.return_destination == "JFK"
    assert booking.total_price > 0


@pytest.mark.asyncio
async def test_book_invalid_offer_id_raises_400(svc: FlightService):
    from fastapi import HTTPException

    req = FlightBookRequest(
        outbound_offer_id="invalid-not-base64",
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    with pytest.raises(HTTPException) as exc_info:
        await svc.book_flight(req, user_id=_USER_ID)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_book_without_user_id(svc: FlightService):
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("LHR", "CDG", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="guest@example.com",
    )
    booking = await svc.book_flight(req, user_id=None)
    assert booking.user_id is None
    assert booking.status == "confirmed"


# ── get_booking ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_booking_found(svc: FlightService):
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    created = await svc.book_flight(req, user_id=_USER_ID)
    fetched = await svc.get_booking(created.booking_reference)
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_get_booking_not_found_raises_404(svc: FlightService):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await svc.get_booking("PF-ZZZZZZ")
    assert exc_info.value.status_code == 404


# ── list_my_bookings ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_my_bookings(svc: FlightService):
    uid = uuid.uuid4()
    for route in [("JFK", "LAX"), ("LHR", "CDG")]:
        req = FlightBookRequest(
            outbound_offer_id=_offer_id(*route, _FUTURE),
            passengers=[_PASSENGER],
            contact_email="me@example.com",
        )
        await svc.book_flight(req, user_id=uid)

    bookings = await svc.list_my_bookings(uid)
    assert len(bookings) == 2


@pytest.mark.asyncio
async def test_list_my_bookings_empty_for_new_user(svc: FlightService):
    bookings = await svc.list_my_bookings(uuid.uuid4())
    assert bookings == []


# ── modify_booking ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_modify_cabin_class_recalculates_price(svc: FlightService):
    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE, "economy"),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)
    original_price = booking.total_price

    from app.services.flight_mock_provider import CABIN_MULTIPLIERS

    modified = await svc.modify_booking(
        booking.booking_reference,
        BookingModifyRequest(cabin_class="business"),
        uid,
    )
    expected = round(original_price * CABIN_MULTIPLIERS["business"] / CABIN_MULTIPLIERS["economy"], 2)
    assert modified.cabin_class == "business"
    assert abs(modified.total_price - expected) < 0.01
    assert modified.status == "modified"


@pytest.mark.asyncio
async def test_modify_contact_details(svc: FlightService):
    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="old@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)
    modified = await svc.modify_booking(
        booking.booking_reference,
        BookingModifyRequest(contact_email="new@example.com", contact_phone="+1-555-9999"),
        uid,
    )
    assert modified.contact_email == "new@example.com"
    assert modified.contact_phone == "+1-555-9999"


@pytest.mark.asyncio
async def test_modify_wrong_owner_raises_403(svc: FlightService):
    from fastapi import HTTPException

    owner = uuid.uuid4()
    intruder = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="owner@example.com",
    )
    booking = await svc.book_flight(req, user_id=owner)
    with pytest.raises(HTTPException) as exc_info:
        await svc.modify_booking(
            booking.booking_reference,
            BookingModifyRequest(contact_phone="+1-555-0000"),
            intruder,
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_modify_no_changes_raises_422(svc: FlightService):
    from fastapi import HTTPException

    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)
    with pytest.raises(HTTPException) as exc_info:
        await svc.modify_booking(booking.booking_reference, BookingModifyRequest(), uid)
    assert exc_info.value.status_code == 422


# ── modify_booking: date changes ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_modify_departure_date_updates_flight_and_price(svc: FlightService):
    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)
    original_dep = booking.outbound_departure_at
    original_price = booking.total_price
    new_date = _FUTURE + timedelta(days=14)

    modified = await svc.modify_booking(
        booking.booking_reference,
        BookingModifyRequest(new_departure_date=new_date),
        uid,
    )

    assert modified.status == "modified"
    # Flight date must change
    assert modified.outbound_departure_at.date() == new_date
    # Departure time may differ from original (different seed → different slot)
    assert modified.outbound_departure_at != original_dep or modified.total_price != original_price
    # Price must be a positive number
    assert modified.total_price > 0


@pytest.mark.asyncio
async def test_modify_departure_date_and_cabin_class_together(svc: FlightService):
    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE, "economy"),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)
    original_price = booking.total_price
    new_date = _FUTURE + timedelta(days=10)

    modified = await svc.modify_booking(
        booking.booking_reference,
        BookingModifyRequest(new_departure_date=new_date, cabin_class="business"),
        uid,
    )

    assert modified.cabin_class == "business"
    assert modified.outbound_departure_at.date() == new_date
    assert modified.total_price > original_price  # business > economy


@pytest.mark.asyncio
async def test_modify_return_date_on_round_trip(svc: FlightService):
    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        return_offer_id=_offer_id("LAX", "JFK", _FUTURE + timedelta(days=7)),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)
    new_return = _FUTURE + timedelta(days=14)

    modified = await svc.modify_booking(
        booking.booking_reference,
        BookingModifyRequest(new_return_date=new_return),
        uid,
    )

    assert modified.return_departure_at is not None
    assert modified.return_departure_at.date() == new_return
    assert modified.total_price > 0


@pytest.mark.asyncio
async def test_modify_return_date_on_one_way_raises_422(svc: FlightService):
    from fastapi import HTTPException

    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)

    with pytest.raises(HTTPException) as exc_info:
        await svc.modify_booking(
            booking.booking_reference,
            BookingModifyRequest(new_return_date=_FUTURE + timedelta(days=7)),
            uid,
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_modify_past_departure_date_raises_422(svc: FlightService):
    from fastapi import HTTPException

    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)

    with pytest.raises(HTTPException) as exc_info:
        await svc.modify_booking(
            booking.booking_reference,
            BookingModifyRequest(new_departure_date=date.today() - timedelta(days=1)),
            uid,
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_modify_return_before_departure_raises_422(svc: FlightService):
    from fastapi import HTTPException

    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        return_offer_id=_offer_id("LAX", "JFK", _FUTURE + timedelta(days=7)),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)

    with pytest.raises(HTTPException) as exc_info:
        await svc.modify_booking(
            booking.booking_reference,
            BookingModifyRequest(
                new_departure_date=_FUTURE + timedelta(days=10),
                new_return_date=_FUTURE + timedelta(days=5),  # before new departure
            ),
            uid,
        )
    assert exc_info.value.status_code == 422


# ── cancel_booking ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_cancel_booking(svc: FlightService):
    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)
    result = await svc.cancel_booking(booking.booking_reference, uid)
    assert result.status == "cancelled"

    # Verify persisted status
    fetched = await svc.get_booking(booking.booking_reference)
    assert fetched.status == "cancelled"


@pytest.mark.asyncio
async def test_cancel_already_cancelled_raises_409(svc: FlightService):
    from fastapi import HTTPException

    uid = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="jane@example.com",
    )
    booking = await svc.book_flight(req, user_id=uid)
    await svc.cancel_booking(booking.booking_reference, uid)
    with pytest.raises(HTTPException) as exc_info:
        await svc.cancel_booking(booking.booking_reference, uid)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_cancel_wrong_owner_raises_403(svc: FlightService):
    from fastapi import HTTPException

    owner = uuid.uuid4()
    intruder = uuid.uuid4()
    req = FlightBookRequest(
        outbound_offer_id=_offer_id("JFK", "LAX", _FUTURE),
        passengers=[_PASSENGER],
        contact_email="owner@example.com",
    )
    booking = await svc.book_flight(req, user_id=owner)
    with pytest.raises(HTTPException) as exc_info:
        await svc.cancel_booking(booking.booking_reference, intruder)
    assert exc_info.value.status_code == 403

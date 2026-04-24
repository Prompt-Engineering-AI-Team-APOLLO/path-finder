"""Flight endpoints.

Routes
------
POST   /api/v1/flights/search                → search available flights (public)
GET    /api/v1/flights/routes                → list supported routes   (public)
POST   /api/v1/flights/bookings              → book a flight           (auth required)
GET    /api/v1/flights/bookings              → list my bookings        (auth required)
GET    /api/v1/flights/bookings/{ref}        → look up any booking     (public)
PATCH  /api/v1/flights/bookings/{ref}        → modify a booking        (auth required)
DELETE /api/v1/flights/bookings/{ref}        → cancel a booking        (auth required)
"""

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, FlightServiceDep, OptionalUser
from app.schemas.flight import (
    BookingCancelResponse,
    BookingModifyRequest,
    BookingRead,
    FlightBookRequest,
    FlightSearchRequest,
    FlightSearchResponse,
)
from app.services.flight_mock_provider import list_supported_routes

router = APIRouter(prefix="/flights", tags=["flights"])


# ── Search ────────────────────────────────────────────────────────────────────


@router.post(
    "/search",
    response_model=FlightSearchResponse,
    summary="Search available flights",
    description=(
        "Search for available flights between two airports on a given date. "
        "Returns a list of `FlightOffer` objects each containing an `offer_id` "
        "that you pass to `POST /bookings` to complete the booking.\n\n"
        "**Supported routes:** call `GET /flights/routes` to see available city pairs.\n\n"
        "**Mock data:** flight times, prices, and seat availability are deterministically "
        "generated from the search parameters — the same query always returns the same offers."
    ),
)
async def search_flights(
    req: FlightSearchRequest,
    svc: FlightServiceDep,
) -> FlightSearchResponse:
    return await svc.search_flights(req)


@router.get(
    "/routes",
    summary="List supported routes",
    description="Returns all origin–destination pairs the mock provider supports.",
)
async def list_routes() -> list[dict]:
    return list_supported_routes()


# ── Bookings ──────────────────────────────────────────────────────────────────


@router.post(
    "/bookings",
    response_model=BookingRead,
    status_code=status.HTTP_201_CREATED,
    summary="Book a flight",
    description=(
        "Confirm a booking using the `offer_id` values returned by `POST /search`.\n\n"
        "- Supply one `PassengerInfo` object per passenger.\n"
        "- For a round-trip, provide both `outbound_offer_id` and `return_offer_id`.\n"
        "- Returns a `BookingRead` with a unique `booking_reference` (e.g. `PF-A1B2C3`)."
    ),
)
async def book_flight(
    req: FlightBookRequest,
    svc: FlightServiceDep,
    user: OptionalUser,
) -> BookingRead:
    booking = await svc.book_flight(req, user.id if user else None)
    return BookingRead.model_validate(booking)


@router.get(
    "/bookings",
    response_model=list[BookingRead],
    summary="List my bookings",
    description="Returns all bookings (confirmed, modified, and cancelled) for the authenticated user.",
)
async def list_my_bookings(
    svc: FlightServiceDep,
    user: CurrentUser,
) -> list[BookingRead]:
    bookings = await svc.list_my_bookings(user.id)
    return [BookingRead.model_validate(b) for b in bookings]


@router.get(
    "/bookings/{booking_reference}",
    response_model=BookingRead,
    summary="Look up a booking",
    description=(
        "Retrieve full booking details by reference number (e.g. `PF-A1B2C3`). "
        "Authentication required."
    ),
)
async def get_booking(
    booking_reference: str,
    svc: FlightServiceDep,
    _: CurrentUser,
) -> BookingRead:
    booking = await svc.get_booking(booking_reference)
    return BookingRead.model_validate(booking)


@router.patch(
    "/bookings/{booking_reference}",
    response_model=BookingRead,
    summary="Modify a booking",
    description=(
        "Update cabin class and/or contact details on an active booking.\n\n"
        "- Changing **cabin class** recalculates the total price proportionally.\n"
        "- To change flights entirely, cancel and rebook.\n"
        "- Only the booking owner can modify."
    ),
)
async def modify_booking(
    booking_reference: str,
    req: BookingModifyRequest,
    svc: FlightServiceDep,
    user: CurrentUser,
) -> BookingRead:
    booking = await svc.modify_booking(booking_reference, req, user.id)
    return BookingRead.model_validate(booking)


@router.delete(
    "/bookings/{booking_reference}",
    response_model=BookingCancelResponse,
    summary="Cancel a booking",
    description=(
        "Cancel an active booking. The booking record is retained with status `cancelled`. "
        "Only the booking owner can cancel."
    ),
)
async def cancel_booking(
    booking_reference: str,
    svc: FlightServiceDep,
    user: CurrentUser,
) -> BookingCancelResponse:
    return await svc.cancel_booking(booking_reference, user.id)

"""FlightService — business logic for the flights feature.

Responsibilities
----------------
- Delegate flight searches to FlightMockProvider (swap for real API if needed)
- Persist, retrieve, modify, and cancel FlightBooking records
- Enforce ownership rules (only the booking owner can modify/cancel)
"""

import secrets
import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flight import FlightBooking
from app.repositories.booking import BookingRepository
from app.schemas.flight import (
    BookingCancelResponse,
    BookingModifyRequest,
    BookingRead,
    CabinClass,
    FlightBookRequest,
    FlightSearchRequest,
    FlightSearchResponse,
)
from app.core.logging import get_logger
from app.services import flight_mock_provider as mock
from app.services.email_service import EmailService

logger = get_logger(__name__)
_email = EmailService()


class FlightService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = BookingRepository(session)

    # ── Search ────────────────────────────────────────────────────────────────

    async def search_flights(self, req: FlightSearchRequest) -> FlightSearchResponse:
        """Search for available flights.  No DB interaction — uses mock provider."""
        if req.departure_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="departure_date must be today or in the future",
            )
        if req.return_date and req.return_date <= req.departure_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="return_date must be after departure_date",
            )
        if req.origin == req.destination:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="origin and destination must be different",
            )

        outbound = mock.search(
            req.origin, req.destination, req.departure_date,
            req.passengers, req.cabin_class,
        )
        if not outbound:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No flights available from {req.origin} to {req.destination}. "
                    "Check GET /api/v1/flights/routes for supported routes."
                ),
            )

        return_flights = None
        if req.return_date:
            return_flights = mock.search(
                req.destination, req.origin, req.return_date,
                req.passengers, req.cabin_class,
            )

        search_id = secrets.token_hex(8)
        logger.info(
            "flight_search",
            origin=req.origin,
            destination=req.destination,
            departure_date=str(req.departure_date),
            return_date=str(req.return_date) if req.return_date else None,
            passengers=req.passengers,
            cabin_class=req.cabin_class,
            outbound_count=len(outbound),
            return_count=len(return_flights) if return_flights else 0,
            search_id=search_id,
        )
        return FlightSearchResponse(
            search_id=search_id,
            origin=req.origin,
            destination=req.destination,
            departure_date=req.departure_date,
            return_date=req.return_date,
            passengers=req.passengers,
            cabin_class=req.cabin_class,
            currency="USD",
            outbound_flights=outbound,
            return_flights=return_flights,
        )

    # ── Book ──────────────────────────────────────────────────────────────────

    async def book_flight(
        self,
        req: FlightBookRequest,
        user_id: uuid.UUID | None = None,
    ) -> FlightBooking:
        """Create a FlightBooking from an offer.  offer_id encodes all flight data."""
        try:
            out = mock.decode_offer(req.outbound_offer_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid outbound_offer_id",
            )

        ret: dict | None = None
        if req.return_offer_id:
            try:
                ret = mock.decode_offer(req.return_offer_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid return_offer_id",
                )

        if len(req.passengers) != out.get("total_price", 0) / out.get("price_per_person", 1) \
                and len(req.passengers) > out.get("available_seats", 0):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Not enough seats available for the requested passenger count",
            )

        ref = await self._generate_reference()

        booking = FlightBooking(
            booking_reference=ref,
            status="confirmed",
            user_id=user_id,
            # Outbound
            outbound_flight_number=out["flight_number"],
            outbound_airline=out["airline"],
            outbound_airline_code=out["airline_code"],
            outbound_origin=out["origin"],
            outbound_destination=out["destination"],
            outbound_origin_city=out["origin_city"],
            outbound_destination_city=out["destination_city"],
            outbound_departure_at=datetime.fromisoformat(out["departure_at"]),
            outbound_arrival_at=datetime.fromisoformat(out["arrival_at"]),
            outbound_duration_minutes=out["duration_minutes"],
            outbound_stops=out["stops"],
            # Return
            return_flight_number=ret["flight_number"] if ret else None,
            return_airline=ret["airline"] if ret else None,
            return_airline_code=ret["airline_code"] if ret else None,
            return_origin=ret["origin"] if ret else None,
            return_destination=ret["destination"] if ret else None,
            return_origin_city=ret["origin_city"] if ret else None,
            return_destination_city=ret["destination_city"] if ret else None,
            return_departure_at=datetime.fromisoformat(ret["departure_at"]) if ret else None,
            return_arrival_at=datetime.fromisoformat(ret["arrival_at"]) if ret else None,
            return_duration_minutes=ret["duration_minutes"] if ret else None,
            return_stops=ret["stops"] if ret else None,
            # Details
            cabin_class=out["cabin_class"],
            passenger_count=len(req.passengers),
            total_price=out["total_price"] + (ret["total_price"] if ret else 0),
            currency=out.get("currency", "USD"),
            passengers=[p.model_dump(mode="json") for p in req.passengers],
            contact_email=req.contact_email,
            contact_phone=req.contact_phone,
        )
        booking = await self._repo.create(booking)
        await self._session.commit()
        logger.info(
            "booking_created",
            booking_reference=booking.booking_reference,
            user_id=str(user_id) if user_id else None,
            cabin_class=booking.cabin_class,
            passenger_count=booking.passenger_count,
            total_price=booking.total_price,
            currency=booking.currency,
            origin=booking.outbound_origin,
            destination=booking.outbound_destination,
            round_trip=booking.return_flight_number is not None,
        )
        await _email.send_booking_notification(booking, "confirmed")
        return booking

    # ── Lookup ────────────────────────────────────────────────────────────────

    async def get_booking(self, reference: str) -> FlightBooking:
        """Fetch a booking by reference.  Public — no ownership check."""
        booking = await self._repo.get_by_reference(reference)
        if not booking:
            logger.warning("booking_not_found", booking_reference=reference)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking {reference!r} not found",
            )
        return booking

    async def list_my_bookings(self, user_id: uuid.UUID | None = None) -> list[FlightBooking]:
        """Return bookings for a user, or all bookings when no user_id is given."""
        if user_id is not None:
            return await self._repo.get_by_user_id(user_id)
        return await self._repo.get_all()

    # ── Modify ────────────────────────────────────────────────────────────────

    async def modify_booking(
        self,
        reference: str,
        req: BookingModifyRequest,
        user_id: uuid.UUID | None = None,
    ) -> FlightBooking:
        """Modify dates, cabin class, and/or contact details on an active booking."""
        booking = await self._require_owned_active_booking(reference, user_id)

        updates: dict = {}

        # ── Resolve working dates and cabin class (may change together) ────────
        effective_cabin = req.cabin_class or booking.cabin_class
        effective_dep_date = req.new_departure_date or booking.outbound_departure_at.date()

        # ── Validate new dates ─────────────────────────────────────────────────
        if req.new_departure_date:
            if req.new_departure_date < date.today():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="new_departure_date must be today or in the future",
                )

        if req.new_return_date:
            if booking.return_flight_number is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="This is a one-way booking — it has no return flight to reschedule",
                )
            if req.new_return_date <= effective_dep_date:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="new_return_date must be after the departure date",
                )
            if req.new_return_date < date.today():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="new_return_date must be today or in the future",
                )

        # ── Reschedule outbound ────────────────────────────────────────────────
        if req.new_departure_date or (req.cabin_class and req.cabin_class != booking.cabin_class):
            new_out = self._pick_closest_offer(
                origin=booking.outbound_origin,
                destination=booking.outbound_destination,
                new_date=effective_dep_date,
                original_departure=booking.outbound_departure_at,
                cabin_class=effective_cabin,
                passengers=booking.passenger_count,
            )
            updates.update({
                "outbound_flight_number":    new_out["flight_number"],
                "outbound_airline":          new_out["airline"],
                "outbound_airline_code":     new_out["airline_code"],
                "outbound_departure_at":     datetime.fromisoformat(new_out["departure_at"]),
                "outbound_arrival_at":       datetime.fromisoformat(new_out["arrival_at"]),
                "outbound_duration_minutes": new_out["duration_minutes"],
                "outbound_stops":            new_out["stops"],
                "cabin_class":               effective_cabin,
            })
            outbound_price = new_out["total_price"]
        else:
            outbound_price = None  # unchanged

        # ── Reschedule return ──────────────────────────────────────────────────
        return_price = None
        if req.new_return_date and booking.return_flight_number:
            new_ret = self._pick_closest_offer(
                origin=booking.return_origin,        # type: ignore[arg-type]
                destination=booking.return_destination,  # type: ignore[arg-type]
                new_date=req.new_return_date,
                original_departure=booking.return_departure_at,
                cabin_class=effective_cabin,
                passengers=booking.passenger_count,
            )
            updates.update({
                "return_flight_number":    new_ret["flight_number"],
                "return_airline":          new_ret["airline"],
                "return_airline_code":     new_ret["airline_code"],
                "return_departure_at":     datetime.fromisoformat(new_ret["departure_at"]),
                "return_arrival_at":       datetime.fromisoformat(new_ret["arrival_at"]),
                "return_duration_minutes": new_ret["duration_minutes"],
                "return_stops":            new_ret["stops"],
            })
            return_price = new_ret["total_price"]

        # ── Recalculate total price when anything flight-related changed ───────
        if outbound_price is not None or return_price is not None:
            # Use new outbound price if available, else re-derive from existing total
            if outbound_price is None:
                # Only return date changed — split existing total by leg ratio (50/50 approx)
                existing_out_price = (
                    booking.total_price if not booking.return_flight_number
                    else booking.total_price / 2
                )
                outbound_price = existing_out_price
            if return_price is None and booking.return_flight_number:
                return_price = booking.total_price / 2
            updates["total_price"] = round(
                outbound_price + (return_price or 0), 2
            )

        # ── Contact detail updates ─────────────────────────────────────────────
        if req.contact_email:
            updates["contact_email"] = req.contact_email
        if req.contact_phone is not None:
            updates["contact_phone"] = req.contact_phone

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No changes provided",
            )

        updates["status"] = "modified"
        result = await self._repo.update(booking, updates)
        await self._session.commit()
        logger.info(
            "booking_modified",
            booking_reference=reference,
            user_id=str(user_id) if user_id else None,
            changed_fields=[k for k in updates if k != "status"],
            new_total_price=updates.get("total_price"),
        )
        await _email.send_booking_notification(result, "modified")
        return result

    # ── Cancel ────────────────────────────────────────────────────────────────

    async def cancel_booking(
        self, reference: str, user_id: uuid.UUID | None = None
    ) -> BookingCancelResponse:
        """Cancel an active booking owned by the requesting user."""
        booking = await self._require_owned_active_booking(reference, user_id)
        await self._repo.update(booking, {"status": "cancelled"})
        await self._session.commit()
        logger.info(
            "booking_cancelled",
            booking_reference=reference,
            user_id=str(user_id) if user_id else None,
        )
        await _email.send_booking_notification(booking, "cancelled")
        return BookingCancelResponse(
            booking_reference=reference,
            status="cancelled",
            message="Your booking has been cancelled successfully.",
        )

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _pick_closest_offer(
        self,
        origin: str,
        destination: str,
        new_date: date,
        original_departure: datetime | None,
        cabin_class: str,
        passengers: int,
    ) -> dict:
        """Search the mock provider for new_date and return the offer whose
        departure time is closest to the original flight's time-of-day.
        Raises 404 if the route has no offers on that date."""
        offers = mock.search(origin, destination, new_date, passengers, cabin_class)  # type: ignore[arg-type]
        if not offers:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No flights available from {origin} to {destination} on {new_date}",
            )
        if original_departure is None:
            return mock.decode_offer(offers[0].offer_id)

        # Match closest hour-of-day to preserve the passenger's preferred slot
        orig_minutes = original_departure.hour * 60 + original_departure.minute
        best = min(
            offers,
            key=lambda o: abs(
                (datetime.fromisoformat(mock.decode_offer(o.offer_id)["departure_at"]).hour * 60
                 + datetime.fromisoformat(mock.decode_offer(o.offer_id)["departure_at"]).minute)
                - orig_minutes
            ),
        )
        return mock.decode_offer(best.offer_id)

    async def _generate_reference(self) -> str:
        """Generate a unique 'PF-XXXXXX' booking reference."""
        for _ in range(10):
            chars = secrets.token_hex(3).upper()
            ref = f"PF-{chars}"
            if not await self._repo.reference_exists(ref):
                return ref
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate a unique booking reference. Please retry.",
        )

    async def _require_owned_active_booking(
        self, reference: str, user_id: uuid.UUID | None = None
    ) -> FlightBooking:
        booking = await self.get_booking(reference)
        if user_id is not None and booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this booking",
            )
        if booking.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot modify a cancelled booking",
            )
        return booking

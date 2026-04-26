"""FlightBooking ORM model — persists confirmed bookings."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


# ── Booking status state machine ───────────────────────────────────────────────
# Maps each status to the set of statuses it may transition to.
# Terminal states map to an empty frozenset.
#
# Allowed transitions:
#   confirmed → modified   (user reschedules, changes cabin, or updates contact)
#   confirmed → cancelled  (user cancels before travel)
#   modified  → modified   (user modifies again after a prior change)
#   modified  → cancelled  (user cancels after a prior modification)
#   cancelled → (none)     terminal — no further transitions permitted
#
# FlightService enforces these rules via FlightBooking.can_transition_to().
# Any code that changes booking.status MUST call can_transition_to() first.

BOOKING_TRANSITIONS: dict[str, frozenset[str]] = {
    "confirmed": frozenset({"modified", "cancelled"}),
    "modified":  frozenset({"modified", "cancelled"}),
    "cancelled": frozenset(),   # terminal state
}


class FlightBooking(BaseModel):
    """Stores a passenger's confirmed (or cancelled/modified) flight booking."""

    __tablename__ = "flight_bookings"

    # ── Identity ──────────────────────────────────────────────────────────────
    booking_reference: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="confirmed"
    )  # confirmed | modified | cancelled  (see BOOKING_TRANSITIONS above)

    # ── Optional user account link (no FK — works without auth too) ───────────
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # ── Outbound flight ───────────────────────────────────────────────────────
    outbound_flight_number: Mapped[str] = mapped_column(String(20), nullable=False)
    outbound_airline: Mapped[str] = mapped_column(String(100), nullable=False)
    outbound_airline_code: Mapped[str] = mapped_column(String(3), nullable=False)
    outbound_origin: Mapped[str] = mapped_column(String(3), nullable=False)
    outbound_destination: Mapped[str] = mapped_column(String(3), nullable=False)
    outbound_origin_city: Mapped[str] = mapped_column(String(100), nullable=False)
    outbound_destination_city: Mapped[str] = mapped_column(String(100), nullable=False)
    outbound_departure_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    outbound_arrival_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    outbound_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    outbound_stops: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Return flight (null = one-way) ────────────────────────────────────────
    return_flight_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    return_airline: Mapped[str | None] = mapped_column(String(100), nullable=True)
    return_airline_code: Mapped[str | None] = mapped_column(String(3), nullable=True)
    return_origin: Mapped[str | None] = mapped_column(String(3), nullable=True)
    return_destination: Mapped[str | None] = mapped_column(String(3), nullable=True)
    return_origin_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    return_destination_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    return_departure_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    return_arrival_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    return_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    return_stops: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ── Booking details ───────────────────────────────────────────────────────
    cabin_class: Mapped[str] = mapped_column(String(20), nullable=False)
    passenger_count: Mapped[int] = mapped_column(Integer, nullable=False)
    total_price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")

    # ── Passengers + contact (JSON blob) ─────────────────────────────────────
    passengers: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── State machine helpers ─────────────────────────────────────────────────

    def can_transition_to(self, new_status: str) -> bool:
        """Return True if transitioning from the current status to ``new_status`` is allowed.

        Example::

            if not booking.can_transition_to("cancelled"):
                raise HTTPException(409, "Cannot cancel a cancelled booking")
        """
        return new_status in BOOKING_TRANSITIONS.get(self.status, frozenset())

    def is_active(self) -> bool:
        """Return True if the booking can still be modified or cancelled.

        A booking is active when it has at least one valid outgoing transition
        (i.e. it is not in a terminal state like "cancelled").
        """
        return bool(BOOKING_TRANSITIONS.get(self.status))

    def __repr__(self) -> str:
        return f"<FlightBooking ref={self.booking_reference!r} status={self.status!r}>"

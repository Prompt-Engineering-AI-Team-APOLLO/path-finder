"""FlightBooking ORM model — persists confirmed bookings."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class FlightBooking(BaseModel):
    """Stores a passenger's confirmed (or cancelled/modified) flight booking."""

    __tablename__ = "flight_bookings"

    # ── Identity ──────────────────────────────────────────────────────────────
    booking_reference: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="confirmed"
    )  # confirmed | modified | cancelled

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

    def __repr__(self) -> str:
        return f"<FlightBooking ref={self.booking_reference!r} status={self.status!r}>"

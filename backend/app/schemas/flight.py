"""Pydantic schemas for the flights feature.

Endpoints
---------
POST   /api/v1/flights/search                 → FlightSearchResponse
POST   /api/v1/flights/bookings               → BookingRead
GET    /api/v1/flights/bookings               → list[BookingRead]   (own bookings)
GET    /api/v1/flights/bookings/{ref}         → BookingRead
PATCH  /api/v1/flights/bookings/{ref}         → BookingRead
DELETE /api/v1/flights/bookings/{ref}         → BookingCancelResponse
"""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

# ── Enums (as Literals for clean Swagger display) ─────────────────────────────

CabinClass = Literal["economy", "premium_economy", "business", "first"]
BookingStatus = Literal["confirmed", "modified", "cancelled"]


# ── Search ────────────────────────────────────────────────────────────────────


class FlightSearchRequest(BaseModel):
    """Search request for available flights on a given route and date."""

    origin: str = Field(
        ...,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Z]{3}$",
        description="Origin airport IATA code (e.g. JFK)",
        examples=["JFK"],
    )
    destination: str = Field(
        ...,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Z]{3}$",
        description="Destination airport IATA code (e.g. LAX)",
        examples=["LAX"],
    )
    departure_date: date = Field(
        ...,
        description="Outbound departure date (YYYY-MM-DD)",
        examples=["2026-06-15"],
    )
    return_date: date | None = Field(
        default=None,
        description="Return date for round-trip (omit for one-way)",
        examples=["2026-06-22"],
    )
    passengers: int = Field(
        default=1,
        ge=1,
        le=9,
        description="Number of passengers (1–9)",
        examples=[1],
    )
    cabin_class: CabinClass = Field(
        default="economy",
        description="Cabin class: economy | premium_economy | business | first",
        examples=["economy"],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "origin": "JFK",
                    "destination": "LAX",
                    "departure_date": "2026-06-15",
                    "return_date": "2026-06-22",
                    "passengers": 1,
                    "cabin_class": "economy",
                }
            ]
        }
    }


class FlightOffer(BaseModel):
    """A single available flight offer returned by a search."""

    offer_id: str = Field(description="Opaque ID — pass this to the book endpoint")
    flight_number: str = Field(examples=["DL 401"])
    airline: str = Field(examples=["Delta Air Lines"])
    airline_code: str = Field(examples=["DL"])
    origin: str = Field(examples=["JFK"])
    destination: str = Field(examples=["LAX"])
    origin_city: str = Field(examples=["New York"])
    destination_city: str = Field(examples=["Los Angeles"])
    departure_at: datetime = Field(examples=["2026-06-15T08:00:00"])
    arrival_at: datetime = Field(examples=["2026-06-15T11:30:00"])
    duration_minutes: int = Field(examples=[330])
    stops: int = Field(description="0 = direct", examples=[0])
    cabin_class: CabinClass
    available_seats: int = Field(examples=[42])
    price_per_person: float = Field(examples=[299.00])
    total_price: float = Field(examples=[299.00])
    currency: str = Field(examples=["USD"])
    baggage_included: bool = Field(examples=[False])


class FlightSearchResponse(BaseModel):
    """Search results containing outbound (and optionally return) flights."""

    search_id: str
    origin: str
    destination: str
    departure_date: date
    return_date: date | None
    passengers: int
    cabin_class: CabinClass
    currency: str
    outbound_flights: list[FlightOffer]
    return_flights: list[FlightOffer] | None = Field(
        default=None,
        description="Only present for round-trip searches",
    )


# ── Passenger ─────────────────────────────────────────────────────────────────


class PassengerInfo(BaseModel):
    """Details for a single passenger."""

    first_name: str = Field(..., min_length=1, max_length=100, examples=["Jane"])
    last_name: str = Field(..., min_length=1, max_length=100, examples=["Doe"])
    date_of_birth: date = Field(..., examples=["1990-07-04"])
    passport_number: str | None = Field(default=None, examples=["A12345678"])
    nationality: str | None = Field(
        default=None,
        min_length=2,
        max_length=2,
        description="ISO 3166-1 alpha-2 country code",
        examples=["US"],
    )


# ── Book ──────────────────────────────────────────────────────────────────────


class FlightBookRequest(BaseModel):
    """Request body to book a flight using offer IDs from a search result."""

    outbound_offer_id: str = Field(
        ...,
        description="offer_id from the outbound FlightOffer",
    )
    return_offer_id: str | None = Field(
        default=None,
        description="offer_id from the return FlightOffer (round-trip only)",
    )
    passengers: list[PassengerInfo] = Field(
        ...,
        min_length=1,
        max_length=9,
        description="One entry per passenger — must match the passengers count used in search",
    )
    contact_email: EmailStr = Field(..., examples=["jane.doe@example.com"])
    contact_phone: str | None = Field(default=None, examples=["+1-555-0100"])

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "outbound_offer_id": "<offer_id from search>",
                    "return_offer_id": None,
                    "passengers": [
                        {
                            "first_name": "Jane",
                            "last_name": "Doe",
                            "date_of_birth": "1990-07-04",
                            "passport_number": "A12345678",
                            "nationality": "US",
                        }
                    ],
                    "contact_email": "jane.doe@example.com",
                    "contact_phone": "+1-555-0100",
                }
            ]
        }
    }


# ── Booking read ──────────────────────────────────────────────────────────────


class BookingRead(BaseModel):
    """Full booking details as stored in the database."""

    id: uuid.UUID
    booking_reference: str = Field(examples=["PF-A1B2C3"])
    status: BookingStatus

    # Outbound
    outbound_flight_number: str
    outbound_airline: str
    outbound_airline_code: str
    outbound_origin: str
    outbound_destination: str
    outbound_origin_city: str
    outbound_destination_city: str
    outbound_departure_at: datetime
    outbound_arrival_at: datetime
    outbound_duration_minutes: int
    outbound_stops: int

    # Return (nullable for one-way)
    return_flight_number: str | None = None
    return_airline: str | None = None
    return_airline_code: str | None = None
    return_origin: str | None = None
    return_destination: str | None = None
    return_origin_city: str | None = None
    return_destination_city: str | None = None
    return_departure_at: datetime | None = None
    return_arrival_at: datetime | None = None
    return_duration_minutes: int | None = None
    return_stops: int | None = None

    # Booking details
    cabin_class: CabinClass
    passenger_count: int
    total_price: float
    currency: str
    passengers: list[PassengerInfo]
    contact_email: str
    contact_phone: str | None = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Modify ────────────────────────────────────────────────────────────────────


class BookingModifyRequest(BaseModel):
    """Fields that can be changed on an existing booking.

    To change flights entirely, cancel and rebook.
    """

    cabin_class: CabinClass | None = Field(
        default=None,
        description="Upgrade or downgrade cabin class. Price is recalculated.",
        examples=["business"],
    )
    contact_email: EmailStr | None = Field(default=None, examples=["new@example.com"])
    contact_phone: str | None = Field(default=None, examples=["+1-555-9999"])

    model_config = {
        "json_schema_extra": {
            "examples": [{"cabin_class": "business", "contact_phone": "+1-555-9999"}]
        }
    }


# ── Cancel ────────────────────────────────────────────────────────────────────


class BookingCancelResponse(BaseModel):
    booking_reference: str
    status: str
    message: str

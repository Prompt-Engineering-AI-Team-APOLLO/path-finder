"""Integration / acceptance tests for all /api/v1/flights endpoints.

These tests run against the full FastAPI app with an in-memory SQLite database
(no Docker required) and are designed to double as Swagger acceptance scripts —
every test shows the exact request body and asserts the expected response shape.

Quick reference
---------------
POST   /api/v1/flights/search                → search_flights
GET    /api/v1/flights/routes                → list_routes
POST   /api/v1/flights/bookings              → book_flight          [auth]
GET    /api/v1/flights/bookings              → list_my_bookings     [auth]
GET    /api/v1/flights/bookings/{ref}        → get_booking          [public]
PATCH  /api/v1/flights/bookings/{ref}        → modify_booking       [auth]
DELETE /api/v1/flights/bookings/{ref}        → cancel_booking       [auth]
"""

from datetime import date, timedelta
from typing import Any

import pytest
from httpx import AsyncClient

from app.services.flight_mock_provider import search as mock_search

# ── constants used across all tests ──────────────────────────────────────────

_FUTURE_DATE = (date.today() + timedelta(days=30)).isoformat()
_RETURN_DATE = (date.today() + timedelta(days=37)).isoformat()

_USER = {
    "email": "flyer@example.com",
    "username": "flyer",
    "full_name": "Flight Tester",
    "password": "Secure123",
}

_PASSENGER = {
    "first_name": "Jane",
    "last_name": "Doe",
    "date_of_birth": "1990-07-04",
    "passport_number": "A12345678",
    "nationality": "US",
}

# ── shared helpers ────────────────────────────────────────────────────────────


async def _register_and_login(client: AsyncClient, user: dict[str, Any]) -> str:
    """Register user + return a Bearer token."""
    await client.post("/api/v1/users", json=user)
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": user["email"], "password": user["password"]},
    )
    return resp.json()["tokens"]["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _get_outbound_offer_id(origin: str = "JFK", destination: str = "LAX") -> str:
    future = date.today() + timedelta(days=30)
    offers = mock_search(origin, destination, future, 1, "economy")
    return offers[0].offer_id


def _get_return_offer_id() -> str:
    future = date.today() + timedelta(days=37)
    offers = mock_search("LAX", "JFK", future, 1, "economy")
    return offers[0].offer_id


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/v1/flights/routes
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_list_routes_returns_all(client: AsyncClient):
    """
    GET /api/v1/flights/routes
    Expected: 200 with a non-empty list of {origin, destination, …} objects.
    """
    resp = await client.get("/api/v1/flights/routes")
    assert resp.status_code == 200
    routes = resp.json()
    assert isinstance(routes, list)
    assert len(routes) > 0
    first = routes[0]
    assert "origin" in first
    assert "destination" in first
    assert "origin_city" in first
    assert "destination_city" in first


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/v1/flights/search
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_search_one_way(client: AsyncClient):
    """
    POST /api/v1/flights/search
    Request:
        {
          "origin": "JFK",
          "destination": "LAX",
          "departure_date": "<FUTURE>",
          "passengers": 1,
          "cabin_class": "economy"
        }
    Expected: 200 with outbound_flights list, no return_flights.
    """
    resp = await client.post(
        "/api/v1/flights/search",
        json={
            "origin": "JFK",
            "destination": "LAX",
            "departure_date": _FUTURE_DATE,
            "passengers": 1,
            "cabin_class": "economy",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["origin"] == "JFK"
    assert body["destination"] == "LAX"
    assert len(body["outbound_flights"]) >= 4
    assert body["return_flights"] is None
    # Each offer must have an offer_id usable in /bookings
    offer = body["outbound_flights"][0]
    assert offer["offer_id"]
    assert offer["flight_number"]
    assert offer["departure_at"] < offer["arrival_at"]
    assert offer["price_per_person"] > 0
    assert offer["currency"] == "USD"


@pytest.mark.asyncio
async def test_search_round_trip(client: AsyncClient):
    """
    POST /api/v1/flights/search  (round-trip)
    Request includes return_date → response includes return_flights.
    """
    resp = await client.post(
        "/api/v1/flights/search",
        json={
            "origin": "JFK",
            "destination": "LAX",
            "departure_date": _FUTURE_DATE,
            "return_date": _RETURN_DATE,
            "passengers": 2,
            "cabin_class": "economy",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["return_flights"] is not None
    assert len(body["return_flights"]) >= 4
    # Return flights should be in the reverse direction
    return_offer = body["return_flights"][0]
    assert return_offer["origin"] == "LAX"
    assert return_offer["destination"] == "JFK"


@pytest.mark.asyncio
async def test_search_business_class(client: AsyncClient):
    """Business class results should cost more than economy."""
    eco = await client.post(
        "/api/v1/flights/search",
        json={"origin": "JFK", "destination": "LHR",
              "departure_date": _FUTURE_DATE, "passengers": 1, "cabin_class": "economy"},
    )
    biz = await client.post(
        "/api/v1/flights/search",
        json={"origin": "JFK", "destination": "LHR",
              "departure_date": _FUTURE_DATE, "passengers": 1, "cabin_class": "business"},
    )
    assert biz.status_code == 200
    eco_price = eco.json()["outbound_flights"][0]["price_per_person"]
    biz_price = biz.json()["outbound_flights"][0]["price_per_person"]
    assert biz_price > eco_price


@pytest.mark.asyncio
async def test_search_unsupported_route_returns_404(client: AsyncClient):
    resp = await client.post(
        "/api/v1/flights/search",
        json={"origin": "JFK", "destination": "XYZ",
              "departure_date": _FUTURE_DATE, "passengers": 1, "cabin_class": "economy"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_search_past_date_returns_422(client: AsyncClient):
    past = (date.today() - timedelta(days=1)).isoformat()
    resp = await client.post(
        "/api/v1/flights/search",
        json={"origin": "JFK", "destination": "LAX",
              "departure_date": past, "passengers": 1, "cabin_class": "economy"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_same_origin_destination_returns_422(client: AsyncClient):
    resp = await client.post(
        "/api/v1/flights/search",
        json={"origin": "JFK", "destination": "JFK",
              "departure_date": _FUTURE_DATE, "passengers": 1, "cabin_class": "economy"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_lowercase_iata_returns_422(client: AsyncClient):
    """IATA codes must be uppercase — Pydantic regex rejects lowercase."""
    resp = await client.post(
        "/api/v1/flights/search",
        json={"origin": "jfk", "destination": "lax",
              "departure_date": _FUTURE_DATE, "passengers": 1, "cabin_class": "economy"},
    )
    assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# POST /api/v1/flights/bookings  — book a flight
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_book_one_way_authenticated(client: AsyncClient):
    """
    POST /api/v1/flights/bookings
    Request:
        {
          "outbound_offer_id": "<from search>",
          "passengers": [{"first_name": "Jane", ...}],
          "contact_email": "flyer@example.com"
        }
    Expected: 201 with booking_reference, status = "confirmed".

    Sample response:
        {
          "id": "...",
          "booking_reference": "PF-A1B2C3",
          "status": "confirmed",
          "outbound_flight_number": "DL 401",
          "outbound_airline": "Delta Air Lines",
          "outbound_origin": "JFK",
          "outbound_destination": "LAX",
          ...
          "cabin_class": "economy",
          "passenger_count": 1,
          "total_price": 299.50,
          "currency": "USD",
          "passengers": [...],
          "contact_email": "flyer@example.com",
          "created_at": "...",
          "updated_at": "..."
        }
    """
    token = await _register_and_login(client, _USER)
    outbound_offer_id = _get_outbound_offer_id()

    resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": outbound_offer_id,
            "passengers": [_PASSENGER],
            "contact_email": "flyer@example.com",
            "contact_phone": "+1-555-0100",
        },
        headers=_auth(token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["booking_reference"].startswith("PF-")
    assert body["status"] == "confirmed"
    assert body["outbound_origin"] == "JFK"
    assert body["outbound_destination"] == "LAX"
    assert body["return_flight_number"] is None
    assert body["passenger_count"] == 1
    assert body["cabin_class"] == "economy"
    assert body["total_price"] > 0
    assert body["currency"] == "USD"
    assert len(body["passengers"]) == 1
    assert body["passengers"][0]["first_name"] == "Jane"
    assert "id" in body
    assert "created_at" in body


@pytest.mark.asyncio
async def test_book_round_trip(client: AsyncClient):
    """
    Round-trip booking sets return_flight_number and sums outbound + return prices.
    """
    user = {**_USER, "email": "rt@example.com", "username": "rtuser"}
    token = await _register_and_login(client, user)

    resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "return_offer_id": _get_return_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": "rt@example.com",
        },
        headers=_auth(token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["return_flight_number"] is not None
    assert body["return_origin"] == "LAX"
    assert body["return_destination"] == "JFK"
    assert body["total_price"] > 0


@pytest.mark.asyncio
async def test_book_requires_authentication(client: AsyncClient):
    """Booking without a token returns 403."""
    resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": "anon@example.com",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_book_invalid_offer_id_returns_400(client: AsyncClient):
    user = {**_USER, "email": "bad@example.com", "username": "badoffer"}
    token = await _register_and_login(client, user)
    resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": "this-is-not-valid",
            "passengers": [_PASSENGER],
            "contact_email": "bad@example.com",
        },
        headers=_auth(token),
    )
    assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/v1/flights/bookings  — list my bookings
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_list_my_bookings(client: AsyncClient):
    """
    GET /api/v1/flights/bookings
    Expected: 200 with a list of the user's own bookings.
    """
    user = {**_USER, "email": "list@example.com", "username": "listuser"}
    token = await _register_and_login(client, user)

    # Make two bookings on different routes
    for origin, dest in [("JFK", "LAX"), ("LHR", "CDG")]:
        offer_id = _get_outbound_offer_id(origin, dest)
        await client.post(
            "/api/v1/flights/bookings",
            json={
                "outbound_offer_id": offer_id,
                "passengers": [_PASSENGER],
                "contact_email": user["email"],
            },
            headers=_auth(token),
        )

    resp = await client.get("/api/v1/flights/bookings", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert len(body) == 2


@pytest.mark.asyncio
async def test_list_my_bookings_requires_authentication(client: AsyncClient):
    resp = await client.get("/api/v1/flights/bookings")
    assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# GET /api/v1/flights/bookings/{ref}  — look up a booking (public)
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_lookup_booking_public(client: AsyncClient):
    """
    GET /api/v1/flights/bookings/PF-XXXXXX
    No authentication required — anyone with the reference can look it up.

    Sample response:
        {
          "booking_reference": "PF-A1B2C3",
          "status": "confirmed",
          "outbound_flight_number": "DL 401",
          "outbound_origin": "JFK",
          "outbound_destination": "LAX",
          "outbound_departure_at": "2026-06-15T08:00:00+00:00",
          "outbound_arrival_at": "2026-06-15T13:30:00+00:00",
          "cabin_class": "economy",
          "passenger_count": 1,
          "total_price": 271.43,
          "currency": "USD",
          ...
        }
    """
    user = {**_USER, "email": "lookup@example.com", "username": "lookupuser"}
    token = await _register_and_login(client, user)
    book_resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": user["email"],
        },
        headers=_auth(token),
    )
    ref = book_resp.json()["booking_reference"]

    # Look up WITHOUT auth header
    resp = await client.get(f"/api/v1/flights/bookings/{ref}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["booking_reference"] == ref
    assert body["status"] == "confirmed"


@pytest.mark.asyncio
async def test_lookup_nonexistent_booking_returns_404(client: AsyncClient):
    resp = await client.get("/api/v1/flights/bookings/PF-ZZZZZZ")
    assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# PATCH /api/v1/flights/bookings/{ref}  — modify a booking
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_modify_cabin_class_upgrades_price(client: AsyncClient):
    """
    PATCH /api/v1/flights/bookings/PF-XXXXXX
    Request:
        { "cabin_class": "business" }
    Expected: 200 with updated cabin_class and higher total_price.

    Sample response:
        {
          "booking_reference": "PF-A1B2C3",
          "status": "modified",
          "cabin_class": "business",
          "total_price": 1650.00,
          ...
        }
    """
    user = {**_USER, "email": "mod@example.com", "username": "moduser"}
    token = await _register_and_login(client, user)
    book_resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": user["email"],
        },
        headers=_auth(token),
    )
    old_price = book_resp.json()["total_price"]
    ref = book_resp.json()["booking_reference"]

    resp = await client.patch(
        f"/api/v1/flights/bookings/{ref}",
        json={"cabin_class": "business"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["cabin_class"] == "business"
    assert body["status"] == "modified"
    assert body["total_price"] > old_price


@pytest.mark.asyncio
async def test_modify_contact_details(client: AsyncClient):
    user = {**_USER, "email": "modcontact@example.com", "username": "modcontact"}
    token = await _register_and_login(client, user)
    book_resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": user["email"],
        },
        headers=_auth(token),
    )
    ref = book_resp.json()["booking_reference"]

    resp = await client.patch(
        f"/api/v1/flights/bookings/{ref}",
        json={"contact_email": "updated@example.com", "contact_phone": "+44-20-7946-0958"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["contact_email"] == "updated@example.com"
    assert body["contact_phone"] == "+44-20-7946-0958"


@pytest.mark.asyncio
async def test_modify_requires_authentication(client: AsyncClient):
    resp = await client.patch(
        "/api/v1/flights/bookings/PF-ZZZZZZ",
        json={"cabin_class": "business"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_modify_other_users_booking_returns_403(client: AsyncClient):
    owner = {**_USER, "email": "owner2@example.com", "username": "owner2"}
    intruder = {**_USER, "email": "intruder@example.com", "username": "intruder"}
    owner_token = await _register_and_login(client, owner)
    intruder_token = await _register_and_login(client, intruder)

    book_resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": owner["email"],
        },
        headers=_auth(owner_token),
    )
    ref = book_resp.json()["booking_reference"]

    resp = await client.patch(
        f"/api/v1/flights/bookings/{ref}",
        json={"contact_phone": "+1-000-0000"},
        headers=_auth(intruder_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_modify_with_no_changes_returns_422(client: AsyncClient):
    user = {**_USER, "email": "nochange@example.com", "username": "nochange"}
    token = await _register_and_login(client, user)
    book_resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": user["email"],
        },
        headers=_auth(token),
    )
    ref = book_resp.json()["booking_reference"]

    resp = await client.patch(
        f"/api/v1/flights/bookings/{ref}",
        json={},
        headers=_auth(token),
    )
    assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# DELETE /api/v1/flights/bookings/{ref}  — cancel a booking
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_cancel_booking(client: AsyncClient):
    """
    DELETE /api/v1/flights/bookings/PF-XXXXXX
    Expected: 200 with { booking_reference, status: "cancelled", message }.

    Sample response:
        {
          "booking_reference": "PF-A1B2C3",
          "status": "cancelled",
          "message": "Your booking has been cancelled successfully."
        }
    """
    user = {**_USER, "email": "cancel@example.com", "username": "canceluser"}
    token = await _register_and_login(client, user)
    book_resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": user["email"],
        },
        headers=_auth(token),
    )
    ref = book_resp.json()["booking_reference"]

    resp = await client.delete(
        f"/api/v1/flights/bookings/{ref}",
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["booking_reference"] == ref
    assert body["status"] == "cancelled"
    assert "successfully" in body["message"].lower()

    # Confirm status persisted — lookup still works
    lookup = await client.get(f"/api/v1/flights/bookings/{ref}")
    assert lookup.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cancel_already_cancelled_returns_409(client: AsyncClient):
    user = {**_USER, "email": "cancel2@example.com", "username": "cancel2"}
    token = await _register_and_login(client, user)
    book_resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": user["email"],
        },
        headers=_auth(token),
    )
    ref = book_resp.json()["booking_reference"]

    await client.delete(f"/api/v1/flights/bookings/{ref}", headers=_auth(token))
    resp = await client.delete(f"/api/v1/flights/bookings/{ref}", headers=_auth(token))
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_cancel_requires_authentication(client: AsyncClient):
    resp = await client.delete("/api/v1/flights/bookings/PF-ZZZZZZ")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cancel_other_users_booking_returns_403(client: AsyncClient):
    owner = {**_USER, "email": "cowner@example.com", "username": "cowner"}
    intruder = {**_USER, "email": "cintruder@example.com", "username": "cintruder"}
    owner_token = await _register_and_login(client, owner)
    intruder_token = await _register_and_login(client, intruder)

    book_resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": _get_outbound_offer_id(),
            "passengers": [_PASSENGER],
            "contact_email": owner["email"],
        },
        headers=_auth(owner_token),
    )
    ref = book_resp.json()["booking_reference"]

    resp = await client.delete(
        f"/api/v1/flights/bookings/{ref}",
        headers=_auth(intruder_token),
    )
    assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# End-to-end journey: search → book → modify → lookup → cancel
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_full_booking_journey(client: AsyncClient):
    """
    Complete user journey acceptance test.

    1. Search one-way JFK→LAX economy
    2. Book using the first offer returned
    3. Upgrade cabin class to business
    4. Look up the booking without auth (public)
    5. Cancel the booking
    6. Verify the booking shows status = "cancelled"
    """
    user = {**_USER, "email": "journey@example.com", "username": "journey"}
    token = await _register_and_login(client, user)
    headers = _auth(token)

    # 1. Search
    search_resp = await client.post(
        "/api/v1/flights/search",
        json={
            "origin": "JFK",
            "destination": "LAX",
            "departure_date": _FUTURE_DATE,
            "passengers": 1,
            "cabin_class": "economy",
        },
    )
    assert search_resp.status_code == 200
    offer_id = search_resp.json()["outbound_flights"][0]["offer_id"]

    # 2. Book
    book_resp = await client.post(
        "/api/v1/flights/bookings",
        json={
            "outbound_offer_id": offer_id,
            "passengers": [_PASSENGER],
            "contact_email": user["email"],
            "contact_phone": "+1-555-0100",
        },
        headers=headers,
    )
    assert book_resp.status_code == 201
    booking = book_resp.json()
    ref = booking["booking_reference"]
    assert booking["status"] == "confirmed"
    economy_price = booking["total_price"]

    # 3. Modify — upgrade to business
    mod_resp = await client.patch(
        f"/api/v1/flights/bookings/{ref}",
        json={"cabin_class": "business"},
        headers=headers,
    )
    assert mod_resp.status_code == 200
    assert mod_resp.json()["cabin_class"] == "business"
    assert mod_resp.json()["total_price"] > economy_price
    assert mod_resp.json()["status"] == "modified"

    # 4. Public lookup
    lookup_resp = await client.get(f"/api/v1/flights/bookings/{ref}")
    assert lookup_resp.status_code == 200
    assert lookup_resp.json()["cabin_class"] == "business"

    # 5. Cancel
    cancel_resp = await client.delete(
        f"/api/v1/flights/bookings/{ref}", headers=headers
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # 6. Lookup post-cancel
    final = await client.get(f"/api/v1/flights/bookings/{ref}")
    assert final.json()["status"] == "cancelled"

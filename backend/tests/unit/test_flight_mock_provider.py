"""Unit tests for FlightMockProvider — pure computation, no DB required."""

from datetime import date, timedelta

import pytest

from app.services.flight_mock_provider import (
    AIRPORT_CITIES,
    CABIN_MULTIPLIERS,
    ROUTES,
    decode_offer,
    encode_offer,
    list_supported_routes,
    search,
)

_TODAY = date.today() + timedelta(days=30)  # future date for all searches


# ── encode / decode ───────────────────────────────────────────────────────────


def test_encode_decode_roundtrip():
    data = {"flight_number": "DL 401", "price": 299.0, "cabin_class": "economy"}
    assert decode_offer(encode_offer(data)) == data


def test_decode_invalid_offer_id_raises():
    with pytest.raises(ValueError):
        decode_offer("!!!not-base64!!!")


def test_decode_non_json_raises():
    import base64

    garbage = base64.urlsafe_b64encode(b"not json").decode()
    with pytest.raises(ValueError):
        decode_offer(garbage)


# ── search ────────────────────────────────────────────────────────────────────


def test_search_returns_offers_for_known_route():
    offers = search("JFK", "LAX", _TODAY, 1, "economy")
    assert len(offers) >= 4
    assert len(offers) <= 6


def test_search_unknown_route_returns_empty():
    offers = search("JFK", "XYZ", _TODAY, 1, "economy")
    assert offers == []


def test_search_results_are_deterministic():
    offers_a = search("JFK", "LAX", _TODAY, 1, "economy")
    offers_b = search("JFK", "LAX", _TODAY, 1, "economy")
    ids_a = [o.offer_id for o in offers_a]
    ids_b = [o.offer_id for o in offers_b]
    assert ids_a == ids_b


def test_different_dates_return_different_offers():
    date_a = _TODAY
    date_b = _TODAY + timedelta(days=7)
    offers_a = search("JFK", "LAX", date_a, 1, "economy")
    offers_b = search("JFK", "LAX", date_b, 1, "economy")
    ids_a = {o.offer_id for o in offers_a}
    ids_b = {o.offer_id for o in offers_b}
    assert ids_a != ids_b


def test_offer_fields_are_populated():
    offer = search("JFK", "LAX", _TODAY, 1, "economy")[0]
    assert offer.flight_number
    assert offer.airline
    assert offer.airline_code
    assert offer.origin == "JFK"
    assert offer.destination == "LAX"
    assert offer.origin_city == "New York"
    assert offer.destination_city == "Los Angeles"
    assert offer.departure_at < offer.arrival_at
    assert offer.duration_minutes == ROUTES[("JFK", "LAX")][0]
    assert offer.stops >= 0
    assert offer.available_seats > 0
    assert offer.price_per_person > 0
    assert offer.total_price == offer.price_per_person  # 1 passenger
    assert offer.currency == "USD"


def test_offer_id_decodes_to_full_flight_data():
    offer = search("LHR", "CDG", _TODAY, 1, "economy")[0]
    data = decode_offer(offer.offer_id)
    assert data["origin"] == "LHR"
    assert data["destination"] == "CDG"
    assert data["cabin_class"] == "economy"
    assert data["flight_number"] == offer.flight_number


def test_total_price_scales_with_passenger_count():
    offers_1 = search("JFK", "LAX", _TODAY, 1, "economy")
    offers_3 = search("JFK", "LAX", _TODAY, 3, "economy")
    # Same deterministic flights, so compare index 0
    ratio = offers_3[0].total_price / offers_1[0].total_price
    assert abs(ratio - 3.0) < 0.001


def test_cabin_class_multiplier_applied():
    eco = search("JFK", "LAX", _TODAY, 1, "economy")[0]
    biz = search("JFK", "LAX", _TODAY, 1, "business")[0]
    expected_ratio = CABIN_MULTIPLIERS["business"] / CABIN_MULTIPLIERS["economy"]
    actual_ratio = biz.price_per_person / eco.price_per_person
    # Same noise seed, so ratios should match exactly
    assert abs(actual_ratio - expected_ratio) < 0.001


def test_economy_baggage_not_included():
    offer = search("JFK", "LAX", _TODAY, 1, "economy")[0]
    assert offer.baggage_included is False


def test_business_baggage_included():
    offer = search("JFK", "LAX", _TODAY, 1, "business")[0]
    assert offer.baggage_included is True


def test_offers_sorted_by_departure_time():
    offers = search("JFK", "LAX", _TODAY, 1, "economy")
    times = [o.departure_at for o in offers]
    assert times == sorted(times)


def test_european_short_haul_route():
    offers = search("LHR", "CDG", _TODAY, 1, "economy")
    assert len(offers) >= 4
    assert offers[0].origin == "LHR"
    assert offers[0].destination == "CDG"


def test_all_routes_produce_offers():
    """Smoke-test: every route in the catalogue returns at least one offer."""
    for origin, destination in ROUTES:
        offers = search(origin, destination, _TODAY, 1, "economy")
        assert len(offers) > 0, f"No offers for {origin}->{destination}"


# ── list_supported_routes ─────────────────────────────────────────────────────


def test_list_supported_routes_returns_all():
    routes = list_supported_routes()
    assert len(routes) == len(ROUTES)
    first = routes[0]
    assert "origin" in first
    assert "destination" in first
    assert "origin_city" in first
    assert "destination_city" in first


def test_airport_cities_coverage():
    """Every airport in ROUTES should have a city name."""
    for origin, destination in ROUTES:
        assert origin in AIRPORT_CITIES, f"{origin} missing from AIRPORT_CITIES"
        assert destination in AIRPORT_CITIES, f"{destination} missing from AIRPORT_CITIES"

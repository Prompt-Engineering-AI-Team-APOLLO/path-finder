"""FlightMockProvider — deterministic in-process flight data generator.

No external API keys required.  Every search with the same parameters returns
the same set of flights (seeded RNG), making tests fully reproducible.

To swap in real data (e.g. Amadeus Test API), replace `search()` with an HTTP
call and keep the same return type (`list[FlightOffer]`).

Amadeus free test sandbox: https://developers.amadeus.com/self-service
    - `amadeus.shopping.flightOffersSearch.get(...)`  returns IATA-compliant data
    - Free tier; no credit card required for the test environment.
"""

import base64
import hashlib
import json
import random
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.schemas.flight import CabinClass, FlightOffer

# ── Static data ───────────────────────────────────────────────────────────────

AIRPORT_CITIES: dict[str, str] = {
    # North America
    "JFK": "New York",
    "LAX": "Los Angeles",
    "ORD": "Chicago",
    "DFW": "Dallas",
    "DEN": "Denver",
    "SFO": "San Francisco",
    "SEA": "Seattle",
    "MIA": "Miami",
    "BOS": "Boston",
    "ATL": "Atlanta",
    "LAS": "Las Vegas",
    "PHX": "Phoenix",
    # Europe
    "LHR": "London",
    "CDG": "Paris",
    "FRA": "Frankfurt",
    "AMS": "Amsterdam",
    "MAD": "Madrid",
    "FCO": "Rome",
    "ZRH": "Zurich",
    "BCN": "Barcelona",
    # Middle East
    "DXB": "Dubai",
    "AUH": "Abu Dhabi",
    "DOH": "Doha",
    # Asia Pacific
    "NRT": "Tokyo",
    "HKG": "Hong Kong",
    "SIN": "Singapore",
    "SYD": "Sydney",
    "ICN": "Seoul",
    "BKK": "Bangkok",
}

# (origin, destination): (duration_minutes, base_price_usd)
ROUTES: dict[tuple[str, str], tuple[int, float]] = {
    # US domestic
    ("JFK", "LAX"): (330, 250),
    ("LAX", "JFK"): (360, 250),
    ("JFK", "ORD"): (150, 140),
    ("ORD", "JFK"): (150, 140),
    ("JFK", "MIA"): (180, 160),
    ("MIA", "JFK"): (180, 160),
    ("JFK", "BOS"): (75, 90),
    ("BOS", "JFK"): (75, 90),
    ("LAX", "SFO"): (80, 85),
    ("SFO", "LAX"): (80, 85),
    ("LAX", "DFW"): (200, 175),
    ("DFW", "LAX"): (200, 175),
    ("ORD", "DFW"): (150, 130),
    ("DFW", "ORD"): (150, 130),
    ("ATL", "LAX"): (290, 210),
    ("LAX", "ATL"): (290, 210),
    ("SEA", "SFO"): (130, 110),
    ("SFO", "SEA"): (130, 110),
    ("DEN", "LAX"): (160, 145),
    ("LAX", "DEN"): (160, 145),
    ("DFW", "DEN"): (130, 120),
    ("DEN", "DFW"): (130, 120),
    ("MIA", "BOS"): (195, 155),
    ("BOS", "MIA"): (195, 155),
    ("LAS", "LAX"): (65, 80),
    ("LAX", "LAS"): (65, 80),
    ("PHX", "LAX"): (75, 85),
    ("LAX", "PHX"): (75, 85),
    # Transatlantic
    ("JFK", "LHR"): (420, 550),
    ("LHR", "JFK"): (480, 550),
    ("JFK", "CDG"): (450, 600),
    ("CDG", "JFK"): (510, 600),
    ("JFK", "FRA"): (480, 580),
    ("FRA", "JFK"): (540, 580),
    ("BOS", "LHR"): (410, 530),
    ("LHR", "BOS"): (460, 530),
    ("MIA", "LHR"): (540, 590),
    ("LHR", "MIA"): (560, 590),
    ("LAX", "LHR"): (600, 650),
    ("LHR", "LAX"): (630, 650),
    # Europe
    ("LHR", "CDG"): (80, 120),
    ("CDG", "LHR"): (80, 120),
    ("LHR", "FRA"): (100, 130),
    ("FRA", "LHR"): (100, 130),
    ("LHR", "AMS"): (85, 115),
    ("AMS", "LHR"): (85, 115),
    ("LHR", "MAD"): (150, 160),
    ("MAD", "LHR"): (150, 160),
    ("LHR", "BCN"): (145, 155),
    ("BCN", "LHR"): (145, 155),
    ("CDG", "FRA"): (75, 110),
    ("FRA", "CDG"): (75, 110),
    # Middle East
    ("LHR", "DXB"): (420, 500),
    ("DXB", "LHR"): (420, 500),
    ("JFK", "DXB"): (840, 900),
    ("DXB", "JFK"): (840, 900),
    ("FRA", "DXB"): (360, 460),
    ("DXB", "FRA"): (360, 460),
    ("DXB", "DOH"): (65, 120),
    ("DOH", "DXB"): (65, 120),
    # Asia Pacific
    ("DXB", "SIN"): (420, 450),
    ("SIN", "DXB"): (420, 450),
    ("NRT", "SIN"): (450, 500),
    ("SIN", "NRT"): (450, 500),
    ("SYD", "SIN"): (465, 480),
    ("SIN", "SYD"): (465, 480),
    ("HKG", "SIN"): (220, 280),
    ("SIN", "HKG"): (220, 280),
    ("NRT", "HKG"): (220, 290),
    ("HKG", "NRT"): (220, 290),
    ("ICN", "NRT"): (130, 200),
    ("NRT", "ICN"): (130, 200),
    ("SIN", "BKK"): (140, 180),
    ("BKK", "SIN"): (140, 180),
    ("LHR", "SIN"): (780, 720),
    ("SIN", "LHR"): (800, 720),
    ("LAX", "NRT"): (630, 700),
    ("NRT", "LAX"): (660, 700),
}

# Airlines per geographic region
_US = [
    ("DL", "Delta Air Lines"),
    ("AA", "American Airlines"),
    ("UA", "United Airlines"),
    ("B6", "JetBlue Airways"),
    ("WN", "Southwest Airlines"),
    ("AS", "Alaska Airlines"),
]
_AT = [
    ("BA", "British Airways"),
    ("AA", "American Airlines"),
    ("DL", "Delta Air Lines"),
    ("VS", "Virgin Atlantic"),
    ("LH", "Lufthansa"),
    ("AF", "Air France"),
]
_EU = [
    ("BA", "British Airways"),
    ("LH", "Lufthansa"),
    ("AF", "Air France"),
    ("KL", "KLM Royal Dutch Airlines"),
    ("IB", "Iberia"),
    ("AZ", "ITA Airways"),
]
_ME = [
    ("EK", "Emirates"),
    ("EY", "Etihad Airways"),
    ("QR", "Qatar Airways"),
    ("FZ", "flydubai"),
]
_AP = [
    ("SQ", "Singapore Airlines"),
    ("CX", "Cathay Pacific"),
    ("NH", "All Nippon Airways"),
    ("QF", "Qantas"),
    ("TG", "Thai Airways"),
    ("KE", "Korean Air"),
]

_US_AIRPORTS = {"JFK", "LAX", "ORD", "DFW", "DEN", "SFO", "SEA", "MIA", "BOS", "ATL", "LAS", "PHX"}
_EU_AIRPORTS = {"LHR", "CDG", "FRA", "AMS", "MAD", "FCO", "ZRH", "BCN"}
_ME_AIRPORTS = {"DXB", "AUH", "DOH"}
_AP_AIRPORTS = {"NRT", "HKG", "SIN", "SYD", "ICN", "BKK"}

CABIN_MULTIPLIERS: dict[str, float] = {
    "economy": 1.0,
    "premium_economy": 2.2,
    "business": 5.5,
    "first": 9.0,
}

BAGGAGE_INCLUDED: dict[str, bool] = {
    "economy": False,
    "premium_economy": True,
    "business": True,
    "first": True,
}

# Departure hour slots (6 options per day)
_DEPARTURE_HOURS = [
    5, 6, 7, 8, 9, 10, 11, 12,
    13, 14, 15, 16, 17, 18, 19, 20,
    21, 22,
]


# ── Helpers ───────────────────────────────────────────────────────────────────


def _route_airlines(origin: str, destination: str) -> list[tuple[str, str]]:
    both = {origin, destination}
    if both <= _US_AIRPORTS:
        return _US
    if both <= _EU_AIRPORTS:
        return _EU
    if both <= _ME_AIRPORTS:
        return _ME
    if both <= _AP_AIRPORTS:
        return _AP
    if both & _ME_AIRPORTS:
        return _ME
    if both & _AP_AIRPORTS:
        return _AP
    if (both & _US_AIRPORTS) and (both & _EU_AIRPORTS):
        return _AT
    return _US + _EU  # fallback


def _seed(origin: str, destination: str, dep_date: date) -> int:
    key = f"{origin}{destination}{dep_date.isoformat()}"
    return int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**31)


def encode_offer(data: dict[str, Any]) -> str:
    """Serialize flight data into a URL-safe base64 string used as offer_id."""
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()


def decode_offer(offer_id: str) -> dict[str, Any]:
    """Deserialize an offer_id back into flight data.

    Raises ValueError if the offer_id is malformed.
    """
    try:
        return json.loads(base64.urlsafe_b64decode(offer_id.encode()).decode())
    except Exception as exc:
        raise ValueError(f"Invalid offer_id: {exc}") from exc


# ── Public API ────────────────────────────────────────────────────────────────


def search(
    origin: str,
    destination: str,
    dep_date: date,
    passengers: int,
    cabin_class: CabinClass,
) -> list[FlightOffer]:
    """Return a deterministic list of flight offers for a given route + date.

    Returns an empty list if the route is not in the supported catalogue.
    Each call with the same arguments produces the same results.
    """
    route_key = (origin, destination)
    if route_key not in ROUTES:
        return []

    duration_minutes, base_price = ROUTES[route_key]
    airlines = _route_airlines(origin, destination)
    multiplier = CABIN_MULTIPLIERS[cabin_class]
    baggage = BAGGAGE_INCLUDED[cabin_class]

    rng = random.Random(_seed(origin, destination, dep_date))
    n_flights = rng.randint(20, min(30, len(_DEPARTURE_HOURS)))
    chosen_hours = rng.sample(_DEPARTURE_HOURS, n_flights)
    chosen_hours.sort()

    offers: list[FlightOffer] = []
    for hour in chosen_hours:
        airline_code, airline_name = rng.choice(airlines)
        flight_num = f"{airline_code}{rng.randint(100, 999)}"

        dep_dt = datetime(
            dep_date.year, dep_date.month, dep_date.day, hour, 0, 0,
            tzinfo=timezone.utc,
        )
        arr_dt = dep_dt + timedelta(minutes=duration_minutes)

        # Small stop chance for longer routes
        stops = 0
        if duration_minutes > 500 and rng.random() < 0.25:
            stops = 1

        # Price: base × cabin_multiplier × ±25% noise
        noise = rng.uniform(0.85, 1.25)
        price_pp = round(base_price * multiplier * noise, 2)
        total = round(price_pp * passengers, 2)
        seats = rng.randint(4, 72)

        offer_data: dict[str, Any] = {
            "flight_number": f"{airline_code} {flight_num[len(airline_code):]}",
            "airline": airline_name,
            "airline_code": airline_code,
            "origin": origin,
            "destination": destination,
            "origin_city": AIRPORT_CITIES.get(origin, origin),
            "destination_city": AIRPORT_CITIES.get(destination, destination),
            "departure_at": dep_dt.isoformat(),
            "arrival_at": arr_dt.isoformat(),
            "duration_minutes": duration_minutes,
            "stops": stops,
            "cabin_class": cabin_class,
            "available_seats": seats,
            "price_per_person": price_pp,
            "total_price": total,
            "currency": "USD",
            "baggage_included": baggage,
        }

        offers.append(
            FlightOffer(
                offer_id=encode_offer(offer_data),
                **offer_data,
            )
        )

    return offers


def list_supported_routes() -> list[dict[str, str]]:
    """Return a human-readable list of all supported routes (for docs/testing)."""
    return [
        {
            "origin": o,
            "destination": d,
            "origin_city": AIRPORT_CITIES.get(o, o),
            "destination_city": AIRPORT_CITIES.get(d, d),
        }
        for o, d in ROUTES
    ]

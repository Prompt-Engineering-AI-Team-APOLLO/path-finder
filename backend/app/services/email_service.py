"""EmailService — sends transactional emails via Gmail SMTP.

Uses Python's built-in smtplib (no extra packages needed).
Runs in a thread executor so it doesn't block the async event loop.
Gracefully no-ops when SMTP_USER / SMTP_PASSWORD are not set.
"""

import asyncio
import smtplib
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _enabled() -> bool:
    return bool(settings.SMTP_USER and settings.SMTP_PASSWORD)


def _fmt_dt(dt) -> str:
    if dt is None:
        return "—"
    return dt.strftime("%A, %d %B %Y at %H:%M UTC")


def _passenger_rows(passengers: list[dict]) -> str:
    rows = []
    for i, p in enumerate(passengers, 1):
        name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
        dob = p.get("date_of_birth", "—")
        passport = p.get("passport_number", "—")
        nationality = p.get("nationality", "—")
        rows.append(
            f"  Passenger {i}: {name} | DOB: {dob} | "
            f"Passport: {passport} | Nationality: {nationality}"
        )
    return "\n".join(rows) if rows else "  —"


def _build_email(booking, event: str) -> tuple[str, str]:
    """Return (subject, plain-text body) for a booking event."""
    ref = booking.booking_reference

    subject = {
        "confirmed": f"Pathfinder | Booking {ref} Confirmed",
        "modified":  f"Pathfinder | Booking {ref} Updated",
        "cancelled": f"Pathfinder | Booking {ref} Cancelled",
    }.get(event, f"Pathfinder | Update on booking {ref}")

    outbound_dep = _fmt_dt(booking.outbound_departure_at)
    outbound_arr = _fmt_dt(booking.outbound_arrival_at)

    lines = [
        "=" * 60,
        "  PATHFINDER FLIGHT NOTIFICATION",
        "=" * 60,
        "",
        f"  Booking Reference : {ref}",
        f"  Status            : {booking.status.upper()}",
        "",
        "── OUTBOUND FLIGHT ──────────────────────────────────────",
        f"  Flight            : {booking.outbound_airline} {booking.outbound_flight_number}",
        f"  Route             : {booking.outbound_origin} ({booking.outbound_origin_city})"
        f" → {booking.outbound_destination} ({booking.outbound_destination_city})",
        f"  Departure         : {outbound_dep}",
        f"  Arrival           : {outbound_arr}",
        f"  Duration          : {booking.outbound_duration_minutes // 60}h "
        f"{booking.outbound_duration_minutes % 60}m",
        f"  Stops             : {booking.outbound_stops}",
    ]

    if booking.return_flight_number:
        lines += [
            "",
            "── RETURN FLIGHT ────────────────────────────────────────",
            f"  Flight            : {booking.return_airline} {booking.return_flight_number}",
            f"  Route             : {booking.return_origin} ({booking.return_origin_city})"
            f" → {booking.return_destination} ({booking.return_destination_city})",
            f"  Departure         : {_fmt_dt(booking.return_departure_at)}",
            f"  Arrival           : {_fmt_dt(booking.return_arrival_at)}",
            f"  Duration          : {booking.return_duration_minutes // 60}h "
            f"{booking.return_duration_minutes % 60}m",
            f"  Stops             : {booking.return_stops}",
        ]

    lines += [
        "",
        "── BOOKING DETAILS ──────────────────────────────────────",
        f"  Cabin Class       : {booking.cabin_class.replace('_', ' ').title()}",
        f"  Passengers        : {booking.passenger_count}",
        f"  Total Price       : {booking.currency} {booking.total_price:,.2f}",
        f"  Contact Email     : {booking.contact_email}",
    ]

    if booking.contact_phone:
        lines.append(f"  Contact Phone     : {booking.contact_phone}")

    lines += [
        "",
        "── PASSENGER DETAILS ────────────────────────────────────",
        _passenger_rows(booking.passengers or []),
        "",
        "=" * 60,
        "  Thank you for flying with Pathfinder.",
        "  Questions? Chat with your AI travel assistant anytime.",
        "=" * 60,
    ]

    return subject, "\n".join(lines)


def _send_smtp(to: str, subject: str, body: str) -> None:
    """Blocking SMTP send — called via asyncio.to_thread."""
    msg = MIMEText(body, "plain")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_USER
    msg["To"] = to

<<<<<<< HEAD
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        smtp.ehlo()
        smtp.starttls()
=======
    with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
>>>>>>> origin/main
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.sendmail(settings.SMTP_USER, [to], msg.as_string())


class EmailService:
    async def send_booking_notification(self, booking, event: str) -> None:
        """Send an email for 'confirmed', 'modified', or 'cancelled' events.

        Never raises — a failed send is logged but the booking operation is
        never rolled back because of it.
        """
        if not _enabled():
            logger.info("email_skipped", reason="SMTP_USER or SMTP_PASSWORD not set",
                        action=event, ref=booking.booking_reference)
            return

        to = booking.contact_email
        try:
            subject, body = _build_email(booking, event)
            await asyncio.to_thread(_send_smtp, to, subject, body)
            logger.info("email_sent", action=event, to=to, ref=booking.booking_reference)
        except Exception as exc:
            logger.warning("email_failed", action=event, to=to,
                           ref=booking.booking_reference, error=str(exc))

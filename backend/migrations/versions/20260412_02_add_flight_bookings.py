"""add flight_bookings table

Revision ID: 20260412_02
Revises: 20260411_01
Create Date: 2026-04-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260412_02"
down_revision: str | None = "20260411_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "flight_bookings",
        # ── Identity ──────────────────────────────────────────────────────────
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("booking_reference", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="confirmed"),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        # ── Outbound flight ───────────────────────────────────────────────────
        sa.Column("outbound_flight_number", sa.String(20), nullable=False),
        sa.Column("outbound_airline", sa.String(100), nullable=False),
        sa.Column("outbound_airline_code", sa.String(3), nullable=False),
        sa.Column("outbound_origin", sa.String(3), nullable=False),
        sa.Column("outbound_destination", sa.String(3), nullable=False),
        sa.Column("outbound_origin_city", sa.String(100), nullable=False),
        sa.Column("outbound_destination_city", sa.String(100), nullable=False),
        sa.Column("outbound_departure_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("outbound_arrival_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("outbound_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("outbound_stops", sa.Integer(), nullable=False, server_default="0"),
        # ── Return flight (nullable) ──────────────────────────────────────────
        sa.Column("return_flight_number", sa.String(20), nullable=True),
        sa.Column("return_airline", sa.String(100), nullable=True),
        sa.Column("return_airline_code", sa.String(3), nullable=True),
        sa.Column("return_origin", sa.String(3), nullable=True),
        sa.Column("return_destination", sa.String(3), nullable=True),
        sa.Column("return_origin_city", sa.String(100), nullable=True),
        sa.Column("return_destination_city", sa.String(100), nullable=True),
        sa.Column("return_departure_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("return_arrival_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("return_duration_minutes", sa.Integer(), nullable=True),
        sa.Column("return_stops", sa.Integer(), nullable=True),
        # ── Booking details ───────────────────────────────────────────────────
        sa.Column("cabin_class", sa.String(20), nullable=False),
        sa.Column("passenger_count", sa.Integer(), nullable=False),
        sa.Column("total_price", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("passengers", sa.JSON(), nullable=False),
        sa.Column("contact_email", sa.String(255), nullable=False),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        # ── Timestamps ────────────────────────────────────────────────────────
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(op.f("ix_flight_bookings_id"), "flight_bookings", ["id"], unique=False)
    op.create_index(
        op.f("ix_flight_bookings_booking_reference"),
        "flight_bookings",
        ["booking_reference"],
        unique=True,
    )
    op.create_index(
        op.f("ix_flight_bookings_user_id"), "flight_bookings", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_table("flight_bookings")

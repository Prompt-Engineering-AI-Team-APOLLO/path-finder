"""drop username column from users

Revision ID: 20260412_03
Revises: 20260401_00
Create Date: 2026-04-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260412_03"
down_revision: str | None = "20260401_00"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_column("users", "username")


def downgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(50), nullable=True))
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

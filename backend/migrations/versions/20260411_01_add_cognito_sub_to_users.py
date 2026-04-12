"""add cognito_sub to users

Revision ID: 20260411_01
Revises:
Create Date: 2026-04-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260411_01"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("cognito_sub", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_users_cognito_sub"), "users", ["cognito_sub"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_cognito_sub"), table_name="users")
    op.drop_column("users", "cognito_sub")

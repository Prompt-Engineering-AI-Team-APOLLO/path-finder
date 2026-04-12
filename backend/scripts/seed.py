"""
Seed script — creates an admin user for development.
Usage:  python scripts/seed.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_password  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        admin = User(
            email="admin@pathfinder.ai",
            full_name="Admin User",
            hashed_password=hash_password("Admin1234!"),
            role="admin",
            is_active=True,
            is_verified=True,
        )
        session.add(admin)
        await session.commit()
        print(f"Admin user created: {admin.email} (id={admin.id})")


if __name__ == "__main__":
    asyncio.run(seed())

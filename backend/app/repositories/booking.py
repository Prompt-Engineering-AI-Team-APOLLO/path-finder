"""Repository for FlightBooking records."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flight import FlightBooking
from app.repositories.base import BaseRepository


class BookingRepository(BaseRepository[FlightBooking]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(FlightBooking, session)

    async def get_by_reference(self, reference: str) -> FlightBooking | None:
        stmt = select(FlightBooking).where(FlightBooking.booking_reference == reference)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: uuid.UUID) -> list[FlightBooking]:
        stmt = (
            select(FlightBooking)
            .where(FlightBooking.user_id == user_id)
            .order_by(FlightBooking.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def reference_exists(self, reference: str) -> bool:
        return await self.get_by_reference(reference) is not None

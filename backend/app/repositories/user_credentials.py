from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_credentials import UserCredentials
from app.repositories.base import BaseRepository


class UserCredentialsRepository(BaseRepository[UserCredentials]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(UserCredentials, session)

    async def get_by_email(self, email: str) -> UserCredentials | None:
        stmt = select(UserCredentials).where(func.lower(UserCredentials.email) == email.lower())
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        return await self.get_by_email(email) is not None

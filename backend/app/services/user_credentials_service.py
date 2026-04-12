from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user_credentials import UserCredentials
from app.repositories.user_credentials import UserCredentialsRepository
from app.schemas.user_credentials import (
    CredentialsSignInRequest,
    CredentialsSignUpRequest,
)


class UserCredentialsService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = UserCredentialsRepository(session)

    async def sign_up(self, data: CredentialsSignUpRequest) -> UserCredentials:
        if await self._repo.email_exists(data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        record = UserCredentials(
            email=data.email.lower(),
            password_hash=hash_password(data.password),
            is_email_verified=False,
            is_active=True,
            failed_login_attempts=0,
        )
        return await self._repo.create(record)

    async def sign_in(self, data: CredentialsSignInRequest) -> UserCredentials:
        record = await self._repo.get_by_email(data.email)
        if not record or not verify_password(data.password, record.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        if not record.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        return await self._repo.update(
            record,
            {"failed_login_attempts": 0, "last_login_at": datetime.now(UTC)},
        )

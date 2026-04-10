import uuid

from fastapi import HTTPException, status
from jose import JWTError

from app.core.config import settings
from app.core.constants import TOKEN_TYPE_REFRESH
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.user_service import UserService


class AuthService:
    def __init__(self, user_service: UserService) -> None:
        self._user_svc = user_service

    async def login(self, data: LoginRequest) -> LoginResponse:
        user = await self._authenticate(data.email, data.password)
        tokens = self._issue_tokens(user)
        return LoginResponse(tokens=tokens, user=UserRead.model_validate(user))

    async def refresh(self, data: RefreshRequest) -> TokenResponse:
        try:
            payload = decode_token(data.refresh_token)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )
        if payload.get("type") != TOKEN_TYPE_REFRESH:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not a refresh token",
            )
        user = await self._user_svc.get_user(uuid.UUID(payload["sub"]))
        return self._issue_tokens(user)

    async def _authenticate(self, email: str, password: str) -> User:
        user = await self._user_svc.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        return user

    @staticmethod
    def _issue_tokens(user: User) -> TokenResponse:
        access = create_access_token(
            subject=str(user.id),
            extra_claims={"role": user.role, "email": user.email},
        )
        refresh = create_refresh_token(subject=str(user.id))
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

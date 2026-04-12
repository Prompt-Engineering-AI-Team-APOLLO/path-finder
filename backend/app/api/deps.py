"""FastAPI dependency injection wiring."""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ROLE_ADMIN, TOKEN_TYPE_ACCESS
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.services.ai_service import AIService
from app.services.auth_service import AuthService
from app.services.flight_service import FlightService
from app.services.user_service import UserService
from app.services.vector_service import VectorService

_bearer = HTTPBearer(auto_error=True)

# ── DB ────────────────────────────────────────────────────────────────────────
DBDep = Annotated[AsyncSession, Depends(get_db)]

# ── Services ──────────────────────────────────────────────────────────────────


def get_user_service(db: DBDep) -> UserService:
    return UserService(db)


def get_auth_service(user_svc: Annotated[UserService, Depends(get_user_service)]) -> AuthService:
    return AuthService(user_svc)

def get_ai_service() -> AIService:
    return AIService()


def get_vector_service(ai: Annotated[AIService, Depends(get_ai_service)]) -> VectorService:
    return VectorService(ai)


def get_flight_service(db: DBDep) -> FlightService:
    return FlightService(db)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
AIServiceDep = Annotated[AIService, Depends(get_ai_service)]
VectorServiceDep = Annotated[VectorService, Depends(get_vector_service)]
FlightServiceDep = Annotated[FlightService, Depends(get_flight_service)]

# ── Auth ──────────────────────────────────────────────────────────────────────


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    user_svc: UserServiceDep,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != TOKEN_TYPE_ACCESS:
            raise credentials_exception
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        user = await user_svc.get_user(uuid.UUID(user_id))
    except (ValueError, AttributeError):
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return user


def require_role(*roles: str):
    """Factory: produces a dependency that restricts access to given roles."""

    async def _check(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )
        return current_user

    return _check


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_role(ROLE_ADMIN))]

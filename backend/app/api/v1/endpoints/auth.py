from fastapi import APIRouter

from app.api.deps import AuthServiceDep
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, auth_svc: AuthServiceDep) -> LoginResponse:
    """Authenticate user and return access + refresh tokens."""
    return await auth_svc.login(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, auth_svc: AuthServiceDep) -> TokenResponse:
    """Exchange a valid refresh token for a new access token."""
    return await auth_svc.refresh(data)

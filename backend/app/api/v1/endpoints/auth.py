from fastapi import APIRouter, Request

from app.api.deps import AuthServiceDep
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.schemas.auth import GoogleLoginRequest, LoginRequest, LoginResponse, RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, auth_svc: AuthServiceDep, request: Request) -> LoginResponse:
    """Authenticate user and return access + refresh tokens."""
    client_ip = request.client.host if request.client else "unknown"
    await enforce_rate_limit(f"login:{client_ip}", settings.LOGIN_RATE_LIMIT)
    return await auth_svc.login(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, auth_svc: AuthServiceDep) -> TokenResponse:
    """Exchange a valid refresh token for a new access token."""
    return await auth_svc.refresh(data)


@router.post("/google", response_model=LoginResponse)
async def google_login(data: GoogleLoginRequest, auth_svc: AuthServiceDep, request: Request) -> LoginResponse:
    """Authenticate via Google ID token and return access + refresh tokens."""
    client_ip = request.client.host if request.client else "unknown"
    await enforce_rate_limit(f"login:{client_ip}", settings.LOGIN_RATE_LIMIT)
    return await auth_svc.google_login(data)

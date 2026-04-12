from fastapi import APIRouter

from app.api.deps import AuthServiceDep, UserCredentialsServiceDep
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, TokenResponse
from app.schemas.user_credentials import (
    CredentialsAuthResponse,
    CredentialsSignInRequest,
    CredentialsSignUpRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, auth_svc: AuthServiceDep) -> LoginResponse:
    """Authenticate user and return access + refresh tokens."""
    return await auth_svc.login(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, auth_svc: AuthServiceDep) -> TokenResponse:
    """Exchange a valid refresh token for a new access token."""
    return await auth_svc.refresh(data)


@router.post("/credentials/signup", response_model=CredentialsAuthResponse, status_code=201)
async def credentials_sign_up(
    data: CredentialsSignUpRequest,
    creds_svc: UserCredentialsServiceDep,
) -> CredentialsAuthResponse:
    """Sign up using users_credentials table storage."""
    created = await creds_svc.sign_up(data)
    return CredentialsAuthResponse(message="Sign up successful", email=created.email)


@router.post("/credentials/signin", response_model=CredentialsAuthResponse)
async def credentials_sign_in(
    data: CredentialsSignInRequest,
    creds_svc: UserCredentialsServiceDep,
) -> CredentialsAuthResponse:
    """Sign in using users_credentials table validation."""
    user = await creds_svc.sign_in(data)
    return CredentialsAuthResponse(message="Sign in successful", email=user.email)

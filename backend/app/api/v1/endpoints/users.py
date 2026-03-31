import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import AdminUser, CurrentUser, UserServiceDep
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.user import UserCreate, UserRead, UserUpdate, UserUpdatePassword

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserRead, status_code=201)
async def register_user(data: UserCreate, user_svc: UserServiceDep) -> UserRead:
    """Create a new user account (public endpoint)."""
    user = await user_svc.create_user(data)
    return UserRead.model_validate(user)


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser) -> UserRead:
    """Return the authenticated user's profile."""
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def update_me(
    data: UserUpdate,
    current_user: CurrentUser,
    user_svc: UserServiceDep,
) -> UserRead:
    """Update the authenticated user's profile."""
    user = await user_svc.update_user(current_user.id, data)
    return UserRead.model_validate(user)


@router.post("/me/password", response_model=MessageResponse)
async def change_password(
    data: UserUpdatePassword,
    current_user: CurrentUser,
    user_svc: UserServiceDep,
) -> MessageResponse:
    """Change the authenticated user's password."""
    await user_svc.change_password(current_user.id, data.current_password, data.new_password)
    return MessageResponse(message="Password updated successfully")


# ── Admin ─────────────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedResponse[UserRead], dependencies=[Depends(AdminUser)])
async def list_users(
    user_svc: UserServiceDep,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[UserRead]:
    """[Admin] List all users with pagination."""
    users, total = await user_svc.list_users(page, page_size)
    return PaginatedResponse.create(
        items=[UserRead.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{user_id}", response_model=UserRead, dependencies=[Depends(AdminUser)])
async def get_user(user_id: uuid.UUID, user_svc: UserServiceDep) -> UserRead:
    """[Admin] Get any user by ID."""
    user = await user_svc.get_user(user_id)
    return UserRead.model_validate(user)


@router.delete("/{user_id}", response_model=MessageResponse, dependencies=[Depends(AdminUser)])
async def deactivate_user(user_id: uuid.UUID, user_svc: UserServiceDep) -> MessageResponse:
    """[Admin] Deactivate a user."""
    await user_svc.deactivate_user(user_id)
    return MessageResponse(message="User deactivated")

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = UserRepository(session)

    async def create_user(self, data: UserCreate) -> User:
        if await self._repo.email_exists(data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )
        if await self._repo.username_exists(data.username):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This username is already taken",
            )
        user = User(
            email=data.email,
            username=data.username,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
        )
        return await self._repo.create(user)

    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self._repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    async def get_by_email(self, email: str) -> User | None:
        return await self._repo.get_by_email(email)

    async def list_users(self, page: int, page_size: int) -> tuple[list[User], int]:
        offset = (page - 1) * page_size
        users = await self._repo.get_all(offset=offset, limit=page_size)
        total = await self._repo.count()
        return users, total

    async def update_user(self, user_id: uuid.UUID, data: UserUpdate) -> User:
        user = await self.get_user(user_id)
        updates = data.model_dump(exclude_unset=True)

        if "email" in updates and updates["email"] != user.email:
            if await self._repo.email_exists(updates["email"]):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already in use",
                )
        return await self._repo.update(user, updates)

    async def change_password(
        self, user_id: uuid.UUID, current_password: str, new_password: str
    ) -> None:
        user = await self.get_user(user_id)
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )
        await self._repo.update(user, {"hashed_password": hash_password(new_password)})

    async def deactivate_user(self, user_id: uuid.UUID) -> User:
        user = await self.get_user(user_id)
        return await self._repo.update(user, {"is_active": False})

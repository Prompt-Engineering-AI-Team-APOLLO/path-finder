# Pathfinder — CLAUDE.md

Project-level guidance for Claude Code in this repository.

---

## Project Overview

**Pathfinder** is a monorepo with:
- `backend/` — FastAPI 0.115 + Python 3.12, async-first
- `frontend/` — Frontend application

Backend stack: FastAPI · PostgreSQL 16 · SQLAlchemy 2.0 (async) · Alembic · Redis · Pinecone · structlog · pytest

---

## How to Create a New Backend Service

Follow these steps in order. Use the existing `user` feature as the reference implementation.

### Step 1 — SQLAlchemy Model (`backend/app/models/<name>.py`)

```python
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import BaseModel  # provides id (UUID PK), created_at, updated_at

class MyModel(BaseModel):
    __tablename__ = "my_models"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Add columns here
```

- All models inherit `BaseModel` (UUID PK + timestamps auto-managed).
- Export the model from `backend/app/models/__init__.py` so Alembic picks it up.

---

### Step 2 — Pydantic Schemas (`backend/app/schemas/<name>.py`)

```python
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class MyModelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class MyModelCreate(MyModelBase):
    pass  # add creation-only fields

class MyModelUpdate(BaseModel):
    name: str | None = None  # all fields optional for PATCH

class MyModelRead(MyModelBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}  # enables ORM → Pydantic conversion
```

Naming conventions:
- `*Create` — POST request body
- `*Update` — PATCH request body (all fields optional)
- `*Read` — response body (includes `id`, timestamps)
- `*ReadPublic` — subset safe to expose publicly (omit if not needed)

---

### Step 3 — Repository (`backend/app/repositories/<name>_repository.py`)

```python
from app.db.base import BaseRepository
from app.models.my_model import MyModel

class MyModelRepository(BaseRepository[MyModel]):
    # BaseRepository already provides:
    #   get_by_id(), get_all(), count(), create(), update(), delete()

    async def get_by_name(self, name: str) -> MyModel | None:
        from sqlalchemy import select
        result = await self._session.execute(
            select(MyModel).where(MyModel.name == name)
        )
        return result.scalar_one_or_none()
```

Only add methods that go beyond the generic CRUD provided by `BaseRepository`.

---

### Step 4 — Service (`backend/app/services/<name>_service.py`)

```python
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.my_model_repository import MyModelRepository
from app.schemas.my_model import MyModelCreate, MyModelUpdate
from app.models.my_model import MyModel
from app.core.logging import get_logger

logger = get_logger(__name__)

class MyModelService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = MyModelRepository(session)

    async def create(self, data: MyModelCreate) -> MyModel:
        obj = MyModel(**data.model_dump())
        return await self._repo.create(obj)

    async def get(self, obj_id: uuid.UUID) -> MyModel:
        obj = await self._repo.get_by_id(obj_id)
        if not obj:
            raise HTTPException(status_code=404, detail="MyModel not found")
        return obj

    async def update(self, obj_id: uuid.UUID, data: MyModelUpdate) -> MyModel:
        obj = await self.get(obj_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        return await self._repo.update(obj)

    async def delete(self, obj_id: uuid.UUID) -> None:
        obj = await self.get(obj_id)
        await self._repo.delete(obj)
```

Rules:
- Constructor takes `AsyncSession`, creates `self._repo`.
- All methods are `async`.
- Raise `HTTPException` for user-visible errors (with `status_code` + `detail`).
- Use `model_dump(exclude_unset=True)` for PATCH to avoid overwriting with `None`.

---

### Step 5 — Dependency Injection (`backend/app/api/deps.py`)

Add at the bottom of `deps.py`:

```python
from app.services.my_model_service import MyModelService

def get_my_model_service(db: DBDep) -> MyModelService:
    return MyModelService(db)

MyModelServiceDep = Annotated[MyModelService, Depends(get_my_model_service)]
```

---

### Step 6 — API Endpoint (`backend/app/api/v1/endpoints/<name>.py`)

```python
import uuid
from typing import Annotated
from fastapi import APIRouter, status
from app.api.deps import MyModelServiceDep, CurrentUser
from app.schemas.my_model import MyModelCreate, MyModelUpdate, MyModelRead

router = APIRouter(prefix="/my-models", tags=["my-models"])

@router.post("", response_model=MyModelRead, status_code=status.HTTP_201_CREATED)
async def create_my_model(
    data: MyModelCreate,
    svc: MyModelServiceDep,
    _: CurrentUser,  # require authentication; remove if public
) -> MyModelRead:
    """Create a new MyModel."""
    obj = await svc.create(data)
    return MyModelRead.model_validate(obj)

@router.get("/{obj_id}", response_model=MyModelRead)
async def get_my_model(
    obj_id: uuid.UUID,
    svc: MyModelServiceDep,
    _: CurrentUser,
) -> MyModelRead:
    """Fetch a single MyModel by ID."""
    obj = await svc.get(obj_id)
    return MyModelRead.model_validate(obj)

@router.patch("/{obj_id}", response_model=MyModelRead)
async def update_my_model(
    obj_id: uuid.UUID,
    data: MyModelUpdate,
    svc: MyModelServiceDep,
    _: CurrentUser,
) -> MyModelRead:
    """Partially update a MyModel."""
    obj = await svc.update(obj_id, data)
    return MyModelRead.model_validate(obj)

@router.delete("/{obj_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_model(
    obj_id: uuid.UUID,
    svc: MyModelServiceDep,
    _: CurrentUser,
) -> None:
    """Delete a MyModel."""
    await svc.delete(obj_id)
```

- Always use `model_validate(orm_obj)` to convert ORM → response schema.
- Authenticated endpoints receive `CurrentUser` (or `AdminUser`) from `deps.py`.
- Public endpoints omit the `CurrentUser` dependency.

---

### Step 7 — Register the Router (`backend/app/api/v1/router.py`)

```python
from app.api.v1.endpoints import my_model  # import the new module

api_router.include_router(my_model.router)
```

---

### Step 8 — Alembic Migration

```bash
cd backend
alembic revision --autogenerate -m "add_my_model"
alembic upgrade head
```

Review the generated file in `migrations/versions/` before running — autogenerate sometimes misses FK constraints or index names.

---

## Checklist for a New Service

- [ ] Model in `models/<name>.py` (inherits `BaseModel`)
- [ ] Model exported from `models/__init__.py`
- [ ] Schemas in `schemas/<name>.py` (`Create`, `Update`, `Read`)
- [ ] Repository in `repositories/<name>_repository.py`
- [ ] Service in `services/<name>_service.py`
- [ ] Dependency registered in `api/deps.py`
- [ ] Endpoint router in `api/v1/endpoints/<name>.py`
- [ ] Router included in `api/v1/router.py`
- [ ] Alembic migration generated and reviewed
- [ ] Tests in `tests/` (mirror the `tests/services/` and `tests/api/` structure)

---

## Key Conventions

| Topic | Convention |
|---|---|
| Async | Every function that touches the DB or an external API must be `async def` |
| Error handling | Raise `HTTPException` (status code + detail string) — never return error dicts |
| Logging | `from app.core.logging import get_logger; logger = get_logger(__name__)` |
| Settings | `from app.core.config import settings` — never read `os.environ` directly |
| ORM → Pydantic | Always use `SchemaClass.model_validate(orm_obj)` |
| PATCH semantics | Use `model_dump(exclude_unset=True)` so missing fields are not overwritten |
| File naming | `snake_case.py` for files, `PascalCase` for classes |
| Section dividers | `# ── Section Name ──` for readability inside longer files |

---

## Running the Backend Locally

```bash
cd backend
docker compose up -d          # start Postgres + Redis
source ../venv/bin/activate
uvicorn app.main:app --reload  # hot-reload dev server at http://localhost:8000
```

Docs available at `http://localhost:8000/docs` (Swagger) and `/redoc`.

---

## Running Tests

```bash
cd backend
pytest                         # all tests
pytest tests/services/         # service layer only
pytest -x -q                   # stop on first failure, minimal output
```

Tests use SQLite in-memory (no Docker needed).

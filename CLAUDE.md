# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Pathfinder — CLAUDE.md

**Pathfinder** is a monorepo with:
- `backend/` — FastAPI 0.115 + Python 3.12, async-first
- `frontend/` — React 19 + Vite + TypeScript + Tailwind CSS 4

Backend stack: FastAPI · PostgreSQL 16 · SQLAlchemy 2.0 (async) · Alembic · Redis · OpenAI · Pinecone · structlog · pytest

---

## Running the Backend

```bash
cd backend
docker compose up -d          # start Postgres + Redis
source ../venv/bin/activate
make dev                      # hot-reload dev server at http://localhost:8001
```

Swagger docs at `http://localhost:8001/docs` (disabled in production).

**Key make targets** (run from `backend/`):

| Command | Description |
|---|---|
| `make dev` | Start uvicorn with hot-reload on port 8001 |
| `make test` | Run full test suite |
| `make test-cov` | Tests + HTML coverage report (`htmlcov/index.html`) |
| `make lint` | flake8 + mypy |
| `make format` | black + isort |
| `make migrate` | Run pending Alembic migrations |
| `make migrate-new msg="..."` | Autogenerate a new migration |
| `make migrate-down` | Roll back one migration |

## Running Tests

```bash
cd backend
pytest                                    # all tests
pytest tests/services/                   # service layer only
pytest tests/api/                        # API layer only
pytest -x -q                             # stop on first failure, minimal output
pytest tests/api/test_flights.py -k "search"  # single test by keyword
```

Tests use SQLite in-memory (no Docker needed). Available fixtures in `conftest.py`: `client` (AsyncClient with DB override), `db_session`, `user_payload`.

## Running the Frontend

```bash
cd frontend
npm install
npm run dev      # Vite dev server
npm run build    # TypeScript check + Vite build
npm run lint     # ESLint
```

---

## Architecture

### Backend layers (request path)

```
HTTP request
  → Middleware (ErrorHandlerMiddleware, RequestLoggerMiddleware, CORSMiddleware)
  → Router  app/api/v1/router.py
  → Endpoint  app/api/v1/endpoints/<name>.py
  → Service  app/services/<name>_service.py
  → Repository  app/repositories/<name>_repository.py
  → SQLAlchemy model  app/models/<name>.py
```

- **`app/api/deps.py`** — all dependency injection lives here. `CurrentUser`, `AdminUser`, and `*ServiceDep` type aliases are imported directly by endpoints.
- **`app/core/config.py`** — all settings via `settings` singleton; never read `os.environ` directly.
- **`app/db/base.py`** — `BaseModel` (UUID PK + timestamps) and `BaseRepository[T]` (generic CRUD: `get_by_id`, `get_all`, `count`, `create`, `update`, `delete`).

### AI & Vector services

- **`AIService`** (`app/services/ai_service.py`) — thin async wrapper over `AsyncOpenAI`. Provides `chat()`, `chat_stream()`, and `embed()`. Configured via `settings.OPENAI_MODEL / OPENAI_TEMPERATURE / OPENAI_MAX_TOKENS`.
- **`VectorService`** (`app/services/vector_service.py`) — Pinecone-backed vector store wrapping `AIService.embed()`. Gracefully degrades to no-op when `PINECONE_API_KEY` is unset. Supports `upsert`, `search`, `delete`.
- **`FlightService`** / **`flight_mock_provider`** — flights use deterministic mock data; same search query always returns the same offers. No external API call.

### Frontend

The frontend uses **manual state-based navigation** (no React Router). `App.tsx` holds `page` state (`'login' | 'home' | 'plan' | 'confirm'`) and renders the matching page component. There's a dev-only page-switcher nav bar rendered in production builds as well — remove before shipping.

Auth state is stored in `localStorage` or `sessionStorage` under key `pathfinder_auth_session` depending on the "remember me" checkbox.

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
```

Export the model from `backend/app/models/__init__.py` so Alembic picks it up.

### Step 2 — Pydantic Schemas (`backend/app/schemas/<name>.py`)

```python
import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class MyModelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class MyModelCreate(MyModelBase):
    pass

class MyModelUpdate(BaseModel):
    name: str | None = None  # all fields optional for PATCH

class MyModelRead(MyModelBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
```

### Step 3 — Repository (`backend/app/repositories/<name>_repository.py`)

```python
from app.db.base import BaseRepository
from app.models.my_model import MyModel

class MyModelRepository(BaseRepository[MyModel]):
    # BaseRepository provides: get_by_id(), get_all(), count(), create(), update(), delete()
    pass
```

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
        return await self._repo.create(MyModel(**data.model_dump()))

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
        await self._repo.delete(await self.get(obj_id))
```

### Step 5 — Dependency Injection (`backend/app/api/deps.py`)

```python
from app.services.my_model_service import MyModelService

def get_my_model_service(db: DBDep) -> MyModelService:
    return MyModelService(db)

MyModelServiceDep = Annotated[MyModelService, Depends(get_my_model_service)]
```

### Step 6 — API Endpoint (`backend/app/api/v1/endpoints/<name>.py`)

```python
import uuid
from fastapi import APIRouter, status
from app.api.deps import MyModelServiceDep, CurrentUser
from app.schemas.my_model import MyModelCreate, MyModelUpdate, MyModelRead

router = APIRouter(prefix="/my-models", tags=["my-models"])

@router.post("", response_model=MyModelRead, status_code=status.HTTP_201_CREATED)
async def create_my_model(data: MyModelCreate, svc: MyModelServiceDep, _: CurrentUser) -> MyModelRead:
    return MyModelRead.model_validate(await svc.create(data))

@router.get("/{obj_id}", response_model=MyModelRead)
async def get_my_model(obj_id: uuid.UUID, svc: MyModelServiceDep, _: CurrentUser) -> MyModelRead:
    return MyModelRead.model_validate(await svc.get(obj_id))

@router.patch("/{obj_id}", response_model=MyModelRead)
async def update_my_model(obj_id: uuid.UUID, data: MyModelUpdate, svc: MyModelServiceDep, _: CurrentUser) -> MyModelRead:
    return MyModelRead.model_validate(await svc.update(obj_id, data))

@router.delete("/{obj_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_model(obj_id: uuid.UUID, svc: MyModelServiceDep, _: CurrentUser) -> None:
    await svc.delete(obj_id)
```

- Use `model_validate(orm_obj)` to convert ORM → response schema.
- Authenticated endpoints receive `CurrentUser` (or `AdminUser`) from `deps.py`.
- Public endpoints omit the `CurrentUser` dependency.

### Step 7 — Register the Router (`backend/app/api/v1/router.py`)

```python
from app.api.v1.endpoints import my_model
api_router.include_router(my_model.router)
```

### Step 8 — Alembic Migration

```bash
cd backend
make migrate-new msg="add_my_model"   # or: alembic revision --autogenerate -m "..."
make migrate                           # apply
```

Review the generated file in `migrations/versions/` — autogenerate sometimes misses FK constraints or index names.

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

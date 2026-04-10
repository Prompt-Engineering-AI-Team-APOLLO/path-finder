# Pathfinder — Tech Stack & Architecture Understanding

> This document captures a complete understanding of the Pathfinder project's initial setup, tech stack, architecture patterns, and conventions. It serves as the single reference for all future development on this codebase.

---

## 1. Product Vision (TL;DR)

**Pathfinder** is an AI-powered travel agent that personalizes trip planning, generates optimized itineraries, and adapts them in real-time. Unlike generic travel tools, it:

- Understands user personality and preferences
- Explains trade-offs behind its decisions
- Replans dynamically on weather, delays, fatigue, or closures

**Core MVP features**: destination/date/budget intake → smart itinerary generation → curated flights/hotels/restaurants → real-time adaptive replanning.

---

## 2. Repository Structure

```
path-finder/
├── backend/                    # Python FastAPI application
│   ├── app/
│   │   ├── api/               # HTTP interface layer
│   │   │   ├── deps.py        # Dependency injection (auth, DB session)
│   │   │   └── v1/
│   │   │       ├── router.py  # API v1 route aggregator
│   │   │       └── endpoints/ # auth.py | users.py | health.py | ai.py
│   │   ├── core/              # Cross-cutting concerns
│   │   │   ├── config.py      # Pydantic Settings (env-driven)
│   │   │   ├── security.py    # JWT + bcrypt
│   │   │   ├── constants.py   # App-wide constants
│   │   │   └── logging.py     # structlog setup
│   │   ├── db/                # Database session & base models
│   │   │   ├── base.py        # DeclarativeBase + UUID/Timestamp mixins
│   │   │   └── session.py     # Async engine + get_db dependency
│   │   ├── models/            # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   └── conversation.py
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── auth.py
│   │   │   ├── ai.py
│   │   │   └── common.py
│   │   ├── services/          # Business logic layer
│   │   │   ├── user_service.py
│   │   │   ├── auth_service.py
│   │   │   ├── ai_service.py
│   │   │   └── vector_service.py
│   │   ├── repositories/      # DB query abstraction (generic CRUD)
│   │   │   ├── base.py
│   │   │   └── user.py
│   │   ├── middleware/        # ASGI middleware
│   │   │   ├── error_handler.py
│   │   │   └── request_logger.py
│   │   ├── utils/
│   │   │   └── pagination.py
│   │   └── main.py            # FastAPI app factory
│   ├── migrations/            # Alembic (no versions yet — initial setup)
│   ├── tests/                 # pytest test suite
│   ├── scripts/               # entrypoint.sh, setup, run scripts
│   ├── Dockerfile             # Multi-stage: builder → dev → production
│   ├── docker-compose.yml     # API + PostgreSQL + Redis
│   ├── requirements.txt       # Production dependencies
│   ├── requirements-dev.txt   # Dev/test dependencies
│   ├── pyproject.toml         # black, isort, mypy, pytest config
│   ├── alembic.ini
│   ├── .env.example
│   ├── .pre-commit-config.yaml
│   ├── Makefile
│   └── README.md
│
├── frontend/                   # React + TypeScript + Vite
│   ├── src/
│   │   ├── main.tsx           # React root mount
│   │   ├── App.tsx            # Root component (template only, to be built)
│   │   ├── App.css
│   │   └── index.css
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json          # Root TS config
│   ├── tsconfig.app.json      # App TS config (strict, ES2023)
│   ├── tsconfig.node.json     # Node TS config (for Vite)
│   ├── eslint.config.js       # Flat ESLint config
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── product_overview.md    # Product vision & feature spec
│   └── tech-stack-understanding.md  ← this file
│
└── .gitignore
```

---

## 3. Full Tech Stack

### Backend

| Concern | Technology | Version |
|---|---|---|
| Framework | FastAPI | 0.115.6 |
| Language | Python | 3.12 |
| ASGI Server | Uvicorn | latest |
| Database | PostgreSQL | 16 (Docker: postgres:16-alpine) |
| ORM | SQLAlchemy 2.0 (async) | latest |
| Migrations | Alembic | 1.14.0 |
| Cache | Redis | 7 (Docker: redis:7-alpine) |
| Auth | python-jose (JWT) + passlib/bcrypt | 3.3.0 / 4.2.1 |
| AI / LLM | OpenAI SDK (GPT-4o) | 1.57.2 |
| Embeddings | OpenAI text-embedding-3-small | — |
| Vector DB | Pinecone (optional, graceful fallback) | 5.0.1 |
| HTTP Client | httpx | 0.27.2 |
| Validation | Pydantic v2 | — |
| Logging | structlog | 24.4.0 |
| Testing | pytest + pytest-asyncio | 8.3.4 / 0.24.0 |
| Formatting | black (line-length=100) + isort | 24.10.0 / 5.13.2 |
| Type Checking | mypy (strict) | 1.13.0 |
| Containerisation | Docker + Docker Compose V2 | latest |

### Frontend

| Concern | Technology | Version |
|---|---|---|
| UI Library | React | ^19.2.4 |
| Language | TypeScript | ~5.9.3 |
| Build Tool | Vite | ^8.0.1 |
| Linting | ESLint (flat config) | ^9.39.4 |

> **Frontend is a blank slate.** The current `App.tsx` is the Vite default counter template. All UI components, routing, state management, and API integration are yet to be built.

---

## 4. Backend Architecture Deep-Dive

### 4.1 Layered Architecture

```
HTTP Request
    ↓
Middleware (ErrorHandler → RequestLogger)
    ↓
API Endpoint (api/v1/endpoints/*.py)
    ↓
Service Layer (services/*.py)  ← business logic lives here
    ↓
Repository Layer (repositories/*.py)  ← DB query abstraction
    ↓
SQLAlchemy Models (models/*.py)
    ↓
PostgreSQL (async)
```

AI calls go: Endpoint → AIService → OpenAI API (AsyncOpenAI singleton)
Vector calls go: Endpoint → VectorService → Pinecone (with fallback)

### 4.2 Database Models

**User** (`models/user.py`)
- UUID PK, created_at, updated_at (via mixins)
- `email` — unique, indexed
- `username` — unique, indexed
- `full_name`
- `hashed_password`
- `role` — default: `"user"` (also: `"admin"`, `"guest"`)
- `is_active`, `is_verified`
- Relationship: `conversations` (cascade delete-orphan)

**Conversation** (`models/conversation.py`)
- UUID PK + timestamps
- `user_id` — FK → users (cascade delete)
- `title`, `summary`
- Relationship: `messages` (cascade delete, ordered by `created_at`)

**Message** (`models/conversation.py`)
- UUID PK + timestamps
- `conversation_id` — FK → conversations (cascade delete)
- `role` — `user | assistant | system`
- `content` (text)
- `tokens_used`, `model`

### 4.3 API Endpoints (v1 — prefix: `/api/v1`)

#### Auth (`/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Email/password → access + refresh tokens |
| POST | `/auth/refresh` | Public | Refresh token → new access token |

#### Users (`/users`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users` | Public | Register new user |
| GET | `/users/me` | User | Get own profile |
| PATCH | `/users/me` | User | Update email/full_name |
| POST | `/users/me/password` | User | Change password |
| GET | `/users` | Admin | List all users (paginated) |
| GET | `/users/{user_id}` | Admin | Get user by ID |
| DELETE | `/users/{user_id}` | Admin | Deactivate user |

#### AI (`/ai`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ai/chat` | User | Chat with travel assistant (blocking) |
| POST | `/ai/chat/stream` | User | Streaming chat response (SSE) |
| POST | `/ai/embed` | User | Generate text embeddings |
| POST | `/ai/search` | User | Semantic vector search |

#### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness probe |
| GET | `/health/ready` | Public | Readiness probe (DB check) |

### 4.4 Auth & Security

**JWT Tokens**
- Algorithm: `HS256`
- Access token: 30 minutes — claims: `sub`, `type`, `iat`, `exp`, `role`, `email`
- Refresh token: 7 days — claims: `sub`, `type`, `iat`, `exp`

**Password Policy**
- bcrypt with 12 rounds
- Min 8, max 128 characters
- Must contain: at least one uppercase letter + one digit

**RBAC**
- `require_role("admin")` factory creates FastAPI dependencies
- `AdminUser` type alias used on admin endpoints
- Standard authenticated routes use `get_current_user`

**CORS**
- Origins: `http://localhost:3000`, `http://localhost:5173` (Vite dev default)

### 4.5 AI Service

- **Model**: `gpt-4o`
- **Embedding model**: `text-embedding-3-small`
- **Max context window**: 128k tokens
- **Default system prompt**: Travel assistant personality (defined in constants)
- **Max tokens per response**: configured via settings
- **Temperature**: configurable, defaults in settings
- **Client**: `AsyncOpenAI` singleton (reused across requests)
- **Streaming**: Uses `async for chunk in stream` — SSE to frontend

### 4.6 Vector Service (Pinecone)

- Optional integration — app starts without it
- Used for semantic search over travel data/recommendations
- `top_k` default: 5 results
- `score_threshold` default: 0.75
- Supports namespaces for multi-tenant data isolation
- Embeddings generated by AIService then passed to VectorService

### 4.7 Middleware Stack (LIFO — last added, first executed)

```
1. ErrorHandlerMiddleware   — catches all unhandled exceptions → JSON response
2. RequestLoggerMiddleware  — structured log per request + X-Request-ID header
```

RequestLogger skips `/health` endpoints to reduce noise.

### 4.8 Configuration (`.env` driven)

All config in `core/config.py` via Pydantic `BaseSettings`. Key groups:

| Group | Key vars |
|---|---|
| App | `APP_NAME`, `APP_VERSION`, `ENVIRONMENT` |
| Server | `HOST`, `PORT`, `WORKERS` |
| Security | `SECRET_KEY`, `ALGORITHM`, token expiry |
| Database | `DATABASE_URL` (async postgresql+asyncpg://...) |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL` |
| Pinecone | `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX_NAME` |
| Redis | `REDIS_URL`, `CACHE_TTL` |
| Logging | `LOG_LEVEL`, `LOG_FORMAT` (json in prod, text in dev) |
| Email | SMTP settings (for future verification flows) |

### 4.9 Repository Pattern

`BaseRepository[T]` in `repositories/base.py`:
- Generic over SQLAlchemy model type
- Methods: `get`, `get_multi`, `create`, `update`, `delete`, `count`, `exists`
- All methods are `async`
- `UserRepository` extends it with `get_by_email`, `get_by_username`

### 4.10 Logging

- **Library**: structlog
- **Dev**: colored, human-readable console output
- **Production**: JSON structured logs
- **Context**: request ID threaded via contextvars
- **Noisy loggers silenced**: `uvicorn.access`, `sqlalchemy.engine`

### 4.11 Constants (key values)

| Constant | Value |
|---|---|
| Default page size | (defined in constants) |
| Max page size | (defined in constants) |
| Rate limit | 100 req / 60 sec |
| Embedding batch size | (defined in constants) |
| Vector similarity top-k | 5 |
| Vector score threshold | 0.75 |
| Password min length | 8 |
| Password max length | 128 |

---

## 5. Frontend Architecture

### Current State
The frontend is a **fresh Vite + React + TypeScript scaffold**. `App.tsx` contains only the Vite boilerplate counter. Everything is to be built from scratch on top of this foundation.

### TypeScript Configuration
- **Target**: ES2023
- **Module resolution**: Bundler (Vite-native)
- **JSX**: react-jsx (no React import needed)
- **Strict mode**: on
- `noUnusedLocals`, `noUnusedParameters`: on

### Dev Server
- Vite dev server defaults to `http://localhost:5173`
- Backend CORS already allows this origin

### ESLint
- Flat config format (`eslint.config.js`)
- Plugins: `@typescript-eslint`, `react-hooks`, `react-refresh`

---

## 6. Infrastructure / DevOps

### Docker Compose Services

| Service | Image | Port | Purpose |
|---|---|---|---|
| api | Custom (Dockerfile) | 127.0.0.1:8000 | FastAPI backend |
| db | postgres:16-alpine | 5432 | Primary database |
| redis | redis:7-alpine | 6379 | Cache / session store |

API depends on `db` (healthy) and `redis` (healthy) before starting.
Hot reload: `app/`, `migrations/`, `alembic.ini` volumes mounted.

### Dockerfile Stages

| Stage | Base | Purpose |
|---|---|---|
| builder | python:3.12-slim | Compile wheels (gcc, libpq-dev) |
| development | python:3.12-slim | Installs dev deps, hot reload via uvicorn --reload |
| production | python:3.12-slim | Copies wheels, non-root user `appuser:1001`, 2 workers |

Entrypoint: `scripts/entrypoint.sh` (runs migrations then starts server)

### Makefile Commands

| Command | Action |
|---|---|
| `make dev` | Run dev server (port 8001) |
| `make test` | Run pytest |
| `make test-cov` | pytest with coverage |
| `make lint` | flake8 + mypy |
| `make format` | black + isort |
| `make migrate` | `alembic upgrade head` |
| `make migrate-new` | Generate new migration |
| `make docker-up` | `docker compose up -d` |
| `make docker-down` | `docker compose down` |
| `make secret` | Generate `SECRET_KEY` |

---

## 7. Pydantic Schemas (API Contract)

### User
- `UserCreate` — `email`, `username`, `full_name`, `password` (validated: uppercase + digit)
- `UserUpdate` — optional `email`, `full_name`
- `UserRead` — full profile including timestamps
- `UserReadPublic` — safe public subset: `id`, `username`, `full_name`
- `UserUpdatePassword` — `current_password`, `new_password`

### Auth
- `LoginRequest` — `email`, `password`
- `LoginResponse` — `TokenResponse` + `UserRead`
- `TokenResponse` — `access_token`, `refresh_token`, `token_type`, `expires_in`
- `RefreshRequest` — `refresh_token`

### AI
- `ChatMessage` — `role` (`user|assistant|system`), `content`
- `ChatRequest` — `messages[]`, optional `conversation_id`, `stream`, `temperature`, `max_tokens`
- `ChatResponse` — `content`, `conversation_id`, `message_id`, `model`, `tokens_used`
- `EmbeddingRequest` — `texts[]`
- `EmbeddingResponse` — `embeddings[]`, `model`, `tokens_used`
- `VectorSearchRequest` — `query`, `top_k`, `score_threshold`, `namespace`
- `VectorSearchResponse` — `results[]`, `query`
- `VectorSearchResult` — `id`, `score`, `metadata`

### Common
- `PaginatedResponse[T]` — generic: `items[]`, `total`, `page`, `pages`
- `PaginationParams` — `page`, `page_size`
- `HealthResponse` — `status`, `version`, `environment`
- `MessageResponse` — `message`

---

## 8. Design Patterns & Conventions

| Pattern | Where Used |
|---|---|
| Dependency Injection | FastAPI `Depends()` for DB session, current user, services |
| Repository Pattern | `BaseRepository[T]` — generic async CRUD over any model |
| Service Layer | All business logic in `services/`, endpoints are thin |
| Middleware Stack | ASGI middleware for cross-cutting concerns (logging, errors) |
| Async-first | SQLAlchemy async, AsyncOpenAI, async generators for streaming |
| Pydantic for I/O | All request validation and response serialisation via schemas |
| Structured Logging | structlog with request ID context var threaded through all logs |
| JWT Refresh Pattern | Short-lived access + long-lived refresh tokens |
| RBAC via DI | `require_role("admin")` factory returns a reusable FastAPI dependency |
| Generic Pagination | `PaginatedResponse[T]` reused across all list endpoints |
| Vector DB Abstraction | Pinecone abstracted behind `VectorService` with graceful fallback |
| Multi-stage Docker | Separate builder/dev/prod stages for image optimisation |
| Pre-commit Hooks | black, isort, trailing-whitespace, check-yaml on every commit |

---

## 9. What Is NOT Yet Built

- **Frontend UI**: Everything. Routing, components, state management, API client — all TBD.
- **Alembic migrations**: No version files yet. `alembic upgrade head` on a fresh DB will be the first migration.
- **Tests**: Test folder exists but no tests written yet.
- **Real travel data / integrations**: No flight/hotel/restaurant APIs wired yet.
- **Email verification flow**: SMTP configured in settings but no email service code exists.
- **Redis usage**: Cache infrastructure is provisioned but no caching logic is implemented yet.
- **Rate limiting**: Defined in constants (100 req/60s) but no enforcement middleware exists yet.
- **Frontend state management library**: Not chosen yet (Zustand, Redux Toolkit, TanStack Query — TBD).
- **Frontend routing**: No router configured yet (likely React Router v7 or TanStack Router).

---

## 10. Technology Decisions — Fixed (Do Not Change)

Per project mandate, the following are locked:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Python + FastAPI
- **Database**: PostgreSQL + SQLAlchemy (async)
- **AI**: OpenAI (GPT-4o + text-embedding-3-small)

Everything within these constraints (libraries, component patterns, state management) is open for decision as features are built.

---

## 11. Quick Start Reference

```bash
# Backend (Docker — recommended)
cd backend
cp .env.example .env          # fill in OPENAI_API_KEY and SECRET_KEY
docker compose up --build
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc

# Backend (local)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
# Dev server: http://localhost:5173
```

---

*Last updated: 2026-04-02 — Initial project setup review*

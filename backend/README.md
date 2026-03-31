# ✈️ Pathfinder API

AI-powered flight search backend — finds the cheapest and best flights based on user preferences (budget, dates, airlines, flexibility) using LLMs and semantic search.

Built with **FastAPI** · **PostgreSQL** · **Redis** · **OpenAI** · **Docker**

---

## Quick Start (Docker — recommended)

> Requires [Docker Desktop](https://docs.docker.com/get-docker/) (Mac / Windows / Linux).

```bash
git clone <repo-url>
cd backend

cp .env.example .env
# Open .env and set OPENAI_API_KEY and SECRET_KEY (see Configuration section)

docker compose up --build
```

**That's it.** The entrypoint script automatically:
1. Waits for Postgres to be ready
2. Runs Alembic migrations
3. Starts the FastAPI server with hot-reload

| Service | URL |
|---------|-----|
| **API docs (Swagger)** | http://localhost:8000/docs |
| **API base URL** | http://localhost:8000/api/v1 |
| **Postgres** | `localhost:5432` (user: `postgres`, pass: `postgres`, db: `pathfinder`) |
| **Redis** | `localhost:6379` |

---

## Scripts

### Mac / Linux

```bash
sh scripts/setup.sh           # first-time setup (copies .env, builds, starts)

./scripts/run.sh              # build + start all services (default)
./scripts/run.sh stop         # stop all services
./scripts/run.sh logs         # tail API logs
./scripts/run.sh migrate      # run Alembic migrations inside Docker
./scripts/run.sh shell        # open shell inside API container
./scripts/run.sh test         # run pytest inside Docker
./scripts/run.sh reset        # ⚠️  destroy containers + volumes (deletes DB data)
```

### Windows (PowerShell)

```powershell
.\scripts\run.ps1             # build + start
.\scripts\run.ps1 stop        # stop
.\scripts\run.ps1 logs        # tail logs
.\scripts\run.ps1 migrate     # run migrations
.\scripts\run.ps1 shell       # open shell
.\scripts\run.ps1 test        # run tests
.\scripts\run.ps1 reset       # destroy everything
```

---

## Configuration

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | **Yes** | JWT signing key — `openssl rand -hex 32` |
| `OPENAI_API_KEY` | **Yes** | Your OpenAI API key (`sk-...`) |
| `DATABASE_URL` | Auto-set | Overridden by Docker Compose — keep default |
| `REDIS_URL` | Auto-set | Overridden by Docker Compose — keep default |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `PINECONE_API_KEY` | No | Leave blank to disable vector search |
| `ENVIRONMENT` | No | `development` / `production` / `test` |

> **Docker note**: `DATABASE_URL` and `REDIS_URL` are automatically overridden by
> `docker-compose.yml` to use internal hostnames (`db`, `redis`). Your `.env` values
> are used when running locally without Docker.

---

## Database Migrations

Migrations run **automatically on startup** via the entrypoint script.

To run manually (useful when changing models):

```bash
# Inside Docker
docker compose exec api alembic upgrade head

# Create a new migration after editing models
docker compose exec api alembic revision --autogenerate -m "add flights table"

# Rollback one migration
docker compose exec api alembic downgrade -1

# Show migration history
docker compose exec api alembic history
```

---

## API Overview

All endpoints are prefixed with `/api/v1`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Login → returns access + refresh tokens |
| `POST` | `/auth/refresh` | Exchange refresh token for new access token |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/users` | Public | Register new user |
| `GET` | `/users/me` | Bearer | Get your profile |
| `PATCH` | `/users/me` | Bearer | Update your profile |
| `POST` | `/users/me/password` | Bearer | Change password |

### AI (Flight Assistant)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/ai/chat` | Bearer | Chat with flight assistant |
| `POST` | `/ai/chat/stream` | Bearer | Streaming response (SSE) |
| `POST` | `/ai/embed` | Bearer | Generate text embeddings |
| `POST` | `/ai/search` | Bearer | Semantic vector search |

### Health
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe (checks DB) |

---

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py              # Dependency injection (auth, services)
│   │   └── v1/
│   │       ├── router.py        # Aggregates all routers
│   │       └── endpoints/
│   │           ├── auth.py
│   │           ├── users.py
│   │           ├── ai.py        # Chat, embeddings, vector search
│   │           └── health.py
│   ├── core/
│   │   ├── config.py            # Pydantic Settings (env vars)
│   │   ├── security.py          # JWT + bcrypt
│   │   ├── constants.py         # App-wide constants
│   │   └── logging.py           # Structured logging (structlog)
│   ├── db/
│   │   ├── base.py              # SQLAlchemy base + UUID/timestamp mixins
│   │   └── session.py           # Async engine + get_db() dependency
│   ├── models/                  # SQLAlchemy ORM models
│   ├── schemas/                 # Pydantic request/response schemas
│   ├── services/                # Business logic (user, auth, AI, vector)
│   ├── repositories/            # DB query abstraction layer
│   ├── middleware/              # Error handler, request logger
│   └── main.py                  # App factory + middleware stack
├── migrations/                  # Alembic migration files
├── tests/
│   ├── conftest.py              # SQLite in-memory fixtures
│   ├── unit/
│   └── integration/
├── scripts/
│   ├── entrypoint.sh            # Docker entrypoint (wait-for-db + migrate)
│   ├── run.sh                   # Mac/Linux CLI helper
│   ├── run.ps1                  # Windows CLI helper
│   └── setup.sh                 # First-time setup
├── Dockerfile                   # Multi-stage: development + production
├── docker-compose.yml
├── .env.example
├── alembic.ini
├── requirements.txt
└── requirements-dev.txt
```

---

## Running Tests

```bash
# Inside Docker (no local Python needed)
docker compose exec api pytest

# With coverage
docker compose exec api pytest --cov=app --cov-report=term-missing
```

Tests use an **in-memory SQLite database** — no Postgres connection needed.

---

## Local Development (without Docker)

> Only for advanced users. Docker is the recommended approach.

**Requirements**: Python 3.11+, PostgreSQL running locally, Redis running locally.

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

pip install -r requirements-dev.txt
pre-commit install

# Update .env: change DATABASE_URL and REDIS_URL to use localhost
# DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pathfinder
# REDIS_URL=redis://localhost:6379/0

alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Production Deployment

1. Change `target: development` to `target: production` in `docker-compose.yml`
2. Set `ENVIRONMENT=production` in `.env` (disables Swagger docs)
3. Set a strong `SECRET_KEY`
4. Use a managed Postgres (e.g., AWS RDS, Supabase) and update `DATABASE_URL`

```bash
docker compose up --build -d
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 + Python 3.12 |
| Database | PostgreSQL 16 + SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Cache | Redis 7 |
| Auth | JWT (python-jose) + bcrypt |
| AI | OpenAI (GPT-4o, text-embedding-3-small) |
| Vector DB | Pinecone (optional) |
| Logging | structlog (JSON in prod, colored text in dev) |
| Testing | pytest + pytest-asyncio + SQLite in-memory |
| Containers | Docker + Docker Compose V2 |

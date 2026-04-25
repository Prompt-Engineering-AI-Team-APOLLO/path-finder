# Pathfinder — Demo Day Pitch
### 5-Minute Investor Pitch | Two Speakers

---

## SPEAKER GUIDE

- **[A]** = Speaker A — opens, closes, handles tech snapshot
- **[B]** = Speaker B — product story, AI deep-dive, drives demo
- Timings are targets, not hard stops
- Keep the tone conversational — this is a pitch, not a lecture

---

## [0:00 – 0:40] THE PROBLEM  *(Speaker A)*

> "Booking a flight in 2026 still feels like filing a tax return."

You open a tab, pick an aggregator, filter through 200 results, open 6 airline tabs, find out the cheap seat has a 14-hour layover — and by the time you're ready, the price changed.

That's not a UX problem. It's a **broken workflow**. The information is all there, but there's no intelligent layer in front of it.

**Pathfinder** puts one there.

---

## [0:40 – 1:20] WHAT WE BUILT  *(Speaker B)*

Pathfinder is a flight booking platform with a conversational AI co-pilot at its core.

You talk to it the way you'd talk to a travel agent:

> *"I want to fly from New York to London next Friday, business class."*

It searches. It shows you options. You say *"book the second one."* It books — confirmed, reference number, done. No forms. No filters. No extra tabs.

And it doesn't stop there. You can modify, cancel, or check any booking — all in the same conversation.

---

## [1:20 – 2:10] HOW THE AI WORKS  *(Speaker B)*

This is where it gets interesting.

The assistant isn't a chatbot with canned responses. It's a **function-calling agent** running on GPT-4o.

When you send a message, the model doesn't just reply — it decides *what to do*. It can call tools: `search_flights`, `book_flight`, `modify_booking`, `cancel_booking`, `get_booking`. It executes them against our backend, reads the results, and streams a response back in real time.

The loop:

> User message → Agent → LLM decides → Tool call → Result → LLM streams reply → You

No hallucinated prices. No fake confirmations. Every booking reference you see came from a real system call. The agent is explicitly constrained to report only what the tools return.

We stream responses token-by-token over Server-Sent Events — so it feels instant.

---

## [2:10 – 3:50] LIVE DEMO  *(B drives, A narrates)*

**Step 1 — Home page**
- Show the clean home screen: search bar with the AI companion panel alongside it
- Type: *"Flights from JFK to London next Friday"*
- Watch the AI search and stream results back in the chat

**Step 2 — Planning & booking**
- Navigate to the plan view
- AI panel shows the flight options; user picks one
- Say: *"Book the Delta flight for 1 passenger"* — AI confirms details and books
- Show the confirmation with booking reference (PF-XXXXXX format)

**Step 3 — Booking management**
- Ask: *"Show me my booking PF-XXXXXX"* — AI retrieves and displays it
- Ask: *"Cancel it"* — AI cancels and confirms, all in conversation

**[A]:** "Search, book, retrieve, cancel — one conversation. No page reloads, no forms."

---

## [3:50 – 4:30] TECH SNAPSHOT  *(Speaker A)*

Quick look under the hood:

- **Backend:** FastAPI on Python 3.12, fully async end-to-end
- **AI layer:** GPT-4o with OpenAI function calling — the agentic loop lives in a single `AgentService` that orchestrates tool calls and streams chunks back via SSE
- **Frontend:** React 19 + TypeScript, real-time streaming with Server-Sent Events
- **Infra:** PostgreSQL for bookings, Redis for rate limiting, deployed on Railway (backend) + Vercel (frontend) — every PR gets a live preview link automatically

The architecture is clean enough that adding a new agent tool — say, hotel search — is one file change.

---

## [4:30 – 5:00] THE CLOSE  *(Speaker A)*

Travel booking is a massive industry still largely stuck on keyword search and form-filling.

What we built proves that the hard part — **an agent that actually executes, not just suggests** — is solvable today, with the right architecture and the right models.

Pathfinder isn't a chatbot. It's a booking engine you talk to.

**[B]:** We're happy to take questions, or just try to break it live.

---

## KEY SOUNDBITES *(use if you get a follow-up question)*

- *"It's not a chatbot. It's an agent that acts."*
- *"Every number you see came from a real tool call. Nothing is hallucinated."*
- *"One conversation: search, book, modify, cancel — done."*
- *"We didn't bolt AI onto the product. We made AI the interface."*

---

<!-- Original technical deep-dive follows — kept for reference, not for the pitch -->

## 1. Agent Design & Architecture ✦ STRONG

### What We Built
A **fully autonomous, multi-turn flight booking agent** that can search, book, modify, and cancel flights entirely through natural conversation — no UI forms required.

### Agentic Loop
```
User message
  → Intent detection (IATA code / keyword scan)
  → LLM call with tool schemas (gpt-4o function calling)
  → Tool execution (search / book / modify / cancel / get)
  → Result injected back into context
  → Next iteration (up to 10 max)
  → Streamed final response to user
```

**Key design decisions:**

| Decision | Why |
|---|---|
| 10-iteration safety cap | Prevents runaway loops; enough for complex multi-leg bookings |
| `tool_choice="required"` on intent | Forces tool use on iteration 0 when flight intent is detected — avoids "please visit an airline" refusals |
| Offer-ID aliasing | Deterministic alias format `{prefix}{idx}:{origin}:{dest}:{date}:{cabin}:{pax}` — no DB persistence needed for mock data |
| Date normalisation inside `_execute_tool()` | LLMs frequently output MM/DD/YYYY; we coerce to YYYY-MM-DD silently |
| Safety refusal detection | 40+ narrow phrases caught via regex; agent injects a correction prompt and retries instead of silently failing |
| History trimming at 60K chars | Keeps context within gpt-4o's window; oldest non-system messages dropped first |

### 5 Agent Tools

```
search_flights   → origin, destination, dates, cabin, passengers
book_flight      → offer_id, passenger details, contact info
get_booking      → booking_reference
modify_booking   → booking_reference, new cabin / contact
cancel_booking   → booking_reference
```

### File: [backend/app/services/agent_service.py](backend/app/services/agent_service.py)

---

## 2. AI / LLM Integration ✦ STRONG

### Stack

| Component | Technology |
|---|---|
| Chat completions | `AsyncOpenAI` — gpt-4o, streaming + non-streaming |
| Embeddings | `text-embedding-3-small` (1536 dims), batch mode |
| Vector store | Pinecone — upsert / nearest-neighbour search / delete |
| Frontend streaming | Server-Sent Events (SSE) — real-time token-by-token output |

### Streaming Pipeline
```
Agent → OpenAI streaming API
      → FastAPI StreamingResponse (text/event-stream)
      → React EventSource / fetch reader
      → setState per chunk → live UI update
```

### Configurable LLM Parameters
All tunable via environment without code changes:
```
OPENAI_MODEL           = gpt-4o
OPENAI_TEMPERATURE     = 0.7
OPENAI_MAX_TOKENS      = 2048
OPENAI_EMBEDDING_MODEL = text-embedding-3-small
```

### Prompt Engineering Highlights
- **Strict system prompt**: Tool-use mandate, supported airport whitelist (27 airports, 4 regions), booking reference format, date handling rules
- **Today's date injection**: `{today}` placeholder filled at runtime — agent always knows current date
- **Outcome-only reporting**: Prompt instructs agent to report only what the tool actually returned, not hallucinated confirmations

### Graceful Degradation
- Pinecone key absent → vector service becomes a silent no-op; rest of app unaffected
- OpenAI key absent → validated at startup in production; ignored in test mode

### Files:
- [backend/app/services/ai_service.py](backend/app/services/ai_service.py)
- [backend/app/services/vector_service.py](backend/app/services/vector_service.py)
- [backend/app/core/constants.py](backend/app/core/constants.py)

---

## 3. Infrastructure & Deployment ✦ GOOD

### Local Development
```
Docker Compose stack:
  ├── FastAPI (hot-reload, port 8001)
  ├── PostgreSQL 16 (persistent volume, healthcheck)
  └── Redis 7 (healthcheck)

One command: docker compose up -d && make dev
```

### Production Docker Build (Multi-Stage)

```dockerfile
Stage 1: builder   → python:3.12-slim + gcc + pip install
Stage 2: dev       → hot-reload, dev deps included
Stage 3: production → slim image, builder packages only
                      non-root user (uid 1001)
                      health check: GET /api/v1/health every 30s
                      WEB_CONCURRENCY workers, dynamic PORT
```

### Configuration Hierarchy
```
app/core/config.py  (Pydantic Settings)
  ← environment variables
  ← .env file (local only, git-ignored)
  ← defaults
```

**Production startup validation** — fails fast if:
- `SECRET_KEY` is still the default placeholder
- `OPENAI_API_KEY` is missing
- `DATABASE_URL` points to localhost

### Database
- SQLAlchemy 2.0 async, connection pool (size=5, max overflow=10)
- Alembic migrations (versioned, reviewable)
- pgBouncer-compatible mode (transaction pooling)
- SSL support for Supabase / managed Postgres

### CI/CD Pipeline

```
GitHub PR opened / pushed
  ├── Vercel (Frontend)
  │     → Vite build + TypeScript check
  │     → Preview deployment URL posted to PR
  │     → Merge to main → production deploy
  │
  └── Railway (Backend)
        → Docker multi-stage build
        → Deploy to Railway environment
        → Live backend URL posted to PR for testing
        → Merge to main → production deploy
```

**Automatic PR checks:**
- Build status (pass/fail) visible directly on the PR
- Each PR gets a live preview link for both frontend and backend — reviewers can test end-to-end before merge
- No manual deployment steps; push to `main` = production

### Deployment Targets

| Layer | Platform | Trigger |
|---|---|---|
| Frontend | Vercel | Auto on PR + merge to main |
| Backend | Railway | Auto on PR + merge to main |
| Database | PostgreSQL (Railway managed) | Persistent, not redeployed |
| Cache | Redis (Railway managed) | Persistent, not redeployed |

### Files:
- [backend/Dockerfile](backend/Dockerfile)
- [backend/docker-compose.yml](backend/docker-compose.yml)
- [backend/app/core/config.py](backend/app/core/config.py)
- [vercel.json](vercel.json)

---

## 4. Observability & Monitoring ✦ STRONG

### Structured Logging with `structlog`

Every log line is a **JSON object** in production, human-readable colored text in development.

**Processor chain:**
```
merge_contextvars → add_log_level → add_logger_name → TimeStamper(ISO) → app_context → JSONRenderer/ConsoleRenderer
```

### Request Tracing
Every HTTP request gets a UUID `request_id` injected into `structlog` contextvars — all log lines for that request carry the same ID automatically, even across `await` boundaries.

```
[request_id=abc-123] method=GET path=/api/v1/flights/search status=200 duration_ms=43.2
```

Response also carries `X-Request-ID` header for client-side correlation.

### Agent Observability (every step is logged)

| Event | Fields |
|---|---|
| `llm_call` | iteration, tool_choice, prompt_tokens, completion_tokens, total_tokens, finish_reason, duration_ms |
| `agent_tool_called` | tool name, result preview (200 chars) |
| `agent_history_trimmed` | original_count, trimmed_count, remaining_chars |
| `agent_safety_refusal_detected` | iteration, content preview |
| `agent_tool_error` | tool name, error message |
| `agent_run_complete` | total iterations, total tokens, tools_called list |

### Service-Level Logging

| Service | Events |
|---|---|
| AI Service | `ai_chat_completed`, `ai_chat_stream_completed` (model, tokens), `ai_embed_completed` (batch size, tokens) |
| Vector Service | `vector_upsert`, `vector_search` (hits), `vector_delete`, `vector_store_disabled` |
| Flight Service | `flight_search` (origin, dest, dates, pax, cabin, result counts) |
| Rate Limiter | `rate_limit_exceeded` (key, limit, window) |

### Error Handling
- `ErrorHandlerMiddleware`: catches all unhandled exceptions, logs full traceback, returns generic 500 (no stack leak to clients)
- `RequestValidationError` handler: returns 422 with field-level detail, logs path + errors

### Health Check
`GET /api/v1/health` — monitored by Docker healthcheck every 30s

### Files:
- [backend/app/core/logging.py](backend/app/core/logging.py)
- [backend/app/middleware/request_logger.py](backend/app/middleware/request_logger.py)
- [backend/app/middleware/error_handler.py](backend/app/middleware/error_handler.py)

---

## 5. Security & Privacy ✦ STRONG ↑ (upgraded from GOOD)

### Authentication
- **Password hashing**: bcrypt, 12 rounds
- **JWT tokens**: HS256, split into access (30 min) + refresh (7 days) with type validation; `alg:none` attack blocked by `jose` library
- **Google OAuth2**: ID token validated against `tokeninfo` endpoint; audience (`aud`) checked to prevent token hijacking
- **Session storage**: Frontend uses `localStorage` / `sessionStorage` based on "remember me" choice

### Authorisation (Role-Based)
```
CurrentUser  → valid JWT access token + is_active check
AdminUser    → CurrentUser + role == "admin"
OptionalUser → authenticated or anonymous (public endpoints)
```

Booking ownership enforced in **service layer** (not just endpoint layer): `modify` and `cancel` verify `booking.user_id == current_user.id` before proceeding (403 otherwise). `GET /bookings/{ref}` requires a valid JWT — booking PII is never exposed to unauthenticated callers.

### Rate Limiting (Multi-Layer)

| Endpoint | Key | Limit |
|---|---|---|
| `POST /auth/login` | IP address | 10 req / 60 s |
| `POST /auth/google` | IP address | 10 req / 60 s |
| Agent chat | user ID | 15 req / 60 s |
| AI chat | user ID | 30 req / 60 s |

Implemented with async-safe in-memory fixed-window counters (`asyncio.Lock`). Returns HTTP 429 on breach. IP-based limits prevent credential stuffing and brute force before a session even exists.

### Input Validation
```
IATA codes:    regex ^[A-Z]{3}$
Passenger count: 1–9 (Pydantic Field constraints)
Cabin class:   Literal enum (economy | premium_economy | business | first)
Email:         Pydantic EmailStr
Dates:         past-date rejection + return-after-departure check in service layer
```

### CORS
Origins configurable via `CORS_ORIGINS` env var (comma-separated). Credentials allowed. No wildcard in production.

### Secrets Management
- All secrets via environment variables — no hardcoded values anywhere
- `.env` git-ignored
- Production startup validation rejects default/missing secrets and `localhost` database URLs

### API Docs
`/docs`, `/redoc`, `/openapi.json` — **disabled in production** (only available in development)

### Sensitive Data
- Passwords stored only as bcrypt hash; never logged or returned
- Stack traces never exposed to clients (error middleware returns generic 500)
- Token payloads contain only `user_id`, type, and timestamps — no PII
- Booking PII (passenger names, contact details) gated behind authentication

### OWASP Top 10 Coverage

| Risk | Status |
|---|---|
| A01 Broken Access Control | ✅ RBAC + ownership check + auth on all PII endpoints |
| A02 Cryptographic Failures | ✅ bcrypt + HS256 JWT; no plaintext secrets |
| A03 Injection | ✅ SQLAlchemy ORM parameterised queries throughout |
| A04 Insecure Design | ✅ Service layer enforces ownership independently of HTTP layer |
| A05 Security Misconfiguration | ✅ Docs disabled in prod; startup secret validation |
| A06 Vulnerable Components | ✅ Pinned deps via `uv.lock`; `jose` blocks `alg:none` |
| A07 Auth Failures | ✅ IP rate limit on login + Google login; bcrypt |
| A08 Software/Data Integrity | ✅ JWT `typ` claim validated; audience checked on OAuth |
| A09 Logging Failures | ✅ structlog JSON; rate-limit breaches logged; no secrets in logs |
| A10 SSRF | ✅ No user-controlled URL fetching |

### Files:
- [backend/app/core/security.py](backend/app/core/security.py)
- [backend/app/api/deps.py](backend/app/api/deps.py)
- [backend/app/core/rate_limit.py](backend/app/core/rate_limit.py)
- [backend/app/api/v1/endpoints/auth.py](backend/app/api/v1/endpoints/auth.py)

---

## Summary Scorecard

| Area | Highlights | Rating |
|---|---|---|
| **Agent Design** | 10-iter loop, 5 tools, intent detection, safety refusal recovery, offer aliasing, history trimming | ★★★★★ |
| **AI/LLM Integration** | gpt-4o streaming, embeddings, Pinecone vector search, SSE to frontend, prompt engineering | ★★★★★ |
| **Infrastructure** | Multi-stage Docker, Compose stack, production validation, Railway (backend) + Vercel (frontend) with automatic PR preview deployments + live test links on every PR | ★★★★★ |
| **Observability** | structlog JSON, request tracing, per-step agent telemetry, token counting, error middleware | ★★★★★ |
| **Security & Privacy** | bcrypt, JWT split tokens, RBAC, IP + per-user rate limits, auth on all PII endpoints, OWASP A01–A10 covered | ★★★★★ |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│                  Frontend (React 19)         │
│   PlanPage ──SSE──► AgentChat component      │
└──────────────────┬──────────────────────────┘
                   │ HTTPS / Bearer JWT
┌──────────────────▼──────────────────────────┐
│           FastAPI Backend                    │
│  Middleware: CORS · RequestLogger · ErrorHandler
│                   │                          │
│    ┌──────────────▼────────────┐             │
│    │     AgentService          │             │
│    │  ┌─────────────────────┐  │             │
│    │  │  Agentic Loop (×10) │  │             │
│    │  │  intent → LLM call  │  │             │
│    │  │  tool dispatch      │  │             │
│    │  │  history trim       │  │             │
│    │  └─────────────────────┘  │             │
│    └──┬──────────┬─────────────┘             │
│       │          │                           │
│  AIService   FlightService                   │
│  (OpenAI)    (mock provider)                 │
│       │                                      │
│  VectorService                               │
│  (Pinecone)                                  │
└──────┬──────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│  PostgreSQL 16    Redis 7    OpenAI API      │
│  (bookings/users) (rate lmt) (gpt-4o/embeds) │
└─────────────────────────────────────────────┘
```

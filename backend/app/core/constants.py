"""Application-wide constants. No logic — pure data."""

# ── Pagination ────────────────────────────────────────────────────────────────
DEFAULT_PAGE_SIZE: int = 20
MAX_PAGE_SIZE: int = 100
MIN_PAGE_SIZE: int = 1

# ── Auth ──────────────────────────────────────────────────────────────────────
PASSWORD_MIN_LENGTH: int = 8
PASSWORD_MAX_LENGTH: int = 128
TOKEN_TYPE_BEARER: str = "bearer"
TOKEN_TYPE_ACCESS: str = "access"
TOKEN_TYPE_REFRESH: str = "refresh"

# ── User Roles ────────────────────────────────────────────────────────────────
ROLE_ADMIN: str = "admin"
ROLE_USER: str = "user"
ROLE_GUEST: str = "guest"
ALL_ROLES: frozenset[str] = frozenset({ROLE_ADMIN, ROLE_USER, ROLE_GUEST})

# ── AI ────────────────────────────────────────────────────────────────────────
# Numeric limits only — prompt text lives in app.core.prompts so it can be
# reviewed and versioned independently of these constants.
AI_MAX_CONTEXT_TOKENS: int = 128_000
AI_EMBEDDING_BATCH_SIZE: int = 100
AI_SIMILARITY_TOP_K: int = 5
AI_SIMILARITY_THRESHOLD: float = 0.75

# ── AI Token Pricing ──────────────────────────────────────────────────────────
# USD per 1 million tokens (OpenAI list prices, 2025-Q1).
# Used by estimate_cost_usd() to annotate every LLM call in logs so spend is
# visible without querying the OpenAI usage dashboard.
# Update these when OpenAI reprices models — the helper silently returns 0.0
# for unknown model names so new models never break the hot path.
AI_TOKEN_COSTS: dict[str, dict[str, float]] = {
    "gpt-4o":                   {"prompt": 2.50,  "completion": 10.00},
    "gpt-4o-mini":              {"prompt": 0.15,  "completion":  0.60},
    "text-embedding-3-small":   {"prompt": 0.02,  "completion":  0.0},
    "text-embedding-3-large":   {"prompt": 0.13,  "completion":  0.0},
    "text-embedding-ada-002":   {"prompt": 0.10,  "completion":  0.0},
}


def estimate_cost_usd(
    model: str,
    prompt_tokens: int,
    completion_tokens: int = 0,
) -> float:
    """Return the estimated USD cost for one LLM or embedding call.

    Uses ``AI_TOKEN_COSTS`` for per-model pricing.  Returns ``0.0`` for
    unrecognised model names so cost tracking never disrupts the hot path.
    Rounded to 8 decimal places to preserve sub-cent precision for small calls.
    """
    costs = AI_TOKEN_COSTS.get(model, {})
    prompt_cost = costs.get("prompt", 0.0) * prompt_tokens / 1_000_000
    completion_cost = costs.get("completion", 0.0) * completion_tokens / 1_000_000
    return round(prompt_cost + completion_cost, 8)

# Backwards-compat alias — canonical definition is in app.core.prompts.
AI_DEFAULT_SYSTEM_PROMPT: str = (
    "You are Pathfinder, an intelligent AI travel assistant. "
    "Be concise, accurate, and helpful. "
    "When the user asks about flights or bookings, direct them to use the "
    "flight search and booking features in the app."
)

# ── Rate Limiting ─────────────────────────────────────────────────────────────
RATE_LIMIT_REQUESTS: int = 100
RATE_LIMIT_WINDOW_SECONDS: int = 60

# ── Cache ─────────────────────────────────────────────────────────────────────
CACHE_KEY_USER: str = "user:{user_id}"
CACHE_KEY_SESSION: str = "session:{session_id}"

# ── HTTP Status Messages ──────────────────────────────────────────────────────
MSG_NOT_FOUND: str = "Resource not found"
MSG_UNAUTHORIZED: str = "Authentication required"
MSG_FORBIDDEN: str = "Insufficient permissions"
MSG_BAD_REQUEST: str = "Invalid request data"
MSG_INTERNAL_ERROR: str = "An unexpected error occurred"
MSG_CONFLICT: str = "Resource already exists"

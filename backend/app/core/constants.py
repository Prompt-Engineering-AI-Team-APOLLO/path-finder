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
AI_MAX_CONTEXT_TOKENS: int = 128_000
AI_DEFAULT_SYSTEM_PROMPT: str = (
    "You are Pathfinder, an intelligent AI assistant. " "Be concise, accurate, and helpful."
)
AI_EMBEDDING_BATCH_SIZE: int = 100
AI_SIMILARITY_TOP_K: int = 5
AI_SIMILARITY_THRESHOLD: float = 0.75

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

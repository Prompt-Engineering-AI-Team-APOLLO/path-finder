from functools import lru_cache
from typing import Literal

from pydantic import PostgresDsn, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "Pathfinder API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "production", "test"] = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Stored as a plain string so pydantic-settings never tries to JSON-decode it.
    # Use comma-separated values: "https://app.com,http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: PostgresDsn = (  # type: ignore[assignment]
        "postgresql+asyncpg://postgres:postgres@localhost:5432/pathfinder"
    )
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_ECHO: bool = False
    # Set to true when connecting to Supabase or any remote Postgres that requires SSL
    DATABASE_SSL: bool = False
    # Set to true when connecting through pgBouncer (e.g. Supabase Transaction Pooler port 6543)
    # Disables asyncpg's prepared statement cache, which is incompatible with transaction mode
    DATABASE_PGBOUNCER: bool = False

    # ── AI / OpenAI ───────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_MAX_TOKENS: int = 2048
    OPENAI_TEMPERATURE: float = 0.7

    # ── Groq (agent) ──────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    # ── Vector DB (Pinecone) ──────────────────────────────────────────────────
    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = ""
    PINECONE_INDEX_NAME: str = "pathfinder-index"
    VECTOR_DIMENSION: int = 1536

    # ── Redis / Cache ─────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 300

    # ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: Literal["json", "text"] = "json"

    # ── Google OAuth ──────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""

    # ── Email (Gmail SMTP) ────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""       # Gmail address e.g. pathfinderai07@gmail.com
    SMTP_PASSWORD: str = ""   # Gmail App Password (16 chars, no spaces)

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        """Fail fast on startup if required secrets are missing in production."""
        if self.ENVIRONMENT != "production":
            return self
        _default_key = "change-me-in-production-use-openssl-rand-hex-32"
        if not self.SECRET_KEY or self.SECRET_KEY == _default_key:
            raise ValueError(
                "SECRET_KEY must be set to a strong random value in production. "
                "Generate one with: openssl rand -hex 32"
            )
        if not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY must be set in production")
        if not self.DATABASE_URL or "localhost" in str(self.DATABASE_URL):
            raise ValueError(
                "DATABASE_URL must point to a remote database in production, not localhost"
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_test(self) -> bool:
        return self.ENVIRONMENT == "test"


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — import this, not Settings directly."""
    return Settings()


settings = get_settings()

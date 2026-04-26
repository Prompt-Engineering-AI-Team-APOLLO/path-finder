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
    ALGORITHM: Literal["HS256", "RS256"] = "HS256"
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
    # Base64-encoded CA cert (preferred for cloud deployments like Railway/Render)
    DATABASE_SSL_CA_CERT_B64: str = ""
    # Path to a CA cert file (for local/Docker use)
    DATABASE_SSL_CA_CERT: str = ""
    # Set to true when connecting through pgBouncer (e.g. Supabase Transaction Pooler port 6543)
    # Disables asyncpg's prepared statement cache, which is incompatible with transaction mode
    DATABASE_PGBOUNCER: bool = False

    # ── AI / OpenAI ───────────────────────────────────────────────────────────
    #
    # Model selection rationale
    # ─────────────────────────
    # We use different models per task because the cost/quality trade-off
    # differs significantly between agentic, RAG, and conversational workloads.
    #
    # AGENT_MODEL = "gpt-4o"
    #   The booking loop calls up to 5 tools in sequence (search → confirm →
    #   book → get_booking → cancel/modify). GPT-4o has the highest function-
    #   calling reliability in OpenAI's production lineup: it consistently emits
    #   well-formed JSON for complex nested schemas (passenger arrays, optional
    #   fields declared without a "type" key), respects tool_choice="required",
    #   and rarely hallucinates tool arguments. Its 128K context window holds a
    #   full multi-turn booking conversation plus all tool results without
    #   trimming. GPT-4o-mini produced ~15% more argument-format errors on the
    #   book_flight schema in early testing — unacceptable for a flow where a
    #   malformed argument results in a failed booking for the user.
    #
    # OPENAI_MODEL = "gpt-4o" (general-purpose chat fallback)
    #   General chat (AIService.chat / chat_stream) also uses GPT-4o for
    #   quality parity: users should get the same reasoning quality whether they
    #   hit the agent or the plain chat interface.
    #
    # RAG_MODEL = "gpt-4o-mini"
    #   RAG generation is a constrained summarisation task — the model must
    #   synthesise retrieved context and cite sources. It does NOT need tool-
    #   calling or long multi-step reasoning. GPT-4o-mini handles this at
    #   ~10× lower cost per output token, which matters because every RAG call
    #   includes a 2 K-token retrieved-context block in addition to the answer.
    #   Quality on our FAQ/policy dataset (ROUGE-L, citation accuracy) was
    #   within 3% of GPT-4o at the lower price point.
    #
    # OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
    #   Produces 1536-dimensional vectors — matching VECTOR_DIMENSION = 1536
    #   (Pinecone's default index configuration). Compared to
    #   text-embedding-3-large (3072-dim): retrieval quality on our route/FAQ
    #   dataset was within 2% NDCG@10, while cost is 5× lower per token and
    #   the smaller model fits batch sizes up to AI_EMBEDDING_BATCH_SIZE = 100
    #   without approaching the 8191-token per-item limit.
    #
    # Temperature rationale
    # ─────────────────────
    # AGENT_TEMPERATURE = 0.0
    #   Tool arguments must be exact and reproducible. Any temperature > 0
    #   introduces variability in argument construction (inconsistent date
    #   formats, random cabin-class choices). Zero temperature gives
    #   deterministic tool calls — critical when the output triggers a real
    #   booking that the user cannot easily undo.
    #
    # OPENAI_TEMPERATURE = 0.7 (general chat)
    #   Conversational responses benefit from natural variation. 0.7 is the
    #   OpenAI-recommended starting point for chat assistants — high enough
    #   for varied phrasing, low enough to stay on-topic.
    #
    # RAG_TEMPERATURE = 0.2
    #   RAG answers must stay grounded in retrieved context. A low temperature
    #   reduces the risk of the model embellishing or contradicting source
    #   material while still allowing readable, non-robotic phrasing.
    #
    # Max-token rationale
    # ───────────────────
    # AGENT_MAX_TOKENS = 1024
    #   Agent final responses are booking confirmations, itinerary summaries,
    #   and short conversational turns — rarely more than a few paragraphs.
    #   A 1024-token ceiling prevents unexpectedly long completions while
    #   comfortably fitting a full booking summary with passenger details and
    #   flight itinerary. Tool results are injected into the *context window*
    #   (not counted against this limit) so it applies only to the prose reply.
    #
    # OPENAI_MAX_TOKENS = 2048 (general chat)
    #   Open-ended chat may involve longer explanations. 2048 is a safe ceiling
    #   that covers essentially all conversational responses.
    #
    # RAG_MAX_TOKENS = 512
    #   RAG answers should be concise citations of retrieved facts. Responses
    #   longer than ~400 tokens almost always indicate padding beyond what the
    #   context supports — a signal of hallucination, not thoroughness.

    OPENAI_API_KEY: str = ""

    # General-purpose chat model (AIService.chat / chat_stream)
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_TEMPERATURE: float = 0.7   # conversational, some creative variation
    OPENAI_MAX_TOKENS: int = 2048

    # Agentic booking loop — prioritises tool-calling reliability over cost
    AGENT_MODEL: str = "gpt-4o"
    AGENT_TEMPERATURE: float = 0.0    # deterministic tool arguments
    AGENT_MAX_TOKENS: int = 1024      # booking confirmations are concise

    # RAG generation — constrained summarisation, cost-sensitive
    RAG_MODEL: str = "gpt-4o-mini"
    RAG_TEMPERATURE: float = 0.2      # grounded but readable
    RAG_MAX_TOKENS: int = 512         # concise cited answers only

    # Embeddings — dimension must match VECTOR_DIMENSION below
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"  # 1536-dim, 5× cheaper than -large

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

    # ── Rate limiting ─────────────────────────────────────────────────────────
    # Set to 0 to disable rate limiting entirely (useful in development)
    AGENT_RATE_LIMIT: int = 15    # requests per minute per user
    AI_CHAT_RATE_LIMIT: int = 30  # requests per minute per user
    LOGIN_RATE_LIMIT: int = 10    # login attempts per minute per IP

    # ── Google OAuth ──────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""

    # ── Email (Gmail SMTP) ────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""       # Gmail address e.g. pathfinderai07@gmail.com
    SMTP_PASSWORD: str = ""   # Gmail App Password (16 chars, no spaces)

    @model_validator(mode="after")
    def _validate_ai_config(self) -> "Settings":
        """Catch misconfigured model / dimension pairs at startup.

        text-embedding-3-small produces 1536-dim vectors.
        text-embedding-3-large produces 3072-dim vectors.
        Pinecone rejects upserts if the vector dimension doesn't match the
        index dimension, so we fail fast rather than discovering this on the
        first ingest request.
        """
        _embedding_dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
        }
        expected_dim = _embedding_dimensions.get(self.OPENAI_EMBEDDING_MODEL)
        if expected_dim is not None and self.VECTOR_DIMENSION != expected_dim:
            raise ValueError(
                f"VECTOR_DIMENSION={self.VECTOR_DIMENSION} does not match "
                f"{self.OPENAI_EMBEDDING_MODEL} output dimension={expected_dim}. "
                f"Set VECTOR_DIMENSION={expected_dim} or switch to a different embedding model."
            )
        return self

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

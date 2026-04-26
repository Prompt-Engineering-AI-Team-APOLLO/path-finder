"""Async Redis client with graceful degradation.

Redis is used for distributed rate limiting across multiple workers.
Docker-compose starts Redis 7 and the API container depends_on it with a
health check, so Redis should be available on startup in all environments.

If the connection fails for any reason (misconfigured URL, local dev without
Docker), ``get_redis()`` returns ``None`` and callers fall back to in-process
alternatives.  This means the application degrades gracefully rather than
refusing to start.

Usage
-----
    from app.core.redis import get_redis

    redis = await get_redis()
    if redis is not None:
        await redis.set("key", "value", ex=60)
"""

from __future__ import annotations

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Module-level singleton — initialised once on first call to get_redis().
# The redis.asyncio client manages its own connection pool internally.
_client: aioredis.Redis | None = None
_connect_attempted: bool = False


async def get_redis() -> aioredis.Redis | None:
    """Return the shared async Redis client, or ``None`` if unavailable.

    Connects lazily on first call and caches the client for subsequent calls.
    A failed connection is logged as a warning but never raises — the caller
    is responsible for falling back to an alternative.
    """
    global _client, _connect_attempted

    if _connect_attempted:
        return _client

    _connect_attempted = True
    try:
        client: aioredis.Redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
        await client.ping()
        _client = client
        logger.info("redis_connected", url=settings.REDIS_URL)
    except Exception as exc:
        logger.warning(
            "redis_unavailable",
            url=settings.REDIS_URL,
            error=str(exc),
            fallback="in-memory rate limiting",
        )
        _client = None

    return _client


async def close_redis() -> None:
    """Close the Redis connection pool.  Call on application shutdown."""
    global _client, _connect_attempted
    if _client is not None:
        await _client.aclose()
        _client = None
        _connect_attempted = False
        logger.info("redis_closed")

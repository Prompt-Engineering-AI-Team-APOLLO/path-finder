"""Fixed-window rate limiter with Redis backend and in-memory fallback.

Primary path (multi-worker, production)
----------------------------------------
Uses a shared Redis counter so limits are enforced across all worker processes:
  1. INCR the key — atomic, returns the new count.
  2. If count == 1 (first hit in window), set EXPIRE so the key auto-clears.
  3. If count > limit, raise HTTP 429.

Fallback path (single-worker / local dev without Redis)
---------------------------------------------------------
If Redis is unavailable, falls back to an asyncio-lock-protected in-memory
dict.  This is correct for single-worker deployments (the Railway default) but
will silently under-enforce limits when multiple workers share no state.
A warning is logged once on the first Redis failure so this is detectable.
"""

import asyncio
import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.core.redis import get_redis

logger = get_logger(__name__)


# ── In-memory fallback structures ─────────────────────────────────────────────

@dataclass
class _Window:
    count: int = 0
    reset_at: float = field(default_factory=lambda: time.monotonic())


_windows: dict[str, _Window] = defaultdict(_Window)
_lock = asyncio.Lock()


# ── Redis-backed counter ───────────────────────────────────────────────────────

async def _redis_is_rate_limited(key: str, limit: int, window_seconds: int) -> bool:
    """Atomic fixed-window counter using Redis INCR + EXPIRE.

    Safe to call concurrently across multiple workers — INCR is atomic.
    """
    redis = await get_redis()
    if redis is None:
        return await _memory_is_rate_limited(key, limit, window_seconds)

    try:
        rkey = f"rl:{key}"
        count = await redis.incr(rkey)
        if count == 1:
            # First request in this window — set the expiry.
            await redis.expire(rkey, window_seconds)
        return count > limit
    except Exception as exc:
        # Redis error mid-request — log and fall back to in-memory so the
        # request is not blocked by an infrastructure failure.
        logger.warning("redis_rate_limit_error", key=key, error=str(exc))
        return await _memory_is_rate_limited(key, limit, window_seconds)


# ── In-memory fallback ─────────────────────────────────────────────────────────

async def _memory_is_rate_limited(key: str, limit: int, window_seconds: int) -> bool:
    """In-process fixed-window counter, protected by an asyncio lock."""
    async with _lock:
        now = time.monotonic()
        w = _windows[key]
        if now >= w.reset_at:
            w.count = 0
            w.reset_at = now + window_seconds
        w.count += 1
        return w.count > limit


# ── Public API ─────────────────────────────────────────────────────────────────

async def is_rate_limited(key: str, limit: int, window_seconds: int = 60) -> bool:
    """Return True if ``key`` has exceeded ``limit`` calls in the current window.

    Uses Redis when available, falls back to in-memory automatically.
    """
    return await _redis_is_rate_limited(key, limit, window_seconds)


async def enforce_rate_limit(key: str, limit: int, window_seconds: int = 60) -> None:
    """Raise HTTP 429 if the rate limit is exceeded, otherwise pass through.

    Pass ``limit=0`` to disable rate limiting entirely (useful in development).
    """
    if limit == 0:
        return
    if await is_rate_limited(key, limit, window_seconds):
        logger.warning(
            "rate_limit_exceeded",
            key=key,
            limit=limit,
            window_seconds=window_seconds,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded — max {limit} requests per {window_seconds}s. Please wait and retry.",
        )

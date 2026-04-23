"""In-memory fixed-window rate limiter.

Each user gets an independent counter per endpoint, reset every `window_seconds`.
This is correct for single-worker deployments (Railway default). To scale to
multiple workers, replace _windows with a shared Redis counter:
  key = f"rl:{key}"
  count = await redis.incr(key)
  if count == 1:
      await redis.expire(key, window_seconds)
  return count > limit
"""

import asyncio
import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import HTTPException, status

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class _Window:
    count: int = 0
    reset_at: float = field(default_factory=lambda: time.monotonic())


_windows: dict[str, _Window] = defaultdict(_Window)
_lock = asyncio.Lock()


async def is_rate_limited(key: str, limit: int, window_seconds: int = 60) -> bool:
    """Return True if the key has exceeded `limit` calls in the current window."""
    async with _lock:
        now = time.monotonic()
        w = _windows[key]
        if now >= w.reset_at:
            w.count = 0
            w.reset_at = now + window_seconds
        w.count += 1
        return w.count > limit


async def enforce_rate_limit(key: str, limit: int, window_seconds: int = 60) -> None:
    """Raise HTTP 429 if the rate limit is exceeded, otherwise pass through.

    Pass limit=0 to disable rate limiting entirely.
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

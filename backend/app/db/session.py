"""Async SQLAlchemy engine + session factory."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

_connect_args: dict = {}
if settings.DATABASE_SSL:
    _connect_args["ssl"] = "require"
# With pgBouncer in transaction mode (e.g. Supabase port 6543), each transaction may land
# on a different backend.  asyncpg names prepared statements sequentially per connection
# (__asyncpg_stmt_1__, __asyncpg_stmt_2__, …).  A fresh asyncpg connection that lands on a
# backend that already has __asyncpg_stmt_1__ from a previous client raises
# DuplicatePreparedStatementError.
#
# Fix: set prepared_statement_cache_size=0 — this is the SQLAlchemy asyncpg dialect
# parameter that makes SQLAlchemy use asyncpg's execute() directly instead of prepare().
# asyncpg.execute() uses *unnamed* (implicit) prepared statements that are auto-deallocated
# after each use, so they never accumulate on the backend and never collide.
#
# Note: statement_cache_size=0 (asyncpg's own parameter) is NOT sufficient — even with
# that set, SQLAlchemy still calls connection.prepare() which creates named statements.
_connect_args["prepared_statement_cache_size"] = 0

_engine_kwargs: dict = {
    "pool_pre_ping": True,
    "echo": settings.DATABASE_ECHO,
}
if settings.DATABASE_PGBOUNCER:
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs["pool_size"] = settings.DATABASE_POOL_SIZE
    _engine_kwargs["max_overflow"] = settings.DATABASE_MAX_OVERFLOW
    _engine_kwargs["pool_timeout"] = settings.DATABASE_POOL_TIMEOUT

engine = create_async_engine(
    str(settings.DATABASE_URL),
    connect_args=_connect_args,
    **_engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a DB session per request
    and guarantees cleanup on exit.
    """
    async with AsyncSessionLocal() as session:
        if settings.DATABASE_PGBOUNCER:
            # pgbouncer transaction mode keeps backend connections alive after
            # a client disconnects, without running any cleanup query.  asyncpg
            # names prepared statements sequentially per connection
            # (__asyncpg_stmt_1__, __asyncpg_stmt_2__, …).  A fresh asyncpg
            # connection that lands on a backend whose previous client left
            # stale statements will fail on PREPARE with
            # DuplicatePreparedStatementError.
            #
            # Fix: run DEALLOCATE ALL before touching the connection.
            # exec_driver_sql with no bind parameters causes asyncpg to use
            # the PostgreSQL simple-query protocol (a plain Q message) — no
            # prepared statement is created for the DEALLOCATE itself, so the
            # call is safe even when stale statements already exist.
            conn = await session.connection()
            await conn.exec_driver_sql("DEALLOCATE ALL")
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

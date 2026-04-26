"""Async SQLAlchemy engine + session factory."""

<<<<<<< HEAD
=======
import base64
import ssl as _ssl
import tempfile
import os
>>>>>>> origin/main
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

_connect_args: dict = {}
if settings.DATABASE_SSL:
<<<<<<< HEAD
    _connect_args["ssl"] = "require"
=======
    _ssl_ctx = _ssl.create_default_context()
    if settings.DATABASE_SSL_CA_CERT_B64:
        _ca_pem = base64.b64decode(settings.DATABASE_SSL_CA_CERT_B64)
        _tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".crt")
        _tmp.write(_ca_pem)
        _tmp.flush()
        _tmp.close()
        _ssl_ctx.load_verify_locations(_tmp.name)
        os.unlink(_tmp.name)
    elif settings.DATABASE_SSL_CA_CERT:
        _ssl_ctx.load_verify_locations(settings.DATABASE_SSL_CA_CERT)
    _connect_args["ssl"] = _ssl_ctx
>>>>>>> origin/main
if settings.DATABASE_PGBOUNCER:
    _connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    str(settings.DATABASE_URL),
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,
<<<<<<< HEAD
=======
    pool_recycle=1800,
>>>>>>> origin/main
    echo=settings.DATABASE_ECHO,
    connect_args=_connect_args,
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
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
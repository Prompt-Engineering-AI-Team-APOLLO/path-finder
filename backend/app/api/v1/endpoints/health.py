from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Lightweight liveness probe — no DB call."""
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get("/health/ready", response_model=HealthResponse)
async def readiness_check(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    """Readiness probe — verifies DB connectivity."""
    await db.execute(text("SELECT 1"))
    return HealthResponse(
        status="ready",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )

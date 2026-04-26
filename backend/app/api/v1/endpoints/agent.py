"""Agent chat endpoint — streaming SSE responses from the agentic flight assistant."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.api.deps import AgentServiceDep, CurrentUser
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.core.logging import get_logger
from app.schemas.agent import AgentChatRequest
from app.services.ai_service import AIServiceError

router = APIRouter(prefix="/agent", tags=["agent"])
logger = get_logger(__name__)

_AGENT_RATE_WINDOW = 60  # seconds


@router.post("/chat")
async def agent_chat(
    req: AgentChatRequest,
    svc: AgentServiceDep,
    user: CurrentUser,
) -> StreamingResponse:
    """Stream a response from the AI flight assistant.

    Returns Server-Sent Events (text/event-stream).
    Each event is ``data: <json-encoded-chunk>\\n\\n``.
    The stream ends with ``data: [DONE]\\n\\n``.
    Chunks are JSON-encoded so newlines in the content don't break SSE parsing.

    Error handling
    --------------
    Once a ``StreamingResponse`` is returned the global error middleware can no
    longer intercept exceptions — the HTTP 200 header has already been sent.
    We therefore catch all errors inside ``event_stream`` and emit a terminal
    ``data: {"error": "..."}`` event so the client always receives a structured
    signal rather than a silently truncated stream.
    """
    await enforce_rate_limit(f"agent:{user.id}", settings.AGENT_RATE_LIMIT, _AGENT_RATE_WINDOW)

    async def event_stream():
        try:
            async for chunk in svc.run(req.messages, user_id=user.id):
                yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"
        except AIServiceError as exc:
            # Known, user-safe error from the AI layer (rate limit, bad API key, etc.)
            logger.warning("agent_stream_ai_error", error=str(exc), user_id=str(user.id))
            yield f"data: {json.dumps(exc.user_message)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            # Unexpected error — log with full context, send a generic message to the client
            logger.error(
                "agent_stream_unexpected_error",
                error=str(exc),
                user_id=str(user.id),
                exc_info=True,
            )
            yield f"data: {json.dumps('Sorry, something went wrong. Please try again.')}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

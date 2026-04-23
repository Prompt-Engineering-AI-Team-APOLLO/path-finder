"""Agent chat endpoint — streaming SSE responses from the agentic flight assistant."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.api.deps import AgentServiceDep, CurrentUser
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.schemas.agent import AgentChatRequest

router = APIRouter(prefix="/agent", tags=["agent"])

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
    """

    await enforce_rate_limit(f"agent:{user.id}", settings.AGENT_RATE_LIMIT, _AGENT_RATE_WINDOW)

    async def event_stream():
        async for chunk in svc.run(req.messages, user_id=user.id):
            yield f"data: {json.dumps(chunk)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

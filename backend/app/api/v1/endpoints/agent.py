"""Agent chat endpoint — streaming SSE responses from the agentic flight assistant."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.api.deps import AgentServiceDep, CurrentUser
from app.schemas.agent import AgentChatRequest

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/chat")
async def agent_chat(
    req: AgentChatRequest,
    svc: AgentServiceDep,
    user: CurrentUser,
) -> StreamingResponse:
    """Stream a response from the AI flight assistant.

    Returns Server-Sent Events (text/event-stream).
    Each event is ``data: <chunk>\\n\\n``.
    The stream ends with ``data: [DONE]\\n\\n``.
    """

    async def event_stream():
        async for chunk in svc.run(req.messages, user_id=user.id):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

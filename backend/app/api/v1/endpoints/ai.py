"""AI chat & vector-search endpoints."""

import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.deps import AIServiceDep, CurrentUser, VectorServiceDep
from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limit import enforce_rate_limit
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    VectorSearchRequest,
    VectorSearchResponse,
)
from app.services.ai_service import AIServiceError

router = APIRouter(prefix="/ai", tags=["ai"])
logger = get_logger(__name__)

_CHAT_RATE_WINDOW = 60


@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    current_user: CurrentUser,
    ai_svc: AIServiceDep,
    background_tasks: BackgroundTasks,
) -> ChatResponse:
    """Send messages and get an AI response (non-streaming).

    ``AIServiceError`` is caught and converted to an appropriate HTTP error so
    the client receives a structured JSON response rather than a bare 500.
    Rate-limit errors become 429; all other AI failures become 503 to indicate
    the upstream service is temporarily unavailable (not a client mistake).
    """
    await enforce_rate_limit(f"ai_chat:{current_user.id}", settings.AI_CHAT_RATE_LIMIT, _CHAT_RATE_WINDOW)

    try:
        content, tokens = await ai_svc.chat(
            messages=data.messages,
            temperature=data.temperature,
            max_tokens=data.max_tokens,
        )
    except AIServiceError as exc:
        logger.warning("chat_ai_error", error=str(exc), user_id=str(current_user.id))
        # Rate-limit errors expose the retry-after hint via 429; everything else is 503.
        status_code = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if "rate limit" in exc.user_message.lower()
            else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        raise HTTPException(status_code=status_code, detail=exc.user_message)

    conversation_id = data.conversation_id or uuid.uuid4()
    message_id = uuid.uuid4()

    background_tasks.add_task(
        _log_conversation_turn,
        user_id=str(current_user.id),
        conversation_id=str(conversation_id),
        tokens=tokens,
    )

    return ChatResponse(
        content=content,
        conversation_id=conversation_id,
        message_id=message_id,
        model=settings.OPENAI_MODEL,
        tokens_used=tokens,
    )


def _log_conversation_turn(user_id: str, conversation_id: str, tokens: int) -> None:
    """Background task: log conversation metrics for observability.

    Runs after the response is sent so it never delays the user.
    Extend this to persist the message to the database once a conversation
    repository is wired up.
    """
    logger.info(
        "conversation_turn_complete",
        user_id=user_id,
        conversation_id=conversation_id,
        tokens=tokens,
    )


@router.post("/chat/stream")
async def chat_stream(
    data: ChatRequest,
    current_user: CurrentUser,
    ai_svc: AIServiceDep,
) -> StreamingResponse:
    """Stream AI response chunks via Server-Sent Events.

    Error handling
    --------------
    Once a ``StreamingResponse`` is returned, the global middleware can no
    longer intercept exceptions — the HTTP 200 header has already been sent.
    We catch all errors inside ``event_stream`` and emit a terminal
    ``data: {"error": "..."}`` event so clients always receive a structured
    signal rather than a silently truncated stream.
    """
    await enforce_rate_limit(f"ai_chat:{current_user.id}", settings.AI_CHAT_RATE_LIMIT, _CHAT_RATE_WINDOW)

    async def event_stream():
        try:
            async for chunk in ai_svc.chat_stream(
                messages=data.messages,
                temperature=data.temperature,
                max_tokens=data.max_tokens,
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except AIServiceError as exc:
            logger.warning(
                "chat_stream_ai_error",
                error=str(exc),
                user_id=str(current_user.id),
            )
            yield f"data: [ERROR] {exc.user_message}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.error(
                "chat_stream_unexpected_error",
                error=str(exc),
                user_id=str(current_user.id),
                exc_info=True,
            )
            yield "data: [ERROR] Sorry, something went wrong. Please try again.\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/embed", response_model=EmbeddingResponse)
async def embed_texts(
    data: EmbeddingRequest,
    current_user: CurrentUser,
    ai_svc: AIServiceDep,
) -> EmbeddingResponse:
    """Generate embeddings for a list of texts."""
    try:
        return await ai_svc.embed(data.texts)
    except AIServiceError as exc:
        logger.warning("embed_ai_error", error=str(exc), user_id=str(current_user.id))
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.user_message)


@router.post("/search", response_model=VectorSearchResponse)
async def vector_search(
    data: VectorSearchRequest,
    current_user: CurrentUser,
    vector_svc: VectorServiceDep,
) -> VectorSearchResponse:
    """Semantic search against the vector store."""
    return await vector_svc.search(data)

"""AI chat & vector-search endpoints."""

import uuid

from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse

from app.api.deps import AIServiceDep, CurrentUser, VectorServiceDep
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    VectorSearchRequest,
    VectorSearchResponse,
)

router = APIRouter(prefix="/ai", tags=["ai"])

_CHAT_RATE_WINDOW = 60


@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    current_user: CurrentUser,
    ai_svc: AIServiceDep,
    background_tasks: BackgroundTasks,
) -> ChatResponse:
    """Send messages and get an AI response (non-streaming)."""
    await enforce_rate_limit(f"ai_chat:{current_user.id}", settings.AI_CHAT_RATE_LIMIT, _CHAT_RATE_WINDOW)
    content, tokens = await ai_svc.chat(
        messages=data.messages,
        temperature=data.temperature,
        max_tokens=data.max_tokens,
    )
    conversation_id = data.conversation_id or uuid.uuid4()
    message_id = uuid.uuid4()

    # Persist in background (implement persistence logic in a service)
    # background_tasks.add_task(persist_message, ...)

    return ChatResponse(
        content=content,
        conversation_id=conversation_id,
        message_id=message_id,
        model="gpt-4o",
        tokens_used=tokens,
    )


@router.post("/chat/stream")
async def chat_stream(
    data: ChatRequest,
    current_user: CurrentUser,
    ai_svc: AIServiceDep,
) -> StreamingResponse:
    """Stream AI response chunks via Server-Sent Events."""
    await enforce_rate_limit(f"ai_chat:{current_user.id}", settings.AI_CHAT_RATE_LIMIT, _CHAT_RATE_WINDOW)

    async def event_stream():
        async for chunk in ai_svc.chat_stream(
            messages=data.messages,
            temperature=data.temperature,
            max_tokens=data.max_tokens,
        ):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/embed", response_model=EmbeddingResponse)
async def embed_texts(
    data: EmbeddingRequest,
    current_user: CurrentUser,
    ai_svc: AIServiceDep,
) -> EmbeddingResponse:
    """Generate embeddings for a list of texts."""
    return await ai_svc.embed(data.texts)


@router.post("/search", response_model=VectorSearchResponse)
async def vector_search(
    data: VectorSearchRequest,
    current_user: CurrentUser,
    vector_svc: VectorServiceDep,
) -> VectorSearchResponse:
    """Semantic search against the vector store."""
    return await vector_svc.search(data)

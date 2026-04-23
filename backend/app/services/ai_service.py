"""OpenAI-backed AI service with async streaming support."""

from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.constants import AI_DEFAULT_SYSTEM_PROMPT
from app.core.logging import get_logger
from app.schemas.ai import ChatMessage, EmbeddingResponse

logger = get_logger(__name__)

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


class AIService:
    def __init__(self) -> None:
        self._client = get_openai_client()

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        system_prompt: str = AI_DEFAULT_SYSTEM_PROMPT,
    ) -> tuple[str, int]:
        """Returns (response_content, tokens_used)."""
        payload = [{"role": "system", "content": system_prompt}]
        payload += [m.model_dump() for m in messages]

        response = await self._client.chat.completions.create(
            model=model or settings.OPENAI_MODEL,
            messages=payload,  # type: ignore[arg-type]
            temperature=temperature if temperature is not None else settings.OPENAI_TEMPERATURE,
            max_tokens=max_tokens or settings.OPENAI_MAX_TOKENS,
        )
        content = response.choices[0].message.content or ""
        tokens = response.usage.total_tokens if response.usage else 0

        logger.info("ai_chat_completed", model=response.model, tokens=tokens)
        return content, tokens

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        system_prompt: str = AI_DEFAULT_SYSTEM_PROMPT,
    ) -> AsyncGenerator[str, None]:
        """Yields content chunks as they stream in."""
        payload = [{"role": "system", "content": system_prompt}]
        payload += [m.model_dump() for m in messages]

        resolved_model = model or settings.OPENAI_MODEL
        stream = await self._client.chat.completions.create(
            model=resolved_model,
            messages=payload,  # type: ignore[arg-type]
            temperature=temperature if temperature is not None else settings.OPENAI_TEMPERATURE,
            max_tokens=max_tokens or settings.OPENAI_MAX_TOKENS,
            stream=True,
            stream_options={"include_usage": True},
        )
        async for chunk in stream:
            if chunk.usage:
                logger.info(
                    "ai_chat_stream_completed",
                    model=resolved_model,
                    tokens=chunk.usage.total_tokens,
                    prompt_tokens=chunk.usage.prompt_tokens,
                    completion_tokens=chunk.usage.completion_tokens,
                )
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def embed(self, texts: list[str]) -> EmbeddingResponse:
        """Generate embeddings for a batch of texts."""
        response = await self._client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=texts,
        )
        embeddings = [item.embedding for item in response.data]
        tokens = response.usage.total_tokens if response.usage else 0

        logger.info("ai_embed_completed", count=len(texts), tokens=tokens)
        return EmbeddingResponse(
            embeddings=embeddings,
            model=settings.OPENAI_EMBEDDING_MODEL,
            tokens_used=tokens,
        )

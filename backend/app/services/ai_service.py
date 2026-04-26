"""OpenAI-backed AI service with async streaming and structured-output support.

Prompt templates are defined in ``app.core.prompts`` — this service is
intentionally prompt-agnostic and accepts a ``system_prompt`` parameter on
every method so callers control the persona and instructions.

Error handling strategy
-----------------------
All public methods translate raw OpenAI / network errors into one of three
outcomes so callers never receive a bare ``openai.*Error``:

* **Retryable transient errors** (rate limits, 429, 503, connection resets) —
  retried up to ``_MAX_RETRIES`` times with exponential back-off.  If all
  attempts fail the method raises ``AIServiceError``.

* **Non-retryable API errors** (invalid key, context-length exceeded, content
  policy) — raised immediately as ``AIServiceError`` with a user-facing
  ``user_message`` that endpoint handlers can forward to the client.

* **Structured-output validation failures** — ``chat_structured`` catches
  ``pydantic.ValidationError`` and raises ``AIServiceError`` rather than
  leaking Pydantic internals to the API layer.

Streaming errors
----------------
``chat_stream`` is an async generator.  If the stream breaks mid-response the
``try/finally`` block logs the failure; the *caller's* ``event_stream``
generator is responsible for catching ``AIServiceError`` and emitting a
terminal SSE error event before closing the connection (see endpoints/agent.py
and endpoints/ai.py).

Structured outputs
------------------
``chat_structured`` sends ``response_format={"type": "json_object"}`` and
validates the raw JSON against a caller-supplied Pydantic model.  Use this
when you need a typed, machine-readable response instead of prose.
"""

import asyncio
from collections.abc import AsyncGenerator
from typing import TypeVar

from openai import AsyncOpenAI, APIConnectionError, APIStatusError, RateLimitError
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.core.prompts import CHAT_SYSTEM_PROMPT
from app.core.logging import get_logger
from app.schemas.ai import ChatMessage, EmbeddingResponse

logger = get_logger(__name__)

_T = TypeVar("_T", bound=BaseModel)

# Keep the old import alias working for any callers that import this directly.
AI_DEFAULT_SYSTEM_PROMPT = CHAT_SYSTEM_PROMPT

# ── Retry configuration ───────────────────────────────────────────────────────
# Retry on transient errors (rate limits, temporary API unavailability).
# Exponential back-off: wait 1s, 2s, 4s between attempts.
_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 1.0  # seconds

# ── Error types ───────────────────────────────────────────────────────────────

class AIServiceError(Exception):
    """Raised when an OpenAI call fails after retries or with a non-retryable error.

    ``user_message`` is a safe, human-readable string suitable for forwarding
    to the API client.  ``cause`` holds the original exception for logging.
    """

    def __init__(self, user_message: str, cause: Exception | None = None) -> None:
        super().__init__(user_message)
        self.user_message = user_message
        self.cause = cause


def _is_retryable(exc: Exception) -> bool:
    """Return True for transient errors that are safe to retry."""
    if isinstance(exc, RateLimitError):
        return True
    if isinstance(exc, APIConnectionError):
        return True
    if isinstance(exc, APIStatusError):
        # 429 Too Many Requests, 503 Service Unavailable
        return exc.status_code in (429, 503)
    return False


def _user_message_for(exc: Exception) -> str:
    """Map an OpenAI exception to a safe, human-readable error string."""
    if isinstance(exc, RateLimitError):
        return (
            "I'm experiencing high demand right now and hit a rate limit. "
            "Please wait a moment and try again."
        )
    if isinstance(exc, APIStatusError):
        if exc.status_code == 401:
            return "The AI service is not properly configured. Please contact support."
        if exc.status_code == 413 or "context_length_exceeded" in str(exc):
            return (
                "Your conversation is too long for me to process. "
                "Try starting a new conversation or shortening your message."
            )
        if exc.status_code == 400 and "content_policy" in str(exc).lower():
            return "Your message was flagged by the content policy. Please rephrase and try again."
        if exc.status_code in (502, 503, 504):
            return "The AI service is temporarily unavailable. Please try again in a moment."
    if isinstance(exc, APIConnectionError):
        return "I couldn't reach the AI service. Please check your connection and try again."
    return "Sorry, something went wrong with the AI service. Please try again."


# ── Client singleton ──────────────────────────────────────────────────────────

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


# ── Service ───────────────────────────────────────────────────────────────────

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
        system_prompt: str = CHAT_SYSTEM_PROMPT,
    ) -> tuple[str, int]:
        """Return ``(response_content, tokens_used)``.

        Retries up to ``_MAX_RETRIES`` times on transient errors with
        exponential back-off.  Raises ``AIServiceError`` on final failure.
        """
        payload = [{"role": "system", "content": system_prompt}]
        payload += [m.model_dump() for m in messages]

        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES):
            try:
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

            except Exception as exc:
                last_exc = exc
                if _is_retryable(exc) and attempt < _MAX_RETRIES - 1:
                    delay = _RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "ai_chat_retrying",
                        attempt=attempt + 1,
                        delay=delay,
                        error=str(exc),
                    )
                    await asyncio.sleep(delay)
                    continue
                break

        logger.error("ai_chat_failed", attempts=_MAX_RETRIES, error=str(last_exc))
        raise AIServiceError(_user_message_for(last_exc), cause=last_exc)

    async def chat_structured(
        self,
        messages: list[ChatMessage],
        response_schema: type[_T],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        system_prompt: str = CHAT_SYSTEM_PROMPT,
    ) -> tuple[_T, int]:
        """Return a validated Pydantic model instead of raw text.

        Instructs OpenAI to emit JSON (``response_format="json_object"``) and
        validates the response against ``response_schema``.  This ensures the
        LLM output is always well-typed and catches hallucinated or missing
        fields before they propagate to callers.

        Raises ``AIServiceError`` if:
        - The OpenAI call fails after retries.
        - The returned JSON does not validate against ``response_schema``
          (catches Pydantic ``ValidationError`` so callers never see it raw).

        The ``system_prompt`` should include an explicit instruction to return
        JSON matching the schema — e.g. "Respond with JSON matching this schema:
        <schema>".  Without that instruction the model may produce valid JSON
        but with different field names.
        """
        payload = [{"role": "system", "content": system_prompt}]
        payload += [m.model_dump() for m in messages]

        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES):
            try:
                response = await self._client.chat.completions.create(
                    model=model or settings.OPENAI_MODEL,
                    messages=payload,  # type: ignore[arg-type]
                    temperature=temperature if temperature is not None else settings.OPENAI_TEMPERATURE,
                    max_tokens=max_tokens or settings.OPENAI_MAX_TOKENS,
                    response_format={"type": "json_object"},
                )
                raw = response.choices[0].message.content or "{}"
                tokens = response.usage.total_tokens if response.usage else 0

                logger.info(
                    "ai_chat_structured_completed",
                    model=response.model,
                    tokens=tokens,
                    schema=response_schema.__name__,
                )

                try:
                    validated = response_schema.model_validate_json(raw)
                except ValidationError as ve:
                    # The model returned valid JSON but with the wrong shape.
                    # Log the raw output for debugging; raise a clean error to the caller.
                    logger.error(
                        "ai_structured_validation_failed",
                        schema=response_schema.__name__,
                        raw=raw[:500],
                        errors=ve.error_count(),
                    )
                    raise AIServiceError(
                        f"The AI returned a response that didn't match the expected format "
                        f"({response_schema.__name__}). Please try again.",
                        cause=ve,
                    )

                return validated, tokens

            except AIServiceError:
                raise  # validation errors are not retried
            except Exception as exc:
                last_exc = exc
                if _is_retryable(exc) and attempt < _MAX_RETRIES - 1:
                    delay = _RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "ai_structured_retrying",
                        attempt=attempt + 1,
                        delay=delay,
                        error=str(exc),
                    )
                    await asyncio.sleep(delay)
                    continue
                break

        logger.error("ai_structured_failed", attempts=_MAX_RETRIES, error=str(last_exc))
        raise AIServiceError(_user_message_for(last_exc), cause=last_exc)

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        system_prompt: str = CHAT_SYSTEM_PROMPT,
    ) -> AsyncGenerator[str, None]:
        """Yield content chunks as they stream in.

        The stream setup (``create`` call) is retried on transient errors.
        Once the stream is open, individual chunk errors are logged and re-raised
        as ``AIServiceError`` — the caller's ``event_stream`` generator must
        catch this and emit a terminal SSE error event.
        """
        payload = [{"role": "system", "content": system_prompt}]
        payload += [m.model_dump() for m in messages]

        resolved_model = model or settings.OPENAI_MODEL
        resolved_temp = temperature if temperature is not None else settings.OPENAI_TEMPERATURE
        resolved_max = max_tokens or settings.OPENAI_MAX_TOKENS

        # Retry the initial stream-open call; once streaming starts we cannot retry.
        last_exc: Exception | None = None
        stream = None
        for attempt in range(_MAX_RETRIES):
            try:
                stream = await self._client.chat.completions.create(
                    model=resolved_model,
                    messages=payload,  # type: ignore[arg-type]
                    temperature=resolved_temp,
                    max_tokens=resolved_max,
                    stream=True,
                    stream_options={"include_usage": True},
                )
                break
            except Exception as exc:
                last_exc = exc
                if _is_retryable(exc) and attempt < _MAX_RETRIES - 1:
                    delay = _RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "ai_stream_open_retrying",
                        attempt=attempt + 1,
                        delay=delay,
                        error=str(exc),
                    )
                    await asyncio.sleep(delay)
                    continue
                break

        if stream is None:
            logger.error("ai_stream_open_failed", attempts=_MAX_RETRIES, error=str(last_exc))
            raise AIServiceError(_user_message_for(last_exc), cause=last_exc)

        # Yield chunks; wrap iteration errors so callers get AIServiceError
        try:
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
        except Exception as exc:
            logger.error("ai_stream_chunk_error", model=resolved_model, error=str(exc))
            raise AIServiceError(_user_message_for(exc), cause=exc)

    async def embed(self, texts: list[str]) -> EmbeddingResponse:
        """Generate embeddings for a batch of texts.

        Retries on transient errors; raises ``AIServiceError`` on final failure.
        """
        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES):
            try:
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
            except Exception as exc:
                last_exc = exc
                if _is_retryable(exc) and attempt < _MAX_RETRIES - 1:
                    delay = _RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "ai_embed_retrying",
                        attempt=attempt + 1,
                        delay=delay,
                        error=str(exc),
                    )
                    await asyncio.sleep(delay)
                    continue
                break

        logger.error("ai_embed_failed", attempts=_MAX_RETRIES, error=str(last_exc))
        raise AIServiceError(_user_message_for(last_exc), cause=last_exc)

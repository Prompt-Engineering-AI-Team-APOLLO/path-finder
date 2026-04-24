import uuid

from pydantic import BaseModel, Field, model_validator


class ChatMessage(BaseModel):
    role: str = Field(pattern=r"^(user|assistant|system)$")
    content: str = Field(min_length=0, max_length=32_000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    conversation_id: uuid.UUID | None = None
    stream: bool = False
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=16_000)

    @model_validator(mode="after")
    def drop_empty_content_messages(self) -> "ChatRequest":
        """Strip assistant turns with empty content (tool-calling turns from the
        OpenAI API have content='' or content=null and are not useful when
        replayed as conversation history)."""
        self.messages = [m for m in self.messages if m.content.strip()]
        return self


class ChatResponse(BaseModel):
    content: str
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    model: str
    tokens_used: int


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)


class EmbeddingResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    tokens_used: int


class VectorSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=50)
    score_threshold: float = Field(default=0.75, ge=0.0, le=1.0)
    namespace: str | None = None


class VectorSearchResult(BaseModel):
    id: str
    score: float
    metadata: dict


class VectorSearchResponse(BaseModel):
    results: list[VectorSearchResult]
    query: str

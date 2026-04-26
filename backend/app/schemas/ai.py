import uuid
from typing import Literal

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


# ── Structured output schemas ─────────────────────────────────────────────────
# These Pydantic models define the JSON shape we ask the LLM to emit when
# response_format={"type": "json_object"} is set on the AIService.chat() call.
# Using explicit schemas (rather than free-form JSON) lets us:
#   1. Validate the model's output with model_validate_json() immediately.
#   2. Catch hallucinated or missing fields before they reach the frontend.
#   3. Document the contract between prompt and caller in one place.


class FlightOfferSummary(BaseModel):
    """Structured summary of a single flight offer, as returned by the LLM.

    Used when asking the model to distil search results into a ranked list
    rather than prose — gives the frontend a predictable shape to render.
    """

    offer_id: str = Field(description="Opaque offer identifier from the search result")
    airline: str
    flight_number: str
    departure_at: str = Field(description="ISO 8601 departure datetime")
    arrival_at: str = Field(description="ISO 8601 arrival datetime")
    stops: int = Field(ge=0)
    cabin_class: Literal["economy", "premium_economy", "business", "first"]
    total_price: float = Field(gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    recommended: bool = Field(
        default=False,
        description="True for the single best value-for-money option the model identified",
    )
    recommendation_reason: str | None = Field(
        default=None,
        description="One-sentence rationale when recommended=True",
    )


class FlightSearchSummaryResponse(BaseModel):
    """Structured response for the /ai/flight-summary endpoint.

    The LLM is instructed to populate this schema directly so callers receive
    typed, validated data instead of markdown prose.
    """

    origin: str
    destination: str
    departure_date: str
    passengers: int = Field(ge=1)
    outbound_offers: list[FlightOfferSummary] = Field(
        max_length=4, description="Top outbound offers, best-value first"
    )
    return_offers: list[FlightOfferSummary] | None = Field(
        default=None, description="Top return offers for round-trips; null for one-way"
    )
    summary: str = Field(
        description="2–3 sentence natural-language summary of the best options"
    )


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

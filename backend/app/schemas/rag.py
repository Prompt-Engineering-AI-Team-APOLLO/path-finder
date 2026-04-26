"""Schemas for the RAG (Retrieval-Augmented Generation) pipeline.

Every schema here corresponds to a discrete stage in the pipeline:
  Ingest  →  DocumentIn → ChunkRecord (stored in vector DB)
  Retrieve →  RAGQuery   → RetrievedChunk → RetrievedContext
  Generate →  RAGRequest → RAGResponse
"""

import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Ingest stage ──────────────────────────────────────────────────────────────


class DocumentIn(BaseModel):
    """A raw document to be chunked and indexed.

    ``source`` and ``doc_type`` are stored as chunk metadata so later
    metadata-filter queries can scope retrieval to a specific data source
    (e.g. only policy docs, only a particular airline's FAQ).
    """

    text: str = Field(min_length=1, max_length=500_000)
    doc_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Stable identifier for this document; used to replace/delete all its chunks",
    )
    source: str = Field(
        default="unknown",
        description="Human-readable origin label (e.g. 'airline_faq', 'booking_policy')",
    )
    doc_type: Literal["faq", "policy", "route_info", "general"] = "general"
    namespace: str | None = Field(
        default=None,
        description="Pinecone namespace to isolate index partitions (e.g. per-tenant)",
    )
    extra_metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary key-value pairs merged into every chunk's metadata",
    )


class ChunkRecord(BaseModel):
    """A single chunk after splitting, ready to embed and upsert.

    Metadata fields are stored verbatim in Pinecone so they can be used
    in metadata filter expressions at query time.
    """

    chunk_id: str = Field(description="Globally unique chunk identifier (doc_id + index)")
    doc_id: str
    chunk_index: int = Field(ge=0, description="0-based position within the source document")
    total_chunks: int = Field(ge=1)
    text: str
    char_offset: int = Field(ge=0, description="Character offset of this chunk in the original text")
    source: str
    doc_type: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class IngestResponse(BaseModel):
    doc_id: str
    chunks_created: int
    vectors_upserted: int
    namespace: str | None


class DeleteDocumentResponse(BaseModel):
    doc_id: str
    chunks_deleted: int


# ── Retrieval stage ───────────────────────────────────────────────────────────


class MetadataFilter(BaseModel):
    """Pinecone metadata filter expression.

    Maps directly to Pinecone's filter syntax:
      {"source": {"$eq": "airline_faq"}}
      {"doc_type": {"$in": ["faq", "policy"]}}

    Keeping this as a typed model (rather than ``dict``) makes the supported
    operators discoverable and lets us validate before hitting the API.
    """

    field: str = Field(description="Metadata field name to filter on")
    op: Literal["$eq", "$ne", "$in", "$nin", "$gt", "$gte", "$lt", "$lte"] = "$eq"
    value: Any = Field(description="Filter value; use a list for $in / $nin")

    def to_pinecone(self) -> dict[str, Any]:
        """Serialise to the dict format Pinecone expects in the ``filter`` arg."""
        return {self.field: {self.op: self.value}}


class RAGQuery(BaseModel):
    """Query parameters for the retrieval stage."""

    query: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=6, ge=1, le=20)
    score_threshold: float = Field(default=0.70, ge=0.0, le=1.0)
    namespace: str | None = None
    filters: list[MetadataFilter] = Field(
        default_factory=list,
        description="All filters are AND-ed together before the vector search",
    )
    # Context window budget in approximate tokens (chars / 4).
    # Chunks are added in score order until the budget is exhausted.
    context_token_budget: int = Field(
        default=2000,
        ge=100,
        le=8000,
        description="Max tokens of retrieved text to include in the LLM context window",
    )


class RetrievedChunk(BaseModel):
    """A single chunk returned from the vector store with its score."""

    chunk_id: str
    doc_id: str
    chunk_index: int
    total_chunks: int
    text: str
    score: float
    source: str
    doc_type: str
    metadata: dict[str, Any]


class RetrievedContext(BaseModel):
    """Assembled retrieval result: ranked chunks + the formatted context string.

    ``context_text`` is the ready-to-inject string passed into the RAG prompt.
    ``chunks_used`` is the subset of top_k chunks that fit within the token budget.
    ``chunks_truncated`` is how many scored-but-excluded chunks were dropped.
    """

    query: str
    chunks_used: list[RetrievedChunk]
    chunks_truncated: int
    context_text: str
    total_tokens_estimate: int


# ── Generate stage ────────────────────────────────────────────────────────────


class RAGRequest(BaseModel):
    """End-to-end RAG request: retrieve + generate in one call."""

    query: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=6, ge=1, le=20)
    score_threshold: float = Field(default=0.70, ge=0.0, le=1.0)
    namespace: str | None = None
    filters: list[MetadataFilter] = Field(default_factory=list)
    context_token_budget: int = Field(default=2000, ge=100, le=8000)
    temperature: float = Field(default=0.2, ge=0.0, le=1.0,
                               description="Lower than chat default — factual grounding preferred; see config.RAG_TEMPERATURE")
    system_prompt_override: str | None = Field(
        default=None,
        description="Replace the default RAG system prompt; useful for domain-specific personas",
    )


class RAGResponse(BaseModel):
    answer: str
    sources: list[str] = Field(description="Deduplicated source labels for attribution")
    chunks_used: int
    tokens_used: int
    retrieval_scores: list[float] = Field(
        description="Cosine similarity scores for each chunk used, for observability"
    )

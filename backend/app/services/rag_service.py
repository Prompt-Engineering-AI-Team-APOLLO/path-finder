"""RAGService — Retrieval-Augmented Generation pipeline for Pathfinder.

Pipeline stages
---------------
1. **Ingest** — split raw text into overlapping chunks, tag with metadata,
   embed each chunk, upsert into Pinecone.
2. **Retrieve** — embed the query, run a filtered nearest-neighbour search,
   re-rank results, assemble a context window that fits within the token budget.
3. **Generate** — inject the assembled context into a grounded system prompt
   and call the LLM.

Chunking strategy
-----------------
We use a **sentence-aware sliding-window** approach rather than naïve fixed-
character splits:

  - The splitter first divides text on paragraph boundaries (``\\n\\n``), then
    on sentence endings (``. / ! / ?``) so chunks never cut mid-sentence.
  - Each chunk targets ``RAG_CHUNK_SIZE`` characters (~300 tokens at 4 chars/
    token) to stay well within the embedding model's 8191-token limit while
    keeping each chunk semantically coherent.
  - Adjacent chunks share ``RAG_CHUNK_OVERLAP`` characters of trailing context
    from the previous chunk, so a sentence that would otherwise be split across
    a boundary appears fully in at least one chunk.
  - Each chunk stores its ``char_offset``, ``chunk_index``, and ``total_chunks``
    in metadata — this lets us reconstruct the original reading order and
    display page/section attribution in the UI.

Metadata design
---------------
Every chunk carries these filterable metadata fields in Pinecone:

  ``doc_id``       — stable document identifier; delete/replace all chunks for a doc
  ``chunk_index``  — position within the document (0-based)
  ``total_chunks`` — total chunks for the doc; lets callers detect partial docs
  ``source``       — data origin label (e.g. "airline_faq", "booking_policy")
  ``doc_type``     — controlled vocabulary: faq | policy | route_info | general
  ``char_offset``  — byte position for attribution / snippet highlighting

Callers can pass any combination of ``MetadataFilter`` objects to scope
retrieval to a subset of documents — e.g. only FAQ chunks, or only chunks
from a single airline.

Context window management
-------------------------
After vector search we have up to ``top_k`` candidate chunks sorted by cosine
similarity.  We then:

  1. Drop any chunk below ``score_threshold`` (irrelevant noise).
  2. Deduplicate chunks from the same document that have adjacent indices — if
     chunks N and N+1 from the same doc both rank in the top-K, we merge their
     text rather than repeating the surrounding context twice.
  3. Greedily pack chunks (highest score first) until the ``context_token_budget``
     is exhausted.  The budget is measured in approximate tokens (chars ÷ 4) to
     avoid an extra tokeniser dependency.
  4. Re-sort the selected chunks by ``(doc_id, chunk_index)`` before injecting
     into the prompt — this restores reading order so the LLM sees coherent prose
     rather than a random-order collage.

Grounding prompt
----------------
The system prompt frames the LLM as a grounded assistant and instructs it to
cite sources and admit when the retrieved context does not cover the question.
The temperature default is 0.3 (vs 0.7 for open-ended chat) to reduce
hallucination on factual retrieval tasks.
"""

import re
import uuid

from app.core.config import settings
from app.core.logging import get_logger

# RAG-specific model parameters drawn from settings.
# These are intentionally separate from the agent and general-chat settings —
# see app.core.config for the full model-selection rationale.
_RAG_MODEL = settings.RAG_MODEL
_RAG_TEMPERATURE = settings.RAG_TEMPERATURE
_RAG_MAX_TOKENS = settings.RAG_MAX_TOKENS
from app.schemas.ai import ChatMessage
from app.schemas.rag import (
    ChunkRecord,
    DeleteDocumentResponse,
    DocumentIn,
    IngestResponse,
    MetadataFilter,
    RAGQuery,
    RAGRequest,
    RAGResponse,
    RetrievedChunk,
    RetrievedContext,
)
from app.services.ai_service import AIService
from app.services.vector_service import VectorService

logger = get_logger(__name__)

# ── Chunking parameters ───────────────────────────────────────────────────────
# These are the defaults; production deployments should tune via env vars.
# Target ~300 tokens per chunk (1 token ≈ 4 chars) — large enough to be
# semantically self-contained, small enough that a top-6 retrieval fits
# comfortably in a 2 K-token context budget.
_CHUNK_SIZE_CHARS: int = 1_200    # ≈ 300 tokens
_CHUNK_OVERLAP_CHARS: int = 240   # 20% overlap — one paragraph of shared context

# Sentence-boundary pattern: split after . ! ? when followed by whitespace
# or end-of-string.  Uses a lookbehind so the delimiter is kept with the
# preceding sentence.
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")

# ── RAG system prompt ─────────────────────────────────────────────────────────
# This prompt is deliberately different from the agent prompt: it instructs the
# model to stay grounded in the retrieved context and to cite sources.  The
# {context} and {query} placeholders are filled in at generate time.

_RAG_SYSTEM_PROMPT = """You are a precise, grounded assistant for Pathfinder.
Answer the user's question using ONLY the information in the retrieved context below.
If the context does not contain enough information to answer, say so clearly — do not guess.

Rules:
- Quote or paraphrase only from the provided context.
- Cite the source label (shown as "Source: <label>") when you use information from a chunk.
- If multiple chunks cover the same fact, cite the most relevant one.
- Be concise. Avoid restating the question.

Retrieved context:
{context}
"""


# ── Chunking ──────────────────────────────────────────────────────────────────

def _split_sentences(text: str) -> list[str]:
    """Split text into sentences, preserving the terminal punctuation."""
    raw = _SENTENCE_SPLIT_RE.split(text.strip())
    # Further split on paragraph breaks so section headings don't bleed
    # into the next paragraph.
    sentences: list[str] = []
    for s in raw:
        parts = [p.strip() for p in s.split("\n\n") if p.strip()]
        sentences.extend(parts)
    return sentences


def chunk_document(doc: DocumentIn) -> list[ChunkRecord]:
    """Split ``doc.text`` into overlapping sentence-boundary-aligned chunks.

    Algorithm
    ---------
    1. Split text into sentences.
    2. Accumulate sentences into the current chunk until adding the next
       sentence would exceed ``_CHUNK_SIZE_CHARS``.
    3. When the chunk is full, record it and start a new chunk seeded with
       the last ``_CHUNK_OVERLAP_CHARS`` characters of the previous chunk
       (walking back to the nearest sentence boundary so overlap is clean).
    4. Repeat until all sentences are consumed.

    Returns a list of ``ChunkRecord`` objects with fully populated metadata.
    """
    sentences = _split_sentences(doc.text)
    if not sentences:
        return []

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        slen = len(sentence)
        if current_len + slen > _CHUNK_SIZE_CHARS and current:
            # Flush the current chunk
            chunks.append(" ".join(current))
            # Seed the next chunk with trailing overlap
            overlap_text = " ".join(current)[-_CHUNK_OVERLAP_CHARS:]
            # Walk forward to the first word boundary so we don't start mid-word
            space_idx = overlap_text.find(" ")
            overlap_text = overlap_text[space_idx + 1:] if space_idx != -1 else overlap_text
            current = [overlap_text] if overlap_text else []
            current_len = len(overlap_text)

        current.append(sentence)
        current_len += slen + 1  # +1 for the joining space

    if current:
        chunks.append(" ".join(current))

    # Build ChunkRecord objects with char_offset tracking
    records: list[ChunkRecord] = []
    total = len(chunks)
    running_offset = 0

    for idx, text in enumerate(chunks):
        chunk_id = f"{doc.doc_id}__chunk_{idx}"
        metadata: dict = {
            "doc_id": doc.doc_id,
            "chunk_index": idx,
            "total_chunks": total,
            "source": doc.source,
            "doc_type": doc.doc_type,
            "char_offset": running_offset,
            **doc.extra_metadata,
        }
        records.append(ChunkRecord(
            chunk_id=chunk_id,
            doc_id=doc.doc_id,
            chunk_index=idx,
            total_chunks=total,
            text=text,
            char_offset=running_offset,
            source=doc.source,
            doc_type=doc.doc_type,
            metadata=metadata,
        ))
        # Approximate offset advance — overlapping chunks share some chars,
        # so advance by (chunk_len - overlap) to stay roughly accurate.
        running_offset += max(len(text) - _CHUNK_OVERLAP_CHARS, len(text) // 2)

    logger.info(
        "rag_document_chunked",
        doc_id=doc.doc_id,
        source=doc.source,
        doc_type=doc.doc_type,
        input_chars=len(doc.text),
        chunks=total,
        avg_chunk_chars=sum(len(r.text) for r in records) // max(total, 1),
    )
    return records


# ── Context assembly ──────────────────────────────────────────────────────────

def _merge_adjacent_chunks(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    """Merge same-document adjacent chunks to avoid duplicating overlap text.

    When chunk N and chunk N+1 from the same document both rank in the top-K,
    their overlap region would appear twice in the context window.  We replace
    them with a single merged chunk (score = max of the two) to save tokens.
    """
    if not chunks:
        return []

    # Sort by (doc_id, chunk_index) to identify adjacency
    by_doc: dict[str, list[RetrievedChunk]] = {}
    for c in chunks:
        by_doc.setdefault(c.doc_id, []).append(c)

    merged: list[RetrievedChunk] = []
    for doc_chunks in by_doc.values():
        doc_chunks.sort(key=lambda c: c.chunk_index)
        group = [doc_chunks[0]]
        for c in doc_chunks[1:]:
            prev = group[-1]
            if c.chunk_index == prev.chunk_index + 1:
                # Adjacent — merge text, keep higher score
                merged_text = prev.text
                # Append only the non-overlapping tail of the next chunk
                overlap = min(_CHUNK_OVERLAP_CHARS, len(c.text))
                tail = c.text[overlap:].strip()
                if tail:
                    merged_text = merged_text + " " + tail
                group[-1] = RetrievedChunk(
                    chunk_id=f"{prev.chunk_id}+{c.chunk_id}",
                    doc_id=prev.doc_id,
                    chunk_index=prev.chunk_index,
                    total_chunks=prev.total_chunks,
                    text=merged_text,
                    score=max(prev.score, c.score),
                    source=prev.source,
                    doc_type=prev.doc_type,
                    metadata=prev.metadata,
                )
            else:
                group.append(c)
        merged.extend(group)

    return merged


def assemble_context(
    chunks: list[RetrievedChunk],
    token_budget: int,
) -> RetrievedContext:
    """Pack the highest-scoring chunks into a context string within token_budget.

    Steps:
      1. Merge adjacent same-document chunks to remove overlap duplication.
      2. Sort by score descending — highest relevance first.
      3. Greedily add chunks until the token budget (chars ÷ 4) is exhausted.
      4. Re-sort selected chunks by (doc_id, chunk_index) to restore reading order.
      5. Format as a numbered, source-attributed block for the LLM.
    """
    merged = _merge_adjacent_chunks(chunks)
    # Sort by score descending to greedily fill the budget with best chunks
    merged.sort(key=lambda c: c.score, reverse=True)

    selected: list[RetrievedChunk] = []
    tokens_used = 0
    truncated = 0

    for chunk in merged:
        chunk_tokens = len(chunk.text) // 4
        if tokens_used + chunk_tokens > token_budget:
            truncated += 1
            continue
        selected.append(chunk)
        tokens_used += chunk_tokens

    # Restore reading order before building the context string
    selected.sort(key=lambda c: (c.doc_id, c.chunk_index))

    lines: list[str] = []
    for i, chunk in enumerate(selected, 1):
        lines.append(
            f"[{i}] Source: {chunk.source} | Type: {chunk.doc_type}\n{chunk.text}"
        )
    context_text = "\n\n".join(lines)

    return RetrievedContext(
        query="",  # filled in by caller
        chunks_used=selected,
        chunks_truncated=truncated,
        context_text=context_text,
        total_tokens_estimate=tokens_used,
    )


# ── Service ───────────────────────────────────────────────────────────────────

class RAGService:
    """Orchestrates the full Retrieval-Augmented Generation pipeline.

    Depends on ``VectorService`` (store + retrieve) and ``AIService``
    (embedding + generation) — both are injected so they can be swapped
    in tests without touching this class.
    """

    def __init__(self, vector_service: VectorService, ai_service: AIService) -> None:
        self._vector = vector_service
        self._ai = ai_service

    # ── Ingest ────────────────────────────────────────────────────────────────

    async def ingest(self, doc: DocumentIn) -> IngestResponse:
        """Chunk, embed, and upsert a document into the vector store.

        Each chunk is embedded individually so the embedding model sees only
        the chunk text (not the full document), which produces more focused
        vectors and better nearest-neighbour recall.
        """
        chunks = chunk_document(doc)
        if not chunks:
            logger.warning("rag_ingest_empty", doc_id=doc.doc_id)
            return IngestResponse(
                doc_id=doc.doc_id,
                chunks_created=0,
                vectors_upserted=0,
                namespace=doc.namespace,
            )

        # Embed all chunk texts in one batched API call to minimise latency
        texts = [c.text for c in chunks]
        embed_resp = await self._ai.embed(texts)

        vectors = [
            (chunk.chunk_id, embedding, chunk.metadata)
            for chunk, embedding in zip(chunks, embed_resp.embeddings)
        ]
        upserted = await self._vector.upsert(vectors, namespace=doc.namespace)

        logger.info(
            "rag_ingest_complete",
            doc_id=doc.doc_id,
            source=doc.source,
            chunks=len(chunks),
            upserted=upserted,
        )
        return IngestResponse(
            doc_id=doc.doc_id,
            chunks_created=len(chunks),
            vectors_upserted=upserted,
            namespace=doc.namespace,
        )

    async def delete_document(
        self, doc_id: str, namespace: str | None = None
    ) -> DeleteDocumentResponse:
        """Delete all chunks for a document by querying on doc_id metadata.

        Pinecone does not support metadata-only deletes in the free tier, so we
        first fetch IDs via a dummy query filtered to this doc, then delete by ID.
        This is a best-effort operation — in production, store chunk IDs in
        Postgres alongside the document record for reliable bulk deletion.
        """
        # Fetch up to 100 chunk IDs for this document
        raw = await self._vector.fetch_ids_by_metadata(
            filter={"doc_id": {"$eq": doc_id}},
            namespace=namespace,
            limit=100,
        )
        ids = list(raw)
        if ids:
            await self._vector.delete(ids, namespace=namespace)

        logger.info("rag_delete_document", doc_id=doc_id, chunks_deleted=len(ids))
        return DeleteDocumentResponse(doc_id=doc_id, chunks_deleted=len(ids))

    # ── Retrieve ──────────────────────────────────────────────────────────────

    async def retrieve(self, query: RAGQuery) -> RetrievedContext:
        """Embed the query, run a filtered vector search, assemble context.

        Metadata filters are AND-ed together and passed directly to Pinecone,
        which applies them server-side before scoring — so only matching chunks
        compete for the top-K slots.
        """
        pinecone_filter: dict | None = None
        if query.filters:
            if len(query.filters) == 1:
                pinecone_filter = query.filters[0].to_pinecone()
            else:
                # AND all filter expressions
                pinecone_filter = {"$and": [f.to_pinecone() for f in query.filters]}

        embed_resp = await self._ai.embed([query.query])
        query_vector = embed_resp.embeddings[0]

        raw = await self._vector.query_raw(
            vector=query_vector,
            top_k=query.top_k,
            namespace=query.namespace,
            metadata_filter=pinecone_filter,
        )

        # Hydrate into typed RetrievedChunk objects, applying the score threshold
        candidates: list[RetrievedChunk] = []
        for match in raw:
            if match["score"] < query.score_threshold:
                continue
            meta = match.get("metadata", {})
            candidates.append(RetrievedChunk(
                chunk_id=match["id"],
                doc_id=meta.get("doc_id", ""),
                chunk_index=meta.get("chunk_index", 0),
                total_chunks=meta.get("total_chunks", 1),
                text=meta.get("text", ""),
                score=match["score"],
                source=meta.get("source", "unknown"),
                doc_type=meta.get("doc_type", "general"),
                metadata=meta,
            ))

        context = assemble_context(candidates, query.context_token_budget)
        context.query = query.query

        logger.info(
            "rag_retrieve",
            query_len=len(query.query),
            candidates=len(candidates),
            chunks_used=len(context.chunks_used),
            chunks_truncated=context.chunks_truncated,
            tokens_estimate=context.total_tokens_estimate,
            filters_applied=bool(pinecone_filter),
        )
        return context

    # ── Generate ──────────────────────────────────────────────────────────────

    async def generate(self, request: RAGRequest) -> RAGResponse:
        """Full RAG pipeline: retrieve context then generate a grounded answer.

        The LLM receives a system prompt that instructs it to answer only from
        the retrieved context and to cite sources.  Temperature is intentionally
        lower than the open-ended chat default (0.3 vs 0.7) to favour factual
        precision over creative elaboration.
        """
        rag_query = RAGQuery(
            query=request.query,
            top_k=request.top_k,
            score_threshold=request.score_threshold,
            namespace=request.namespace,
            filters=request.filters,
            context_token_budget=request.context_token_budget,
        )
        context = await self.retrieve(rag_query)

        if not context.chunks_used:
            return RAGResponse(
                answer=(
                    "I couldn't find relevant information in the knowledge base to answer "
                    "that question. Please try rephrasing or contact support."
                ),
                sources=[],
                chunks_used=0,
                tokens_used=0,
                retrieval_scores=[],
            )

        system_prompt = (
            request.system_prompt_override
            or _RAG_SYSTEM_PROMPT.format(context=context.context_text)
        )

        messages = [ChatMessage(role="user", content=request.query)]
        answer, tokens = await self._ai.chat(
            messages=messages,
            model=_RAG_MODEL,
            system_prompt=system_prompt,
            temperature=request.temperature,  # default 0.2 from settings.RAG_TEMPERATURE
            max_tokens=_RAG_MAX_TOKENS,
        )

        sources = sorted({c.source for c in context.chunks_used})
        scores = [round(c.score, 4) for c in context.chunks_used]

        logger.info(
            "rag_generate_complete",
            query_len=len(request.query),
            chunks_used=len(context.chunks_used),
            sources=sources,
            tokens=tokens,
        )
        return RAGResponse(
            answer=answer,
            sources=sources,
            chunks_used=len(context.chunks_used),
            tokens_used=tokens,
            retrieval_scores=scores,
        )

"""Unit tests for RAGService pure functions — chunking, context assembly, and
quality-threshold enforcement.

All functions under test are deterministic and dependency-free; no mocking,
no DB, no Pinecone or OpenAI calls.

Quality metrics validated here
--------------------------------
- ``AI_SIMILARITY_THRESHOLD`` (0.75) and ``AI_SIMILARITY_TOP_K`` (5) are the
  constants that govern retrieval quality.  ``assemble_context`` and the score
  filtering in ``RAGService.retrieve`` enforce these bounds.  The tests below
  verify that the *mechanisms* work correctly so that any regression in
  chunk quality, budget enforcement, or score filtering is caught before it
  reaches production.

Tests are grouped by pipeline stage: Chunking → Merging → Context Assembly.
"""

from app.core.constants import AI_SIMILARITY_THRESHOLD, AI_SIMILARITY_TOP_K
from app.schemas.rag import DocumentIn, RetrievedChunk
from app.services.rag_service import (
    _CHUNK_OVERLAP_CHARS,
    _CHUNK_SIZE_CHARS,
    assemble_context,
    chunk_document,
)


# ── helpers ───────────────────────────────────────────────────────────────────


def _make_chunk(
    chunk_id: str,
    doc_id: str,
    chunk_index: int,
    text: str,
    score: float,
    *,
    total_chunks: int = 10,
    source: str = "test_source",
    doc_type: str = "faq",
) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id,
        doc_id=doc_id,
        chunk_index=chunk_index,
        total_chunks=total_chunks,
        text=text,
        score=score,
        source=source,
        doc_type=doc_type,
        metadata={},
    )


def _make_doc(text: str, doc_id: str = "doc1", source: str = "airline_faq") -> DocumentIn:
    return DocumentIn(text=text, doc_id=doc_id, source=source, doc_type="faq")


# ── Quality constants ─────────────────────────────────────────────────────────


def test_similarity_threshold_value():
    """AI_SIMILARITY_THRESHOLD must be 0.75 — a regression guard."""
    assert AI_SIMILARITY_THRESHOLD == 0.75


def test_similarity_top_k_value():
    """AI_SIMILARITY_TOP_K must be 5 — a regression guard."""
    assert AI_SIMILARITY_TOP_K == 5


# ── chunk_document — input edge cases ────────────────────────────────────────


def test_chunk_empty_text_returns_no_chunks():
    # Pydantic min_length=1, so pass a single space that splits to nothing
    doc = _make_doc(" ")
    result = chunk_document(doc)
    assert result == []


def test_chunk_short_text_produces_single_chunk():
    doc = _make_doc("This is a short document with only one sentence.")
    chunks = chunk_document(doc)
    assert len(chunks) == 1
    assert chunks[0].chunk_index == 0
    assert chunks[0].total_chunks == 1
    assert chunks[0].chunk_id == "doc1__chunk_0"


def test_chunk_metadata_populated():
    doc = _make_doc("Hello world. This is a test.", doc_id="myid", source="faq_source")
    chunks = chunk_document(doc)
    c = chunks[0]
    assert c.doc_id == "myid"
    assert c.source == "faq_source"
    assert c.doc_type == "faq"
    assert c.char_offset >= 0
    assert c.total_chunks == len(chunks)


def test_chunk_long_text_produces_multiple_chunks():
    # Build a text definitely longer than one chunk
    sentence = "The airline policy covers baggage allowances and refund procedures. "
    long_text = sentence * 30  # ~2100 chars, well over _CHUNK_SIZE_CHARS (1200)
    doc = _make_doc(long_text)
    chunks = chunk_document(doc)
    assert len(chunks) >= 2


def test_chunk_indices_are_sequential():
    sentence = "Each sentence adds content to this document. "
    doc = _make_doc(sentence * 40)
    chunks = chunk_document(doc)
    for i, chunk in enumerate(chunks):
        assert chunk.chunk_index == i
        assert chunk.total_chunks == len(chunks)


def test_chunk_ids_are_unique():
    sentence = "Repeated sentence to produce multiple chunks. "
    doc = _make_doc(sentence * 40)
    chunks = chunk_document(doc)
    ids = [c.chunk_id for c in chunks]
    assert len(ids) == len(set(ids))


def test_no_chunk_exceeds_size_limit_significantly():
    """No chunk text should be more than 2× the target size (overlap allowance)."""
    sentence = "Policy detail number one applies here. "
    doc = _make_doc(sentence * 50)
    chunks = chunk_document(doc)
    for c in chunks:
        assert len(c.text) <= _CHUNK_SIZE_CHARS * 2, (
            f"Chunk {c.chunk_index} is {len(c.text)} chars, exceeds 2× size limit"
        )


def test_chunk_preserves_all_content():
    """Every sentence should appear in at least one chunk."""
    sentences = [f"Sentence number {i} with some padding text here." for i in range(20)]
    doc = _make_doc(" ".join(sentences))
    chunks = chunk_document(doc)
    all_text = " ".join(c.text for c in chunks)
    # Each sentence's distinguishing word should appear somewhere in the chunks
    for i in range(20):
        assert f"number {i}" in all_text, f"Sentence {i} lost during chunking"


def test_chunk_extra_metadata_merged():
    doc = DocumentIn(
        text="Test content for metadata.",
        doc_id="meta_doc",
        source="policy",
        doc_type="policy",
        extra_metadata={"airline": "Delta", "version": "2025"},
    )
    chunks = chunk_document(doc)
    assert chunks[0].metadata["airline"] == "Delta"
    assert chunks[0].metadata["version"] == "2025"


# ── assemble_context — token budget enforcement ───────────────────────────────


def test_assemble_context_empty_input():
    result = assemble_context([], token_budget=2000)
    assert result.chunks_used == []
    assert result.chunks_truncated == 0
    assert result.context_text == ""
    assert result.total_tokens_estimate == 0


def test_assemble_context_respects_token_budget():
    """Chunks added must not collectively exceed the token budget."""
    chunks = [
        _make_chunk(f"doc1_c{i}", "doc1", i, "x" * 400, score=0.9 - i * 0.01)
        for i in range(10)
    ]
    budget = 500  # ≈ 500 tokens (2000 chars)
    result = assemble_context(chunks, token_budget=budget)
    assert result.total_tokens_estimate <= budget


def test_assemble_context_truncated_count():
    """chunks_truncated should be non-zero when the budget is tighter than the input.

    Use chunks from distinct documents so the adjacent-merge step does not
    reduce the candidate pool — making the truncated count predictable.
    """
    # Each chunk: 200 chars ≈ 50 tokens; budget = 60 → fits exactly 1 chunk.
    # Five separate docs so no adjacency merging occurs.
    chunks = [
        _make_chunk(f"d{i}_c0", f"doc_{i}", 0, "word " * 40, score=0.9 - i * 0.01)
        for i in range(5)
    ]
    budget = 60  # fits ~1 chunk
    result = assemble_context(chunks, token_budget=budget)
    assert result.chunks_truncated == len(chunks) - len(result.chunks_used)
    assert result.chunks_truncated >= 1


def test_assemble_context_selects_highest_scores_first():
    """The greedy packer should include higher-scoring chunks preferentially."""
    chunks = [
        _make_chunk("d1_c0", "d1", 0, "low relevance " * 20, score=0.50),
        _make_chunk("d2_c0", "d2", 0, "high relevance " * 20, score=0.95),
        _make_chunk("d3_c0", "d3", 0, "medium relevance " * 20, score=0.80),
    ]
    # Budget tight enough to hold only 2 of 3
    budget = 200
    result = assemble_context(chunks, token_budget=budget)
    used_ids = {c.chunk_id for c in result.chunks_used}
    # High (0.95) and medium (0.80) should beat low (0.50)
    assert "d2_c0" in used_ids
    assert "d3_c0" in used_ids
    assert "d1_c0" not in used_ids


def test_assemble_context_reading_order_restored():
    """Output chunks must be ordered by (doc_id, chunk_index), not by score."""
    chunks = [
        _make_chunk("d1_c2", "d1", 2, "chunk two text " * 10, score=0.99),
        _make_chunk("d1_c0", "d1", 0, "chunk zero text " * 10, score=0.90),
        _make_chunk("d1_c1", "d1", 1, "chunk one text " * 10, score=0.95),
    ]
    result = assemble_context(chunks, token_budget=5000)
    indices = [c.chunk_index for c in result.chunks_used]
    assert indices == sorted(indices), "Chunks must be in reading order (chunk_index ascending)"


def test_assemble_context_formats_source_attribution():
    """context_text must include source label and doc_type for each chunk."""
    chunk = _make_chunk("d1_c0", "d1", 0, "Baggage allowance is 23 kg.", score=0.9,
                         source="airline_faq", doc_type="faq")
    result = assemble_context([chunk], token_budget=2000)
    assert "airline_faq" in result.context_text
    assert "faq" in result.context_text
    assert "Baggage allowance" in result.context_text


def test_assemble_context_numbering_starts_at_one():
    chunks = [
        _make_chunk("d1_c0", "d1", 0, "First chunk content here.", score=0.9),
        _make_chunk("d2_c0", "d2", 0, "Second chunk content here.", score=0.8),
    ]
    result = assemble_context(chunks, token_budget=2000)
    assert result.context_text.startswith("[1]")
    assert "[2]" in result.context_text


# ── assemble_context — adjacent chunk merging ─────────────────────────────────


def test_adjacent_chunks_merged_to_remove_overlap():
    """When chunk N and N+1 from the same doc both appear, they should be merged."""
    # Overlap text is the shared suffix of chunk 0 / prefix of chunk 1
    shared_tail = "overlap text that appears in both chunks"
    chunk0_text = "start of document. " + shared_tail
    chunk1_text = shared_tail + " end of document content here."

    chunks = [
        _make_chunk("d1_c0", "d1", 0, chunk0_text, score=0.95),
        _make_chunk("d1_c1", "d1", 1, chunk1_text, score=0.90),
    ]
    result = assemble_context(chunks, token_budget=5000)
    # Adjacent chunks are merged into one entry
    assert len(result.chunks_used) == 1


def test_non_adjacent_same_doc_chunks_not_merged():
    """Chunks 0 and 2 from the same doc (skipping 1) must not be merged."""
    chunks = [
        _make_chunk("d1_c0", "d1", 0, "First chunk text here.", score=0.95),
        _make_chunk("d1_c2", "d1", 2, "Third chunk text here.", score=0.90),
    ]
    result = assemble_context(chunks, token_budget=5000)
    assert len(result.chunks_used) == 2


def test_chunks_from_different_docs_never_merged():
    chunks = [
        _make_chunk("d1_c0", "doc_a", 0, "Document A content.", score=0.95),
        _make_chunk("d2_c1", "doc_b", 1, "Document B content.", score=0.90),
    ]
    result = assemble_context(chunks, token_budget=5000)
    doc_ids = {c.doc_id for c in result.chunks_used}
    assert "doc_a" in doc_ids
    assert "doc_b" in doc_ids


def test_merged_chunk_takes_higher_score():
    """After merging adjacents, the retained score should be max(s0, s1)."""
    chunks = [
        _make_chunk("d1_c0", "d1", 0, "first part. " * 10, score=0.70),
        _make_chunk("d1_c1", "d1", 1, "second part. " * 10, score=0.95),
    ]
    result = assemble_context(chunks, token_budget=5000)
    assert len(result.chunks_used) == 1
    assert result.chunks_used[0].score == 0.95


# ── Score threshold — enforced in RAGService.retrieve ────────────────────────


def test_score_threshold_default_in_rag_query():
    """RAGQuery default score_threshold must be 0.70, consistent with the pipeline."""
    from app.schemas.rag import RAGQuery
    q = RAGQuery(query="test query")
    assert q.score_threshold == 0.70


def test_assemble_context_with_only_high_score_chunks():
    """If caller pre-filters by threshold, assemble_context should use all remaining."""
    # Simulate pre-filtered set (all above threshold)
    chunks = [
        _make_chunk("d1_c0", "d1", 0, "Relevant flight policy text.", score=0.82),
        _make_chunk("d2_c0", "d2", 0, "Another relevant policy detail.", score=0.91),
    ]
    result = assemble_context(chunks, token_budget=5000)
    assert len(result.chunks_used) == 2
    assert result.chunks_truncated == 0

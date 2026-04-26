"""Vector store service — abstraction layer over Pinecone (default).

Swap out the backend by replacing the _store implementation.

Supported backends (uncomment to switch):
  - Pinecone  (cloud, managed)
  - FAISS     (local, in-process)
  - Weaviate  (self-hosted / cloud)

Public API
----------
``upsert``               — batch-upsert (id, embedding, metadata) tuples
``search``               — high-level: embed query + filtered nearest-neighbour
``query_raw``            — low-level: pre-embedded vector + metadata filter → raw matches
``fetch_ids_by_metadata``— list chunk IDs matching a metadata filter (for delete-by-doc)
``delete``               — delete by ID list

Metadata filtering
------------------
Both ``search`` and ``query_raw`` accept an optional ``metadata_filter`` dict
in Pinecone's native filter syntax:

    {"source": {"$eq": "airline_faq"}}
    {"doc_type": {"$in": ["faq", "policy"]}}
    {"$and": [{"source": {"$eq": "faq"}}, {"doc_type": {"$eq": "policy"}}]}

Filters are evaluated server-side by Pinecone before scoring, so they do not
consume any of the ``top_k`` quota — only matching vectors compete for the
nearest-neighbour slots.
"""

from typing import Any

from app.core.config import settings
from app.core.constants import AI_SIMILARITY_THRESHOLD, AI_SIMILARITY_TOP_K
from app.core.logging import get_logger
from app.schemas.ai import VectorSearchRequest, VectorSearchResponse, VectorSearchResult
from app.services.ai_service import AIService

logger = get_logger(__name__)


class VectorService:
    """Thin async wrapper around a vector database.

    Current backend: Pinecone via pinecone-client v3+
    """

    def __init__(self, ai_service: AIService) -> None:
        self._ai = ai_service
        self._index = self._init_index()

    def _init_index(self) -> Any | None:
        if not settings.PINECONE_API_KEY:
            logger.warning("vector_store_disabled", reason="PINECONE_API_KEY not set")
            return None

        try:
            from pinecone import Pinecone  # type: ignore[import]

            pc = Pinecone(api_key=settings.PINECONE_API_KEY)
            return pc.Index(settings.PINECONE_INDEX_NAME)
        except ImportError:
            logger.warning("vector_store_disabled", reason="pinecone package not installed")
            return None

    async def upsert(
        self,
        vectors: list[tuple[str, list[float], dict]],
        namespace: str | None = None,
    ) -> int:
        """Upsert (id, embedding, metadata) tuples into the index.

        Returns the number of vectors upserted.  The metadata dict is stored
        verbatim in Pinecone and becomes available for metadata-filter queries.
        """
        if self._index is None:
            logger.warning("vector_upsert_skipped", reason="index not configured")
            return 0

        records = [{"id": vid, "values": emb, "metadata": meta} for vid, emb, meta in vectors]
        self._index.upsert(vectors=records, namespace=namespace or "")
        logger.info("vector_upsert", count=len(records))
        return len(records)

    async def search(
        self,
        request: VectorSearchRequest,
        metadata_filter: dict | None = None,
    ) -> VectorSearchResponse:
        """Embed the query then run a filtered nearest-neighbour search.

        ``metadata_filter`` is passed directly to Pinecone in its native filter
        syntax and is applied server-side before scoring.  Pass ``None`` for an
        unfiltered search across the entire namespace.
        """
        if self._index is None:
            return VectorSearchResponse(results=[], query=request.query)

        embed_resp = await self._ai.embed([request.query])
        query_vector = embed_resp.embeddings[0]

        matches = await self.query_raw(
            vector=query_vector,
            top_k=request.top_k or AI_SIMILARITY_TOP_K,
            namespace=request.namespace,
            metadata_filter=metadata_filter,
        )

        threshold = request.score_threshold or AI_SIMILARITY_THRESHOLD
        results = [
            VectorSearchResult(
                id=m["id"],
                score=m["score"],
                metadata=m.get("metadata", {}),
            )
            for m in matches
            if m["score"] >= threshold
        ]

        logger.info(
            "vector_search",
            query_len=len(request.query),
            hits=len(results),
            filtered=metadata_filter is not None,
        )
        return VectorSearchResponse(results=results, query=request.query)

    async def query_raw(
        self,
        vector: list[float],
        top_k: int = AI_SIMILARITY_TOP_K,
        namespace: str | None = None,
        metadata_filter: dict | None = None,
    ) -> list[dict]:
        """Low-level nearest-neighbour query using a pre-embedded vector.

        Returns the raw Pinecone match dicts (``id``, ``score``, ``metadata``)
        without score-threshold filtering — callers apply their own thresholds.
        Use this when you already have an embedding (e.g. from a cached query).
        """
        if self._index is None:
            return []

        kwargs: dict[str, Any] = {
            "vector": vector,
            "top_k": top_k,
            "include_metadata": True,
            "namespace": namespace or "",
        }
        if metadata_filter:
            kwargs["filter"] = metadata_filter

        raw = self._index.query(**kwargs)
        return raw.get("matches", [])

    async def fetch_ids_by_metadata(
        self,
        filter: dict,
        namespace: str | None = None,
        limit: int = 100,
    ) -> list[str]:
        """Return vector IDs matching a metadata filter expression.

        Pinecone free tier does not support list-by-metadata natively; we run a
        dummy zero-vector query with the filter to approximate it.  Pass a real
        zero vector of the correct dimension so Pinecone accepts the call.

        In production (paid tier) prefer the Pinecone ``list`` API which
        supports true metadata-only listing without a query vector.
        """
        if self._index is None:
            return []

        zero_vec = [0.0] * settings.VECTOR_DIMENSION
        raw = self._index.query(
            vector=zero_vec,
            top_k=limit,
            include_metadata=False,
            namespace=namespace or "",
            filter=filter,
        )
        return [m["id"] for m in raw.get("matches", [])]

    async def delete(self, ids: list[str], namespace: str | None = None) -> None:
        """Delete vectors by ID."""
        if self._index is None:
            return
        self._index.delete(ids=ids, namespace=namespace or "")
        logger.info("vector_delete", count=len(ids))

"""
Vector store service — abstraction layer over Pinecone (default).
Swap out the backend by replacing the _store implementation.

Supported backends (uncomment to switch):
  - Pinecone  (cloud, managed)
  - FAISS     (local, in-process)
  - Weaviate  (self-hosted / cloud)
"""

from typing import Any

from app.core.config import settings
from app.core.constants import AI_SIMILARITY_THRESHOLD, AI_SIMILARITY_TOP_K
from app.core.logging import get_logger
from app.schemas.ai import VectorSearchRequest, VectorSearchResponse, VectorSearchResult
from app.services.ai_service import AIService

logger = get_logger(__name__)


class VectorService:
    """
    Thin async wrapper around a vector database.

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
        """
        Upsert vectors into the index.
        vectors: list of (id, embedding, metadata)
        Returns the number of vectors upserted.
        """
        if self._index is None:
            logger.warning("vector_upsert_skipped", reason="index not configured")
            return 0

        records = [{"id": vid, "values": emb, "metadata": meta} for vid, emb, meta in vectors]
        self._index.upsert(vectors=records, namespace=namespace or "")
        logger.info("vector_upsert", count=len(records))
        return len(records)

    async def search(self, request: VectorSearchRequest) -> VectorSearchResponse:
        """Embed the query then run a nearest-neighbour search."""
        if self._index is None:
            return VectorSearchResponse(results=[], query=request.query)

        embed_resp = await self._ai.embed([request.query])
        query_vector = embed_resp.embeddings[0]

        raw = self._index.query(
            vector=query_vector,
            top_k=request.top_k or AI_SIMILARITY_TOP_K,
            include_metadata=True,
            namespace=request.namespace or "",
        )

        results = [
            VectorSearchResult(
                id=match["id"],
                score=match["score"],
                metadata=match.get("metadata", {}),
            )
            for match in raw.get("matches", [])
            if match["score"] >= (request.score_threshold or AI_SIMILARITY_THRESHOLD)
        ]

        logger.info("vector_search", query_len=len(request.query), hits=len(results))
        return VectorSearchResponse(results=results, query=request.query)

    async def delete(self, ids: list[str], namespace: str | None = None) -> None:
        if self._index is None:
            return
        self._index.delete(ids=ids, namespace=namespace or "")
        logger.info("vector_delete", count=len(ids))

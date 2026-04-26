"""RAG (Retrieval-Augmented Generation) endpoints.

These endpoints expose the full RAG pipeline — ingest, retrieve, and generate —
so clients can index knowledge-base documents and query them with grounded,
source-attributed answers.

Typical flow
------------
1. POST /ai/rag/ingest    — index an airline FAQ, policy doc, or route guide
2. POST /ai/rag/query     — retrieve the most relevant chunks for a question
3. POST /ai/rag/generate  — full pipeline: retrieve + generate a cited answer
4. DELETE /ai/rag/documents/{doc_id} — remove all chunks for a document
"""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import AdminUser, CurrentUser, RAGServiceDep
from app.services.ai_service import AIServiceError
from app.schemas.rag import (
    DeleteDocumentResponse,
    DocumentIn,
    IngestResponse,
    RAGQuery,
    RAGRequest,
    RAGResponse,
    RetrievedContext,
)

router = APIRouter(prefix="/ai/rag", tags=["rag"])


@router.post("/ingest", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_document(
    doc: DocumentIn,
    rag_svc: RAGServiceDep,
    _: AdminUser,
) -> IngestResponse:
    """Chunk, embed, and index a document into the vector store.

    Restricted to admin users — documents are shared across all users so only
    admins should be able to add or replace knowledge-base content.

    The document is split using a sentence-aware sliding-window strategy
    (chunk size ≈ 300 tokens, 20% overlap) and each chunk is embedded
    individually so the embedding model sees focused, coherent text.
    """
    try:
        return await rag_svc.ingest(doc)
    except AIServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.user_message)


@router.post("/query", response_model=RetrievedContext)
async def retrieve_chunks(
    query: RAGQuery,
    rag_svc: RAGServiceDep,
    _: CurrentUser,
) -> RetrievedContext:
    """Retrieve the most relevant chunks for a query without generating an answer.

    Useful for debugging retrieval quality or building a custom UI that renders
    source snippets alongside an answer.  Supports metadata filters to scope
    retrieval to a specific document type or source.
    """
    try:
        return await rag_svc.retrieve(query)
    except AIServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.user_message)


@router.post("/generate", response_model=RAGResponse)
async def rag_generate(
    request: RAGRequest,
    rag_svc: RAGServiceDep,
    _: CurrentUser,
) -> RAGResponse:
    """Full RAG pipeline: retrieve relevant chunks then generate a grounded answer.

    The LLM is instructed to answer only from the retrieved context and to cite
    the source label of each chunk it uses.  If no relevant chunks are found
    above the score threshold the endpoint returns a clear "not found" message
    rather than hallucinating an answer.
    """
    try:
        return await rag_svc.generate(request)
    except AIServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.user_message)


@router.delete(
    "/documents/{doc_id}",
    response_model=DeleteDocumentResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_document(
    doc_id: str,
    rag_svc: RAGServiceDep,
    _: AdminUser,
    namespace: str | None = None,
) -> DeleteDocumentResponse:
    """Delete all indexed chunks for a document by its doc_id.

    Use this to remove outdated content before re-ingesting an updated version.
    Pass the same ``namespace`` used during ingest if applicable.
    """
    return await rag_svc.delete_document(doc_id, namespace=namespace)

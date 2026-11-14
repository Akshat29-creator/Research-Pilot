import logging
import time
import uuid
from dataclasses import dataclass
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.llm.factory import get_embedding_provider
from app.models.chunk import DocumentChunk
from app.models.document import Document

logger = logging.getLogger("researchpilot.services.retrieval")


@dataclass(frozen=True)
class RetrievedChunk:
    """Represents a retrieved chunk with similarity score and provenance metadata."""

    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    content: str
    page_number: int
    chunk_index: int
    similarity: float


async def semantic_search(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    top_k: int = 5,
    min_similarity: float = 0.65,
    document_ids: List[uuid.UUID] | None = None,
) -> List[RetrievedChunk]:
    """Execute pgvector semantic search using cosine distance over HNSW index.

    Enforces strict tenant isolation by filtering on `Document.user_id == user_id`.
    Computes query vector embedding via Ollama nomic-embed-text (768-d).
    Calculates cosine similarity as `1.0 - (embedding <=> query_vector)`.
    """
    start_time = time.perf_counter()
    clean_query = query.strip()
    if not clean_query:
        return []

    # 1. Compute 768-d vector embedding for the query
    embedding_provider = get_embedding_provider()
    query_vector = await embedding_provider.embed_text(clean_query)

    if not query_vector:
        logger.warning("Empty query vector generated for query: %s", clean_query)
        return []

    # 2. Formulate pgvector similarity query
    # In pgvector-python / pgvector.sqlalchemy:
    # DocumentChunk.embedding.cosine_distance(query_vector) maps to `embedding <=> query_vector`
    cosine_dist = DocumentChunk.embedding.cosine_distance(query_vector)
    similarity_expr = (1.0 - cosine_dist).label("similarity")

    stmt = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            Document.title,
            DocumentChunk.content,
            DocumentChunk.page_number,
            DocumentChunk.chunk_index,
            similarity_expr,
        )
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(
            Document.user_id == user_id,
            similarity_expr >= min_similarity,
        )
    )

    if document_ids:
        stmt = stmt.where(DocumentChunk.document_id.in_(document_ids))

    stmt = stmt.order_by(cosine_dist.asc()).limit(top_k)

    res = await db.execute(stmt)
    rows = res.all()

    elapsed = (time.perf_counter() - start_time) * 1000
    results: List[RetrievedChunk] = []

    for r in rows:
        results.append(
            RetrievedChunk(
                chunk_id=r[0],
                document_id=r[1],
                document_title=r[2],
                content=r[3],
                page_number=r[4],
                chunk_index=r[5],
                similarity=float(r[6]),
            )
        )

    logger.info(
        "Semantic search query '%s' retrieved %d chunks "
        "(user=%s, top_k=%d, min_sim=%.2f) in %.1fms",
        clean_query[:50],
        len(results),
        user_id,
        top_k,
        min_similarity,
        elapsed,
    )

    return results

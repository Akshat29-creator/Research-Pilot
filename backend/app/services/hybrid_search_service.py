import logging
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.services.retrieval_service import RetrievedChunk, semantic_search

logger = logging.getLogger("researchpilot.services.hybrid_search")


@dataclass(frozen=True)
class FullTextChunk:
    """Represents a chunk matched via PostgreSQL full-text search (tsvector)."""

    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    content: str
    page_number: int
    chunk_index: int
    text_rank_score: float


@dataclass(frozen=True)
class HybridChunkResult:
    """Consolidated search result fused via Reciprocal Rank Fusion (RRF)."""

    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    content: str
    page_number: int
    chunk_index: int
    vector_rank: int | None
    text_rank: int | None
    vector_similarity: float | None
    text_rank_score: float | None
    rrf_score: float
    rerank_score: float | None = None


async def full_text_search(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    top_k: int = 10,
    document_ids: List[uuid.UUID] | None = None,
) -> List[FullTextChunk]:
    """Execute PostgreSQL full-text search using GIN index over content_tsvector.

    Uses `websearch_to_tsquery('english', :query)` to safely parse plain text,
    quoted phrases ("..."), and boolean OR operators without throwing syntax errors.
    Enforces tenant isolation by joining with `Document.user_id == user_id`.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    # websearch_to_tsquery safely handles natural language search queries
    ts_query = func.websearch_to_tsquery("english", clean_query)
    rank_expr = func.ts_rank(DocumentChunk.content_tsvector, ts_query).label("rank_score")

    stmt = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            Document.title,
            DocumentChunk.content,
            DocumentChunk.page_number,
            DocumentChunk.chunk_index,
            rank_expr,
        )
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(
            Document.user_id == user_id,
            DocumentChunk.content_tsvector.op("@@")(ts_query),
        )
    )

    if document_ids:
        stmt = stmt.where(DocumentChunk.document_id.in_(document_ids))

    stmt = stmt.order_by(rank_expr.desc()).limit(top_k)

    res = await db.execute(stmt)
    rows = res.all()

    results: List[FullTextChunk] = []
    for r in rows:
        results.append(
            FullTextChunk(
                chunk_id=r[0],
                document_id=r[1],
                document_title=r[2],
                content=r[3],
                page_number=r[4],
                chunk_index=r[5],
                text_rank_score=float(r[6]),
            )
        )

    return results


def reciprocal_rank_fusion(
    vector_results: List[RetrievedChunk],
    text_results: List[FullTextChunk],
    k: int = 60,
) -> List[HybridChunkResult]:
    """Fuse vector and full-text search rankings using Reciprocal Rank Fusion (RRF).

    Formula: RRF_Score(d) = sum_{m in {vector, text}} 1 / (k + rank_m(d) + 1)
    Constant k defaults to 60 per TREC standard recommendations.
    """
    rrf_scores: Dict[uuid.UUID, float] = defaultdict(float)
    vector_rank_map: Dict[uuid.UUID, int] = {}
    vector_sim_map: Dict[uuid.UUID, float] = {}

    text_rank_map: Dict[uuid.UUID, int] = {}
    text_score_map: Dict[uuid.UUID, float] = {}

    metadata_map: Dict[uuid.UUID, tuple[uuid.UUID, str, str, int, int]] = {}

    # 1. Accumulate vector search reciprocal ranks
    for rank, v in enumerate(vector_results):
        cid = v.chunk_id
        vector_rank_map[cid] = rank + 1
        vector_sim_map[cid] = v.similarity
        rrf_scores[cid] += 1.0 / (k + rank + 1)
        metadata_map[cid] = (
            v.document_id,
            v.document_title,
            v.content,
            v.page_number,
            v.chunk_index,
        )

    # 2. Accumulate full-text search reciprocal ranks
    for rank, t in enumerate(text_results):
        cid = t.chunk_id
        text_rank_map[cid] = rank + 1
        text_score_map[cid] = t.text_rank_score
        rrf_scores[cid] += 1.0 / (k + rank + 1)
        if cid not in metadata_map:
            metadata_map[cid] = (
                t.document_id,
                t.document_title,
                t.content,
                t.page_number,
                t.chunk_index,
            )

    # 3. Sort candidates in descending order of RRF score
    sorted_chunk_ids = sorted(
        rrf_scores.keys(),
        key=lambda chunk_id: rrf_scores[chunk_id],
        reverse=True,
    )

    fused_results: List[HybridChunkResult] = []
    for cid in sorted_chunk_ids:
        doc_id, title, content, page_num, chunk_idx = metadata_map[cid]
        fused_results.append(
            HybridChunkResult(
                chunk_id=cid,
                document_id=doc_id,
                document_title=title,
                content=content,
                page_number=page_num,
                chunk_index=chunk_idx,
                vector_rank=vector_rank_map.get(cid),
                text_rank=text_rank_map.get(cid),
                vector_similarity=vector_sim_map.get(cid),
                text_rank_score=text_score_map.get(cid),
                rrf_score=rrf_scores[cid],
            )
        )

    return fused_results


def apply_vram_safe_reranking(
    query: str,
    candidates: List[HybridChunkResult],
    top_n: int = 5,
) -> List[HybridChunkResult]:
    """Lightweight VRAM-safe reranking pass.

    On local workstation hardware (RTX 5060 8GB), running an active LLM
    simultaneously with a heavy PyTorch cross-encoder risks out-of-memory driver crashes.
    This module evaluates exact phrase frequency, term proximity, and length penalties
    on CPU without consuming GPU VRAM, calibrating a final rerank_score.
    """
    if not candidates:
        return []

    query_terms = [t.lower() for t in query.split() if len(t) > 2]
    reranked: List[HybridChunkResult] = []

    for item in candidates:
        content_lower = item.content.lower()

        # 1. Exact phrase bonus
        phrase_bonus = 0.30 if query.lower() in content_lower else 0.0

        # 2. Query term density
        matched_terms = sum(1 for term in query_terms if term in content_lower)
        coverage_ratio = matched_terms / len(query_terms) if query_terms else 0.0

        # 3. Blended calibrated score
        # Base RRF score normalized + phrase bonus + lexical coverage
        combined_score = (item.rrf_score * 30.0) + phrase_bonus + (0.20 * coverage_ratio)

        reranked.append(
            HybridChunkResult(
                chunk_id=item.chunk_id,
                document_id=item.document_id,
                document_title=item.document_title,
                content=item.content,
                page_number=item.page_number,
                chunk_index=item.chunk_index,
                vector_rank=item.vector_rank,
                text_rank=item.text_rank,
                vector_similarity=item.vector_similarity,
                text_rank_score=item.text_rank_score,
                rrf_score=item.rrf_score,
                rerank_score=round(combined_score, 4),
            )
        )

    reranked.sort(key=lambda x: x.rerank_score or 0.0, reverse=True)
    return reranked[:top_n]


async def hybrid_search(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    top_k: int = 5,
    k: int = 60,
    min_similarity: float = 0.50,
    rerank: bool = False,
    document_ids: List[uuid.UUID] | None = None,
) -> List[HybridChunkResult]:
    """Execute hybrid retrieval combining pgvector semantic search and PostgreSQL full-text search.

    1. Executes pgvector cosine similarity search over HNSW index.
    2. Executes PostgreSQL tsvector keyword search over GIN index.
    3. Fuses rankings using Reciprocal Rank Fusion (RRF).
    4. Optionally applies VRAM-safe CPU reranking pass if `rerank=True`.
    """
    start_time = time.perf_counter()
    clean_query = query.strip()
    if not clean_query:
        return []

    # Fetch 2x top_k from each retriever to form candidate pool
    candidate_limit = max(top_k * 2, 10)

    # 1. Vector Search
    vector_candidates = await semantic_search(
        db=db,
        user_id=user_id,
        query=clean_query,
        top_k=candidate_limit,
        min_similarity=min_similarity,
        document_ids=document_ids,
    )

    # 2. Full-Text Search
    text_candidates = await full_text_search(
        db=db,
        user_id=user_id,
        query=clean_query,
        top_k=candidate_limit,
        document_ids=document_ids,
    )

    # 3. Reciprocal Rank Fusion
    fused = reciprocal_rank_fusion(
        vector_results=vector_candidates,
        text_results=text_candidates,
        k=k,
    )

    # 4. Optional VRAM-safe reranking
    if rerank:
        final_results = apply_vram_safe_reranking(clean_query, fused, top_n=top_k)
    else:
        final_results = fused[:top_k]

    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(
        "Hybrid search for '%s' returned %d results (vec=%d, text=%d, rerank=%s) in %.1fms",
        clean_query[:50],
        len(final_results),
        len(vector_candidates),
        len(text_candidates),
        rerank,
        elapsed,
    )

    return final_results

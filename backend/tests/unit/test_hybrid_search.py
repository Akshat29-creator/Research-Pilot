import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.services.hybrid_search_service import (
    FullTextChunk,
    apply_vram_safe_reranking,
    full_text_search,
    hybrid_search,
    reciprocal_rank_fusion,
)
from app.services.retrieval_service import RetrievedChunk


def test_reciprocal_rank_fusion_overlapping_boost():
    """Verify chunk present in both vector and text search gets boosted to top."""
    shared_id = uuid.uuid4()
    vector_only_id = uuid.uuid4()
    text_only_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    vector_results = [
        RetrievedChunk(
            chunk_id=vector_only_id,
            document_id=doc_id,
            document_title="Vector Doc",
            content="Vector content",
            page_number=1,
            chunk_index=0,
            similarity=0.92,
        ),
        RetrievedChunk(
            chunk_id=shared_id,
            document_id=doc_id,
            document_title="Shared Doc",
            content="Shared content",
            page_number=1,
            chunk_index=1,
            similarity=0.85,
        ),
    ]

    text_results = [
        FullTextChunk(
            chunk_id=shared_id,
            document_id=doc_id,
            document_title="Shared Doc",
            content="Shared content",
            page_number=1,
            chunk_index=1,
            text_rank_score=0.75,
        ),
        FullTextChunk(
            chunk_id=text_only_id,
            document_id=doc_id,
            document_title="Text Doc",
            content="Text content",
            page_number=1,
            chunk_index=2,
            text_rank_score=0.60,
        ),
    ]

    fused = reciprocal_rank_fusion(vector_results, text_results, k=60)
    assert len(fused) == 3

    # Shared chunk must be rank 1 because it appeared in both rankings
    assert fused[0].chunk_id == shared_id
    assert fused[0].vector_rank == 2
    assert fused[0].text_rank == 1

    # Exact RRF calculation check for shared_id:
    # vector rank 2 -> 1 / (60 + 2) = 1/62
    # text rank 1   -> 1 / (60 + 1) = 1/61
    expected_score = (1.0 / 62.0) + (1.0 / 61.0)
    assert pytest.approx(fused[0].rrf_score, 1e-5) == expected_score


def test_apply_vram_safe_reranking_phrase_bonus():
    """Verify CPU-safe reranking applies exact phrase bonus without GPU overhead."""
    c1_id = uuid.uuid4()
    c2_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    query = "pgvector cosine distance"

    c1 = FullTextChunk(
        chunk_id=c1_id,
        document_id=doc_id,
        document_title="Doc 1",
        content="This document covers pgvector cosine distance benchmarks extensively.",
        page_number=1,
        chunk_index=0,
        text_rank_score=0.5,
    )
    c2 = FullTextChunk(
        chunk_id=c2_id,
        document_id=doc_id,
        document_title="Doc 2",
        content="General relational database vector search concepts.",
        page_number=1,
        chunk_index=1,
        text_rank_score=0.5,
    )

    fused = reciprocal_rank_fusion([], [c2, c1], k=60)
    reranked = apply_vram_safe_reranking(query=query, candidates=fused, top_n=2)

    assert len(reranked) == 2
    # c1 has the exact query phrase, so it must be elevated to the top!
    assert reranked[0].chunk_id == c1_id
    assert reranked[0].rerank_score is not None
    assert reranked[0].rerank_score > reranked[1].rerank_score


@pytest.mark.asyncio
async def test_full_text_search_empty_query():
    mock_db = AsyncMock()
    res = await full_text_search(db=mock_db, user_id=uuid.uuid4(), query="   ")
    assert res == []


@pytest.mark.asyncio
async def test_hybrid_search_orchestration():
    mock_db = AsyncMock()
    user_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    chunk_id = uuid.uuid4()

    mock_vec = [
        RetrievedChunk(
            chunk_id=chunk_id,
            document_id=doc_id,
            document_title="Title",
            content="pgvector HNSW indexing",
            page_number=1,
            chunk_index=0,
            similarity=0.88,
        )
    ]
    mock_text = [
        FullTextChunk(
            chunk_id=chunk_id,
            document_id=doc_id,
            document_title="Title",
            content="pgvector HNSW indexing",
            page_number=1,
            chunk_index=0,
            text_rank_score=0.90,
        )
    ]

    with (
        patch(
            "app.services.hybrid_search_service.semantic_search",
            new_callable=AsyncMock,
            return_value=mock_vec,
        ),
        patch(
            "app.services.hybrid_search_service.full_text_search",
            new_callable=AsyncMock,
            return_value=mock_text,
        ),
    ):
        results = await hybrid_search(
            db=mock_db,
            user_id=user_id,
            query="pgvector HNSW",
            top_k=5,
            rerank=True,
        )

        assert len(results) == 1
        assert results[0].chunk_id == chunk_id
        assert results[0].rerank_score is not None
        assert results[0].vector_rank == 1
        assert results[0].text_rank == 1

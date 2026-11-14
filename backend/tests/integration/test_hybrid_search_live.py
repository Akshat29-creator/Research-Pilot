import uuid

import pytest
from sqlalchemy import select

from app.database.session import async_session_factory, engine
from app.models.user import User
from app.services.hybrid_search_service import full_text_search, hybrid_search
from app.services.ingestion_service import ingest_document


@pytest.mark.asyncio
async def test_live_hybrid_search_pipeline():
    """Live integration test: tsvector GIN, pgvector HNSW, and RRF fusion."""
    async with async_session_factory() as db:
        test_email_1 = f"hybrid_tester_{uuid.uuid4().hex[:8]}@example.com"
        test_email_2 = f"hybrid_isolated_{uuid.uuid4().hex[:8]}@example.com"

        user1 = User(
            id=uuid.uuid4(),
            email=test_email_1,
            hashed_password="hashed_test_password",
            is_active=True,
        )
        user2 = User(
            id=uuid.uuid4(),
            email=test_email_2,
            hashed_password="hashed_test_password",
            is_active=True,
        )
        db.add(user1)
        db.add(user2)
        await db.commit()

        try:
            # 1. Ingest Doc A (High semantic relevance to cosine distance + keyword pgvector)
            doc_a_content = (
                "PostgreSQL pgvector extension enables vector similarity search using HNSW "
                "indexing and cosine distance metrics."
            )
            res_a = await ingest_document(
                db=db,
                user_id=user1.id,
                title="Doc A - pgvector cosine",
                content=doc_a_content,
            )

            # 2. Ingest Doc B (Specific keyword matches: IVFFlat, Voronoi)
            doc_b_content = (
                "The pgvector project provides IVFFlat and HNSW indexing for relational engines, "
                "partitioning vector space into Voronoi cells."
            )
            res_b = await ingest_document(
                db=db,
                user_id=user1.id,
                title="Doc B - IVFFlat Voronoi",
                content=doc_b_content,
            )

            # 3. Ingest Doc C (Different domain: hardware telemetry)
            doc_c_content = (
                "Hardware telemetry on Lenovo Legion with NVIDIA RTX 5060 Laptop GPU and "
                "AMD Ryzen 7 8745HX processor."
            )
            await ingest_document(
                db=db,
                user_id=user1.id,
                title="Doc C - Hardware Telemetry",
                content=doc_c_content,
            )

            # 4. Verify PostgreSQL full-text search directly (GIN index over content_tsvector)
            text_hits = await full_text_search(
                db=db,
                user_id=user1.id,
                query="Voronoi IVFFlat",
                top_k=2,
            )
            assert len(text_hits) >= 1
            assert text_hits[0].document_id == res_b.document_id
            assert text_hits[0].text_rank_score > 0.0

            # 5. Verify Hybrid Search with RRF Fusion
            hybrid_hits = await hybrid_search(
                db=db,
                user_id=user1.id,
                query="pgvector cosine distance",
                top_k=3,
                k=60,
                rerank=False,
            )
            assert len(hybrid_hits) >= 1
            # Doc A has strong vector similarity AND keyword match, so it must rank 1
            top_hit = hybrid_hits[0]
            assert top_hit.document_id == res_a.document_id
            assert top_hit.rrf_score > 0.0
            assert top_hit.vector_rank is not None
            assert top_hit.text_rank is not None

            # 6. Verify Hybrid Search with VRAM-Safe CPU Reranker
            reranked_hits = await hybrid_search(
                db=db,
                user_id=user1.id,
                query="pgvector cosine distance",
                top_k=3,
                rerank=True,
            )
            assert len(reranked_hits) >= 1
            assert reranked_hits[0].document_id == res_a.document_id
            assert reranked_hits[0].rerank_score is not None

            # 7. Strict Tenant Isolation
            isolated_hits = await hybrid_search(
                db=db,
                user_id=user2.id,
                query="pgvector cosine distance",
                top_k=5,
            )
            assert len(isolated_hits) == 0

        finally:
            stmt_user1 = select(User).where(User.id == user1.id)
            stmt_user2 = select(User).where(User.id == user2.id)
            u1 = (await db.execute(stmt_user1)).scalar_one_or_none()
            u2 = (await db.execute(stmt_user2)).scalar_one_or_none()

            if u1:
                await db.delete(u1)
            if u2:
                await db.delete(u2)
            await db.commit()
    await engine.dispose()

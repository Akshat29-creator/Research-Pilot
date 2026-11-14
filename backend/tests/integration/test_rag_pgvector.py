import uuid

import pytest
from sqlalchemy import select

from app.database.session import async_session_factory
from app.models.user import User
from app.services.citation_service import (
    VerificationStatus,
    audit_report_citations,
    verify_claim_against_chunks,
)
from app.services.ingestion_service import ingest_document
from app.services.retrieval_service import semantic_search


@pytest.mark.asyncio
async def test_live_pgvector_rag_pipeline():
    """Live integration test: Ingestion, HNSW Vector Search, Isolation, and Citation Audit."""
    async with async_session_factory() as db:
        test_email_1 = f"rag_tester_{uuid.uuid4().hex[:8]}@example.com"
        test_email_2 = f"rag_isolated_{uuid.uuid4().hex[:8]}@example.com"

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
            # 1. Ingest Document 1 for User 1
            doc1_content = (
                "Hierarchical Navigable Small World (HNSW) graphs in pgvector enable fast "
                "approximate nearest neighbor search using vector_cosine_ops. The index provides "
                "logarithmic search complexity and high recall across multi-dimensional embeddings."
            )
            res1 = await ingest_document(
                db=db,
                user_id=user1.id,
                title="HNSW Vector Indexing in PostgreSQL",
                content=doc1_content,
                file_type="text/plain",
            )
            assert res1.is_duplicate is False
            assert res1.chunk_count >= 1
            assert res1.document_id is not None

            # 2. Ingest Document 2 for User 1
            doc2_content = (
                "The research workstation utilizes an NVIDIA GeForce RTX 5060 Laptop GPU with "
                "8GB VRAM. Local inference with Qwen3 8B allocates approximately 5.2GB VRAM "
                "under an asyncio semaphore guard."
            )
            res2 = await ingest_document(
                db=db,
                user_id=user1.id,
                title="Host Hardware GPU Allocation",
                content=doc2_content,
                file_type="text/plain",
            )
            assert res2.is_duplicate is False
            assert res2.chunk_count >= 1

            # 3. Test Deduplication: Re-ingest Document 1 for User 1
            res1_dup = await ingest_document(
                db=db,
                user_id=user1.id,
                title="HNSW Duplicate Ingestion",
                content=doc1_content,
                file_type="text/plain",
            )
            assert res1_dup.is_duplicate is True
            assert res1_dup.document_id == res1.document_id

            # 4. Semantic Vector Retrieval over pgvector HNSW index
            search_query = "approximate nearest neighbor search with HNSW in pgvector"
            retrieved = await semantic_search(
                db=db,
                user_id=user1.id,
                query=search_query,
                top_k=2,
                min_similarity=0.50,
            )

            assert len(retrieved) >= 1
            top_hit = retrieved[0]
            assert top_hit.document_id == res1.document_id
            assert top_hit.document_title == "HNSW Vector Indexing in PostgreSQL"
            assert top_hit.similarity >= 0.50

            # 5. Strict Tenant Isolation Check: User 2 must see 0 results
            isolated_retrieved = await semantic_search(
                db=db,
                user_id=user2.id,
                query=search_query,
                top_k=5,
                min_similarity=0.10,
            )
            assert len(isolated_retrieved) == 0

            # 6. Citation Verification against retrieved chunks
            evidence_chunks = [c.content for c in retrieved]

            # Grounded claim
            grounded_claim = (
                "HNSW graphs in pgvector enable fast approximate nearest neighbor search."
            )
            verify_res = verify_claim_against_chunks(
                claim_text=grounded_claim,
                chunks=evidence_chunks,
                citation_ref="[^1]",
            )
            assert verify_res.status in (VerificationStatus.VERIFIED, VerificationStatus.PARTIAL)
            assert verify_res.confidence_score >= 0.50

            # Full dossier audit
            report_markdown = f"""
## Technical Findings
- {grounded_claim} [^1]

## References
[^1]: HNSW Vector Indexing in PostgreSQL.
"""
            audit_report = audit_report_citations(
                markdown_report=report_markdown,
                evidence_chunks=evidence_chunks,
                passing_threshold=0.75,
            )
            assert audit_report.total_claims == 1
            assert audit_report.is_passing is True

        finally:
            # Cleanup test entities
            stmt_user1 = select(User).where(User.id == user1.id)
            stmt_user2 = select(User).where(User.id == user2.id)
            u1 = (await db.execute(stmt_user1)).scalar_one_or_none()
            u2 = (await db.execute(stmt_user2)).scalar_one_or_none()

            if u1:
                await db.delete(u1)
            if u2:
                await db.delete(u2)
            await db.commit()

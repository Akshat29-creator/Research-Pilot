import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.document import Document
from app.services.ingestion_service import (
    compute_sha256,
    ingest_document,
)
from app.services.retrieval_service import semantic_search


def test_compute_sha256_consistency():
    h1 = compute_sha256("Test document content for hashing.")
    h2 = compute_sha256(b"Test document content for hashing.")
    assert h1 == h2
    assert len(h1) == 64


@pytest.mark.asyncio
async def test_ingest_document_deduplication_skips_embedding():
    user_id = uuid.uuid4()
    existing_doc_id = uuid.uuid4()
    raw_text = "Deduplicated empirical research content."
    content_hash = compute_sha256(raw_text)

    existing_doc = Document(
        id=existing_doc_id,
        user_id=user_id,
        title="Existing Research",
        file_path="virtual://existing",
        file_type="text/plain",
        file_size_bytes=len(raw_text),
        content_hash=content_hash,
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    # First query returns existing document
    mock_db_res1 = MagicMock()
    mock_db_res1.scalar_one_or_none.return_value = existing_doc

    # Second query returns existing chunks
    mock_db_res2 = MagicMock()
    mock_db_res2.scalars.return_value.all.return_value = [MagicMock(), MagicMock()]

    mock_db.execute.side_effect = [mock_db_res1, mock_db_res2]

    with patch("app.services.ingestion_service.get_embedding_provider") as mock_emb_factory:
        mock_emb = AsyncMock()
        mock_emb_factory.return_value = mock_emb

        result = await ingest_document(
            db=mock_db,
            user_id=user_id,
            title="Duplicate Test",
            content=raw_text,
        )

        assert result.is_duplicate is True
        assert result.document_id == existing_doc_id
        assert result.chunk_count == 2
        # Crucial check: embedding provider was NEVER called due to hash match!
        mock_emb.embed_batch.assert_not_called()


@pytest.mark.asyncio
async def test_ingest_document_new_content():
    user_id = uuid.uuid4()
    raw_text = "Novel research paper on multi-agent cognitive architectures in local LLMs."

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    # Query returns None (no existing document)
    mock_db_res = MagicMock()
    mock_db_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_db_res

    fake_vector = [0.1] * 768

    with patch("app.services.ingestion_service.get_embedding_provider") as mock_emb_factory:
        mock_emb = AsyncMock()
        mock_emb.embed_batch.return_value = [fake_vector]
        mock_emb.model_name = "nomic-embed-text"
        mock_emb_factory.return_value = mock_emb

        result = await ingest_document(
            db=mock_db,
            user_id=user_id,
            title="Novel Paper",
            content=raw_text,
        )

        assert result.is_duplicate is False
        assert result.chunk_count >= 1
        assert result.title == "Novel Paper"
        mock_emb.embed_batch.assert_called_once()
        assert mock_db.commit.called


@pytest.mark.asyncio
async def test_semantic_search_empty_query():
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    results = await semantic_search(
        db=mock_db,
        user_id=uuid.uuid4(),
        query="   ",
    )
    assert results == []


@pytest.mark.asyncio
async def test_semantic_search_executes_query():
    user_id = uuid.uuid4()
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    chunk_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    mock_row = (
        chunk_id,
        doc_id,
        "Vector Search Study",
        "HNSW provides logarithmic search time.",
        1,
        0,
        0.88,  # similarity
    )
    mock_db_res = MagicMock()
    mock_db_res.all.return_value = [mock_row]
    mock_db.execute.return_value = mock_db_res

    with patch("app.services.retrieval_service.get_embedding_provider") as mock_emb_factory:
        mock_emb = AsyncMock()
        mock_emb.embed_text.return_value = [0.05] * 768
        mock_emb_factory.return_value = mock_emb

        results = await semantic_search(
            db=mock_db,
            user_id=user_id,
            query="logarithmic vector search",
            top_k=3,
            min_similarity=0.70,
        )

        assert len(results) == 1
        res = results[0]
        assert res.chunk_id == chunk_id
        assert res.document_id == doc_id
        assert res.document_title == "Vector Search Study"
        assert res.similarity == 0.88
        assert res.page_number == 1
        mock_emb.embed_text.assert_called_once_with("logarithmic vector search")

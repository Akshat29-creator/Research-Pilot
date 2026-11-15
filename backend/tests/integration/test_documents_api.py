import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    email = f"doc_user_{uuid.uuid4().hex[:8]}@example.com"
    payload = {"email": email, "password": "SecurePassword123!"}
    res = await client.post("/api/v1/auth/register", json=payload)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_upload_and_list_documents(client: AsyncClient, auth_headers: dict):
    # Mock embedding provider to ensure fast, deterministic tests
    mock_vec = [0.05] * 768
    with patch("app.services.ingestion_service.get_embedding_provider") as mock_get_ep:
        mock_ep = AsyncMock()
        mock_ep.embed_batch.return_value = [mock_vec]
        mock_get_ep.return_value = mock_ep

        file_content = b"ResearchPilot AI document ingestion test content for hybrid retrieval."
        files = {"file": ("sample_corpus.txt", file_content, "text/plain")}

        res = await client.post("/api/v1/documents/upload", files=files, headers=auth_headers)
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == "sample_corpus.txt"
        assert data["chunk_count"] >= 1
        doc_id = data["id"]

        # List documents
        list_res = await client.get("/api/v1/documents", headers=auth_headers)
        assert list_res.status_code == 200
        docs = list_res.json()
        assert any(d["id"] == doc_id for d in docs)

        # Retrieve chunks
        chunk_res = await client.get(f"/api/v1/documents/{doc_id}/chunks", headers=auth_headers)
        assert chunk_res.status_code == 200
        chunks = chunk_res.json()
        assert len(chunks) >= 1
        assert "ResearchPilot" in chunks[0]["content"]

        # Delete document
        del_res = await client.delete(f"/api/v1/documents/{doc_id}", headers=auth_headers)
        assert del_res.status_code == 200
        assert del_res.json()["deleted"] is True

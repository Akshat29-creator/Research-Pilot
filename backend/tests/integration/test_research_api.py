import uuid

import pytest
from httpx import AsyncClient


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    payload = {"email": email, "password": "SecurePassword123!"}
    res = await client.post("/api/v1/auth/register", json=payload)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_research_session(client: AsyncClient, auth_headers: dict):
    payload = {
        "query": "Empirical comparison of pgvector HNSW vs IVFFlat",
        "title": "HNSW vs IVFFlat Study",
        "max_iterations": 2,
        "approval_required": False,
    }
    res = await client.post("/api/v1/research/sessions", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "HNSW vs IVFFlat Study"
    assert data["initial_query"] == payload["query"]
    assert data["status"] == "INITIALIZED"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_research_sessions(client: AsyncClient, auth_headers: dict):
    # Create two sessions
    for i in range(2):
        await client.post(
            "/api/v1/research/sessions",
            json={"query": f"Session query {i}"},
            headers=auth_headers,
        )

    res = await client.get("/api/v1/research/sessions", headers=auth_headers)
    assert res.status_code == 200
    sessions = res.json()
    assert len(sessions) >= 2


@pytest.mark.asyncio
async def test_get_research_session_detail(client: AsyncClient, auth_headers: dict):
    create_res = await client.post(
        "/api/v1/research/sessions",
        json={"query": "Detailed session analysis"},
        headers=auth_headers,
    )
    session_id = create_res.json()["id"]

    res = await client.get(f"/api/v1/research/sessions/{session_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == session_id
    assert data["initial_query"] == "Detailed session analysis"
    assert data["sources_count"] == 0


@pytest.mark.asyncio
async def test_get_research_session_not_found(client: AsyncClient, auth_headers: dict):
    fake_id = str(uuid.uuid4())
    res = await client.get(f"/api/v1/research/sessions/{fake_id}", headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_system_telemetry(client: AsyncClient):
    res = await client.get("/api/v1/system/telemetry")
    assert res.status_code == 200
    data = res.json()
    assert data["device_name"] == "NVIDIA GeForce RTX 5060 Laptop GPU"
    assert data["total_vram_mb"] == 8151.0
    assert "concurrency_active" in data
    assert "concurrency_waiting" in data

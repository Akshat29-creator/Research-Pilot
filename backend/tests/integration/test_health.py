import pytest
from httpx import AsyncClient, Response


@pytest.mark.asyncio
async def test_liveness_probe(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time" in response.headers


@pytest.mark.asyncio
async def test_readiness_probe_ollama_down(client: AsyncClient, monkeypatch):
    class MockRedis:
        async def ping(self):
            return True

        async def aclose(self):
            pass

    monkeypatch.setattr("redis.asyncio.from_url", lambda *args, **kwargs: MockRedis())

    original_get = AsyncClient.get

    async def mock_get(self, url, *args, **kwargs):
        # Only intercept calls to Ollama (port 11434)
        if "11434" in str(url):
            raise ConnectionRefusedError("Connection refused on 11434")
        return await original_get(self, url, *args, **kwargs)

    monkeypatch.setattr(AsyncClient, "get", mock_get)

    response = await client.get("/api/v1/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["checks"]["database"]["status"] == "healthy"
    assert data["checks"]["ollama"]["status"] == "unreachable"
    assert any("offline" in w.lower() for w in data["warnings"])


@pytest.mark.asyncio
async def test_readiness_probe_all_healthy(client: AsyncClient, monkeypatch):
    class MockRedis:
        async def ping(self):
            return True

        async def aclose(self):
            pass

    monkeypatch.setattr("redis.asyncio.from_url", lambda *args, **kwargs: MockRedis())

    original_get = AsyncClient.get

    async def mock_get(self, url, *args, **kwargs):
        if "11434" in str(url):
            if "/api/tags" in str(url):
                return Response(200, json={"models": [{"name": "qwen3:8b"}]})
            if "/api/ps" in str(url):
                return Response(
                    200,
                    json={
                        "models": [
                            {"name": "qwen3:8b", "size": 5200000000, "size_vram": 5200000000}
                        ]
                    },
                )
        return await original_get(self, url, *args, **kwargs)

    monkeypatch.setattr(AsyncClient, "get", mock_get)

    response = await client.get("/api/v1/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["checks"]["database"]["status"] == "healthy"
    assert data["checks"]["redis"]["status"] == "healthy"
    assert data["checks"]["ollama"]["status"] == "healthy"
    assert data["checks"]["vram"]["status"] == "healthy"

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.integrations.search.base import canonicalize_url
from app.integrations.search.brave import BraveSearchProvider
from app.integrations.search.factory import get_search_provider, reset_search_provider
from app.integrations.search.searxng import SearXNGSearchProvider
from app.integrations.search.tavily import TavilySearchProvider


def test_canonicalize_url():
    # Strips tracking parameters
    url = "https://example.com/research/paper?utm_source=twitter&utm_medium=social&id=123"
    clean = canonicalize_url(url)
    assert "utm_source" not in clean
    assert "utm_medium" not in clean
    assert "id=123" in clean
    assert clean.startswith("https://example.com/research/paper")

    # Lowercases domain and strips www.
    url2 = "HTTPS://WWW.Example.ORG/Docs/"
    clean2 = canonicalize_url(url2)
    assert clean2 == "https://example.org/Docs"


@pytest.mark.asyncio
async def test_searxng_provider_success():
    provider = SearXNGSearchProvider(base_url="http://mock-searxng:8080")

    mock_resp = httpx.Response(
        status_code=200,
        json={
            "results": [
                {
                    "title": "Quantum Computing Basics",
                    "url": "https://example.com/quantum",
                    "content": "An overview of quantum algorithms and qubits.",
                    "score": 0.95,
                    "engine": "google",
                },
                {
                    "title": "Duplicate URL",
                    "url": "https://example.com/quantum?utm_source=rss",
                    "content": "Duplicate item",
                    "score": 0.5,
                    "engine": "duckduckgo",
                },
            ]
        },
        request=httpx.Request("GET", "http://mock-searxng:8080/search"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        results = await provider.search("quantum computing", max_results=5)

        # Duplicate canonical URL was filtered
        assert len(results) == 1
        assert results[0].title == "Quantum Computing Basics"
        assert results[0].url == "https://example.com/quantum"
        assert results[0].engine == "searxng:google"


@pytest.mark.asyncio
async def test_searxng_provider_error_handling():
    provider = SearXNGSearchProvider(base_url="http://offline-searxng:8080")

    with patch(
        "httpx.AsyncClient.get",
        side_effect=httpx.ConnectError(
            "Connection refused", request=httpx.Request("GET", "http://offline")
        ),
    ):
        results = await provider.search("query")
        assert results == []


@pytest.mark.asyncio
async def test_tavily_provider_missing_key():
    provider = TavilySearchProvider(api_key=None)
    results = await provider.search("test")
    assert results == []
    is_healthy = await provider.check_health()
    assert is_healthy is False


@pytest.mark.asyncio
async def test_tavily_provider_mock_success():
    provider = TavilySearchProvider(api_key="tvly-mock-key")

    mock_resp = httpx.Response(
        status_code=200,
        json={
            "results": [
                {
                    "title": "Tavily Research Item",
                    "url": "https://arxiv.org/abs/2401.0001",
                    "content": "Groundbreaking paper on agent loops.",
                    "score": 0.99,
                }
            ]
        },
        request=httpx.Request("POST", "https://api.tavily.com/search"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        results = await provider.search("agents", max_results=2)

        assert len(results) == 1
        assert results[0].title == "Tavily Research Item"
        assert results[0].domain == "arxiv.org"


@pytest.mark.asyncio
async def test_brave_provider_missing_key():
    provider = BraveSearchProvider(api_key=None)
    results = await provider.search("test")
    assert results == []
    is_healthy = await provider.check_health()
    assert is_healthy is False


def test_factory_fallback_to_searxng():
    reset_search_provider()
    # Asking for tavily or brave without API key falls back to SearXNG
    provider = get_search_provider("tavily")
    assert isinstance(provider, SearXNGSearchProvider)

    reset_search_provider()
    provider_brave = get_search_provider("brave")
    assert isinstance(provider_brave, SearXNGSearchProvider)

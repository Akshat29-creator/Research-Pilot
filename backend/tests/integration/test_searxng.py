import pytest

from app.integrations.search.searxng import SearXNGSearchProvider


@pytest.mark.asyncio
async def test_live_searxng_health():
    """Verify live SearXNG metasearch container responds on port 8080."""
    provider = SearXNGSearchProvider()
    healthy = await provider.check_health()
    assert healthy is True


@pytest.mark.asyncio
async def test_live_searxng_search_query():
    """Verify live SearXNG instance executes search and returns normalized results."""
    provider = SearXNGSearchProvider()
    results = await provider.search("quantum computing artificial intelligence", max_results=3)

    assert isinstance(results, list)
    assert len(results) > 0
    first = results[0]
    assert first.title is not None and len(first.title) > 0
    assert first.url.startswith("http")
    assert first.snippet is not None
    assert first.engine.startswith("searxng:")

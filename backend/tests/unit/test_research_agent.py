from unittest.mock import AsyncMock, patch

import pytest

from app.agents.research import (
    ResearchAgent,
    ResearchFindingItem,
    ResearchSynthesis,
)
from app.integrations.llm.base import LLMProvider, LLMResponse, ProviderHealth
from app.integrations.search.base import SearchProvider, SearchResult


class MockSearchProvider(SearchProvider):
    async def search(self, query: str, max_results: int = 5):
        return [
            SearchResult(
                title=f"Result for {query}",
                url=f"https://arxiv.org/abs/{hash(query)}",
                snippet=f"Snippet discussing {query}",
                domain="arxiv.org",
                engine="mock",
            )
        ]

    async def check_health(self):
        return True


class MockLLMProvider(LLMProvider):
    async def generate(self, prompt: str, system=None, options=None):
        return LLMResponse(content="Mock response", model="mock")

    async def generate_structured(self, prompt: str, response_model, system=None, options=None):
        return ResearchSynthesis(
            summary="Synthesized findings on pgvector performance.",
            findings=[
                ResearchFindingItem(
                    claim="HNSW achieves 98% recall with sub-10ms latency.",
                    citation_url="https://arxiv.org/abs/12345",
                    source_id="src_1",
                    confidence=0.95,
                )
            ],
            identified_gaps=["Quantization trade-offs under high concurrency."],
        )

    async def stream(self, prompt: str, system=None, options=None):
        yield "token"

    async def check_health(self):
        return ProviderHealth(is_healthy=True, model_available=True, message="Mock")


@pytest.mark.asyncio
async def test_research_agent_plan_queries():
    agent = ResearchAgent(search_provider=MockSearchProvider(), llm_provider=MockLLMProvider())
    queries = await agent.plan_queries("pgvector vs pinecone")

    assert len(queries) >= 2
    assert "pgvector vs pinecone" in queries[0]
    assert any("benchmark" in q for q in queries)


@pytest.mark.asyncio
async def test_research_agent_gather_sources():
    agent = ResearchAgent(search_provider=MockSearchProvider(), llm_provider=MockLLMProvider())

    with patch(
        "app.agents.research.safe_fetch_url",
        new_callable=AsyncMock,
        return_value="<html><body><p>Article body on pgvector HNSW indexing.</p></body></html>",
    ):
        sources = await agent.gather_sources(
            queries=["pgvector indexing"],
            max_sources_per_query=2,
            fetch_full_content=True,
        )

        assert len(sources) >= 1
        assert sources[0].id == "src_1"
        assert sources[0].domain == "arxiv.org"
        assert sources[0].fetch_status == "FETCHED_FULL"
        assert "Article body" in (sources[0].full_text or "")
        assert len(sources[0].content_hash) == 64


@pytest.mark.asyncio
async def test_research_agent_execute_e2e():
    agent = ResearchAgent(search_provider=MockSearchProvider(), llm_provider=MockLLMProvider())

    with patch(
        "app.agents.research.safe_fetch_url",
        new_callable=AsyncMock,
        return_value="<html><body><p>Mocked article text.</p></body></html>",
    ):
        result = await agent.execute(
            topic="pgvector performance benchmarks", max_sources_per_query=1
        )

        assert result.query == "pgvector performance benchmarks"
        assert len(result.sources) >= 1
        assert len(result.findings) == 1
        assert result.findings[0].confidence == 0.95
        assert "HNSW achieves" in result.findings[0].claim
        assert result.duration_ms > 0

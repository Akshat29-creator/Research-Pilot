import pytest

from app.integrations.llm.embeddings import OllamaEmbeddingProvider
from app.integrations.llm.ollama import OllamaProvider


@pytest.mark.asyncio
async def test_live_ollama_health():
    """Verify live host Ollama instance is responding and reports primary model."""
    provider = OllamaProvider()
    health = await provider.check_health()

    assert health.is_healthy is True
    assert health.model_available is True
    assert "installed_models" in health.details


@pytest.mark.asyncio
async def test_live_embedding_health():
    """Verify live embedding provider reports healthy status for nomic-embed-text."""
    embed_provider = OllamaEmbeddingProvider()
    health = await embed_provider.check_health()

    assert health.is_healthy is True
    assert health.model_available is True


@pytest.mark.asyncio
async def test_live_embedding_single_and_batch():
    """Verify actual vector generation produces exact 768-dimensional floats."""
    embed_provider = OllamaEmbeddingProvider()

    # Single text embedding
    vec = await embed_provider.embed_text(
        "Lenovo Legion RTX 5060 ResearchPilot vector embedding test"
    )
    assert isinstance(vec, list)
    assert len(vec) == 768
    assert all(isinstance(val, float) for val in vec)

    # Batch embedding
    batch = await embed_provider.embed_batch(
        [
            "Autonomous multi-agent scientific paper synthesis",
            "Deterministic local-first pgvector semantic search",
        ]
    )
    assert len(batch) == 2
    assert len(batch[0]) == 768
    assert len(batch[1]) == 768


@pytest.mark.asyncio
async def test_live_qwen3_generation():
    """Verify live qwen3:8b model generates text under semaphore lock."""
    provider = OllamaProvider()

    resp = await provider.generate(
        prompt="What is 2+2? Answer with just the number.",
    )

    assert resp.content is not None
    assert len(resp.content.strip()) > 0
    assert resp.total_tokens > 0
    assert "qwen3" in resp.model.lower()

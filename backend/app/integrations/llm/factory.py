from app.integrations.llm.base import EmbeddingProvider, LLMProvider
from app.integrations.llm.embeddings import OllamaEmbeddingProvider
from app.integrations.llm.ollama import OllamaProvider

_llm_provider_instance: LLMProvider | None = None
_embedding_provider_instance: EmbeddingProvider | None = None


def get_llm_provider() -> LLMProvider:
    """Return the application-wide singleton LLM provider instance."""
    global _llm_provider_instance
    if _llm_provider_instance is None:
        _llm_provider_instance = OllamaProvider()
    return _llm_provider_instance


def get_embedding_provider() -> EmbeddingProvider:
    """Return the application-wide singleton Embedding provider instance."""
    global _embedding_provider_instance
    if _embedding_provider_instance is None:
        _embedding_provider_instance = OllamaEmbeddingProvider()
    return _embedding_provider_instance


def reset_providers() -> None:
    """Reset cached provider instances (primarily for testing and reconfiguration)."""
    global _llm_provider_instance, _embedding_provider_instance
    _llm_provider_instance = None
    _embedding_provider_instance = None

import logging

from app.core.config import settings
from app.integrations.search.base import SearchProvider
from app.integrations.search.brave import BraveSearchProvider
from app.integrations.search.searxng import SearXNGSearchProvider
from app.integrations.search.tavily import TavilySearchProvider

logger = logging.getLogger("researchpilot.search.factory")
_search_provider_instance: SearchProvider | None = None


def get_search_provider(provider_name: str | None = None) -> SearchProvider:
    """Return the configured SearchProvider instance with automatic local fallback."""
    global _search_provider_instance
    if _search_provider_instance is not None and provider_name is None:
        return _search_provider_instance

    target = (provider_name or settings.SEARCH_PROVIDER or "searxng").lower()

    if target == "tavily" and settings.TAVILY_API_KEY:
        instance: SearchProvider = TavilySearchProvider()
    elif target == "brave" and settings.BRAVE_API_KEY:
        instance = BraveSearchProvider()
    else:
        if target in ("tavily", "brave"):
            logger.info(
                "Requested search provider '%s' has no API key; falling back to local SearXNG.",
                target,
            )
        instance = SearXNGSearchProvider()

    if provider_name is None:
        _search_provider_instance = instance
    return instance


def reset_search_provider() -> None:
    """Reset cached search provider instance (for testing)."""
    global _search_provider_instance
    _search_provider_instance = None

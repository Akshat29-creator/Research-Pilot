from app.integrations.search.arxiv import ArxivSearchProvider
from app.integrations.search.base import (
    SearchProvider,
    SearchResult,
    canonicalize_url,
)
from app.integrations.search.brave import BraveSearchProvider
from app.integrations.search.factory import (
    get_search_provider,
    reset_search_provider,
)
from app.integrations.search.pubmed import PubMedSearchProvider
from app.integrations.search.searxng import SearXNGSearchProvider
from app.integrations.search.tavily import TavilySearchProvider

__all__ = [
    "SearchProvider",
    "SearchResult",
    "canonicalize_url",
    "SearXNGSearchProvider",
    "TavilySearchProvider",
    "BraveSearchProvider",
    "ArxivSearchProvider",
    "PubMedSearchProvider",
    "get_search_provider",
    "reset_search_provider",
]

from abc import ABC, abstractmethod
from typing import Any, Dict, List
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pydantic import BaseModel, Field


def canonicalize_url(url: str) -> str:
    """Normalize a URL by lowercasing domain, removing tracking params, and trailing slash."""
    if not url:
        return ""
    try:
        parsed = urlparse(url.strip())
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]

        # Filter out common analytics and tracking query parameters
        tracking_params = {
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "fbclid",
            "gclid",
            "ref",
            "source",
            "_ga",
            "_gl",
        }
        filtered_queries = [
            (k, v)
            for k, v in parse_qsl(parsed.query, keep_blank_values=False)
            if k.lower() not in tracking_params
        ]
        clean_query = urlencode(filtered_queries)
        path = parsed.path.rstrip("/") if parsed.path != "/" else "/"

        return urlunparse((parsed.scheme.lower(), netloc, path, parsed.params, clean_query, ""))
    except Exception:
        return url.strip()


class SearchResult(BaseModel):
    """Normalized search result item across all search engines."""

    title: str = Field(description="Title of the search result.")
    url: str = Field(description="Canonicalized web destination URL.")
    snippet: str = Field(description="Explanatory snippet or summary excerpt.")
    raw_content: str | None = Field(
        default=None, description="Full extracted body text if available."
    )
    score: float = Field(default=0.0, description="Relevance score assigned by the provider.")
    engine: str = Field(
        default="unknown", description="Source search engine (e.g. searxng, tavily, brave)."
    )
    published_date: str | None = Field(default=None, description="Date of publication if detected.")
    domain: str = Field(default="", description="Base domain of the destination.")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Provider-specific raw metadata."
    )

    def model_post_init(self, __context: Any) -> None:
        if self.url and not self.domain:
            try:
                parsed = urlparse(self.url)
                self.domain = parsed.netloc.lower()
            except Exception:
                self.domain = ""


class SearchProvider(ABC):
    """Abstract base class for search provider implementations."""

    @abstractmethod
    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """Execute a web or academic search and return normalized SearchResult objects."""
        pass

    @abstractmethod
    async def check_health(self) -> bool:
        """Inspect search service reachability and API responsiveness."""
        pass

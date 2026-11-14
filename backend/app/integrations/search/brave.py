import logging
from typing import List, Set

import httpx

from app.core.config import settings
from app.integrations.search.base import SearchProvider, SearchResult, canonicalize_url

logger = logging.getLogger("researchpilot.search.brave")


class BraveSearchProvider(SearchProvider):
    """External privacy-focused search provider via Brave Search API."""

    def __init__(self, api_key: str | None = None, timeout: float = 10.0):
        self.api_key = api_key or settings.BRAVE_API_KEY
        self.timeout = timeout
        self.endpoint = "https://api.search.brave.com/res/v1/web/search"

    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """Execute Brave Search API query and return normalized results."""
        if not self.api_key:
            logger.debug("Brave API key is not configured; skipping Brave search.")
            return []

        if not query or not query.strip():
            return []

        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": self.api_key,
        }
        params: dict[str, str | int] = {
            "q": query.strip(),
            "count": max_results,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(self.endpoint, headers=headers, params=params)
                resp.raise_for_status()
                data = resp.json()

            results: List[SearchResult] = []
            seen_urls: Set[str] = set()

            for item in data.get("web", {}).get("results", []):
                raw_url = item.get("url", "")
                if not raw_url:
                    continue

                canonical_url = canonicalize_url(raw_url)
                if canonical_url in seen_urls:
                    continue
                seen_urls.add(canonical_url)

                title = item.get("title", "").strip() or canonical_url
                snippet = item.get("description", "").strip()

                results.append(
                    SearchResult(
                        title=title,
                        url=canonical_url,
                        snippet=snippet,
                        score=0.8,
                        engine="brave",
                        published_date=item.get("page_age"),
                        metadata={"age": item.get("page_age")},
                    )
                )

                if len(results) >= max_results:
                    break

            return results

        except Exception as e:
            logger.warning("Brave search failed for '%s': %s", query, str(e))
            return []

    async def check_health(self) -> bool:
        """Inspect whether Brave Search API key is present."""
        return bool(self.api_key and len(self.api_key.strip()) > 5)

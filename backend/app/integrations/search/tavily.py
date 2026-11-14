import logging
from typing import List, Set

import httpx

from app.core.config import settings
from app.integrations.search.base import SearchProvider, SearchResult, canonicalize_url

logger = logging.getLogger("researchpilot.search.tavily")


class TavilySearchProvider(SearchProvider):
    """External research search provider via official Tavily API."""

    def __init__(self, api_key: str | None = None, timeout: float = 12.0):
        self.api_key = api_key or settings.TAVILY_API_KEY
        self.timeout = timeout
        self.endpoint = "https://api.tavily.com/search"

    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """Execute Tavily search query and return normalized SearchResult list."""
        if not self.api_key:
            logger.debug("Tavily API key is not configured; skipping Tavily search.")
            return []

        if not query or not query.strip():
            return []

        payload = {
            "api_key": self.api_key,
            "query": query.strip(),
            "max_results": max_results,
            "search_depth": "advanced",
            "include_raw_content": False,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(self.endpoint, json=payload)
                resp.raise_for_status()
                data = resp.json()

            results: List[SearchResult] = []
            seen_urls: Set[str] = set()

            for item in data.get("results", []):
                raw_url = item.get("url", "")
                if not raw_url:
                    continue

                canonical_url = canonicalize_url(raw_url)
                if canonical_url in seen_urls:
                    continue
                seen_urls.add(canonical_url)

                title = item.get("title", "").strip() or canonical_url
                snippet = item.get("content", "").strip()
                score = float(item.get("score", 0.0) or 0.0)
                raw_content = item.get("raw_content")

                results.append(
                    SearchResult(
                        title=title,
                        url=canonical_url,
                        snippet=snippet,
                        raw_content=raw_content,
                        score=score,
                        engine="tavily",
                        published_date=item.get("published_date"),
                        metadata={"tavily_score": score},
                    )
                )

                if len(results) >= max_results:
                    break

            return results

        except Exception as e:
            logger.warning("Tavily search failed for '%s': %s", query, str(e))
            return []

    async def check_health(self) -> bool:
        """Inspect whether Tavily API is configured and credentials are valid."""
        return bool(self.api_key and len(self.api_key.strip()) > 5)

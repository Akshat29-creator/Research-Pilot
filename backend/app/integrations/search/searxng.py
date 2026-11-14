import logging
from typing import List, Set

import httpx

from app.core.config import settings
from app.integrations.search.base import SearchProvider, SearchResult, canonicalize_url

logger = logging.getLogger("researchpilot.search.searxng")


class SearXNGSearchProvider(SearchProvider):
    """Local, privacy-preserving metasearch provider using self-hosted SearXNG."""

    def __init__(
        self,
        base_url: str | None = None,
        timeout: float = 10.0,
        categories: str = "general,science",
    ):
        self.base_url = (base_url or settings.SEARXNG_BASE_URL).rstrip("/")
        self.timeout = timeout
        self.categories = categories

    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """Query local SearXNG instance and return deduplicated normalized results."""
        if not query or not query.strip():
            return []

        clean_query = query.strip()
        params = {
            "q": clean_query,
            "format": "json",
            "categories": self.categories,
            "language": "auto",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(f"{self.base_url}/search", params=params)
                resp.raise_for_status()
                data = resp.json()

            raw_results = data.get("results", [])
            results: List[SearchResult] = []
            seen_urls: Set[str] = set()

            for item in raw_results:
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
                engine = item.get("engine", "searxng")
                published_date = item.get("publishedDate") or item.get("pubdate")

                results.append(
                    SearchResult(
                        title=title,
                        url=canonical_url,
                        snippet=snippet,
                        score=score,
                        engine=f"searxng:{engine}",
                        published_date=str(published_date) if published_date else None,
                        metadata={
                            "engines": item.get("engines", []),
                            "category": item.get("category", ""),
                        },
                    )
                )

                if len(results) >= max_results:
                    break

            return results

        except httpx.ConnectError as e:
            logger.warning("SearXNG container unreachable at %s: %s", self.base_url, str(e))
            return []
        except (httpx.TimeoutException, TimeoutError) as e:
            logger.warning("SearXNG search timed out after %.1fs: %s", self.timeout, str(e))
            return []
        except Exception as e:
            logger.error("SearXNG search failed for query '%s': %s", clean_query, str(e))
            return []

    async def check_health(self) -> bool:
        """Inspect whether the SearXNG metasearch instance is reachable."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(f"{self.base_url}/")
                return resp.status_code == 200
        except Exception:
            return False

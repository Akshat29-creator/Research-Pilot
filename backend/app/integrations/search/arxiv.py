"""arXiv Academic Search Provider.

Queries the official arXiv API (https://export.arxiv.org/api/query) for preprints
and papers, parsing Atom XML feeds into normalized SearchResult objects.
"""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from typing import List, Set

import httpx

from app.integrations.search.base import SearchProvider, SearchResult, canonicalize_url

logger = logging.getLogger("researchpilot.search.arxiv")

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}


class ArxivSearchProvider(SearchProvider):
    """Direct arXiv academic literature connector."""

    def __init__(
        self,
        base_url: str = "https://export.arxiv.org/api/query",
        timeout: float = 12.0,
    ) -> None:
        self.base_url = base_url
        self.timeout = timeout

    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """Query arXiv and return normalized SearchResult objects."""
        if not query or not query.strip():
            return []

        clean_query = query.strip()
        params = {
            "search_query": f"all:{clean_query}",
            "start": "0",
            "max_results": str(max(1, min(max_results, 50))),
            "sortBy": "relevance",
            "sortOrder": "descending",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(self.base_url, params=params)
                resp.raise_for_status()
                xml_text = resp.text

            root = ET.fromstring(xml_text)
            results: List[SearchResult] = []
            seen_urls: Set[str] = set()

            entries = root.findall("atom:entry", ATOM_NS)
            for i, entry in enumerate(entries):
                title_elem = entry.findtext("atom:title", default="", namespaces=ATOM_NS)
                title = " ".join(title_elem.split()).strip()

                id_elem = entry.findtext("atom:id", default="", namespaces=ATOM_NS).strip()
                if not id_elem:
                    continue

                canonical_url = canonicalize_url(id_elem)
                if canonical_url in seen_urls:
                    continue
                seen_urls.add(canonical_url)

                summary_elem = entry.findtext("atom:summary", default="", namespaces=ATOM_NS)
                summary = " ".join(summary_elem.split()).strip()

                pub_date = entry.findtext("atom:published", default="", namespaces=ATOM_NS).strip()
                updated_date = entry.findtext(
                    "atom:updated", default="", namespaces=ATOM_NS
                ).strip()

                authors = [
                    a.findtext("atom:name", default="", namespaces=ATOM_NS).strip()
                    for a in entry.findall("atom:author", ATOM_NS)
                ]

                # PDF Link
                pdf_link = ""
                for link in entry.findall("atom:link", ATOM_NS):
                    if link.get("title") == "pdf" or link.get("type") == "application/pdf":
                        pdf_link = link.get("href", "")
                        break

                # Primary category and DOI
                doi = entry.findtext("arxiv:doi", default="", namespaces=ATOM_NS).strip()
                categories = [
                    c.get("term", "")
                    for c in entry.findall("atom:category", ATOM_NS)
                    if c.get("term")
                ]

                # Rank score proportional to order
                rank_score = max(0.1, round(1.0 - (i * 0.1), 2))

                results.append(
                    SearchResult(
                        title=title or canonical_url,
                        url=canonical_url,
                        snippet=summary[:350] + "..." if len(summary) > 350 else summary,
                        raw_content=summary,
                        score=rank_score,
                        engine="arxiv",
                        published_date=pub_date[:10] if pub_date else None,
                        domain="arxiv.org",
                        metadata={
                            "authors": authors,
                            "pdf_url": pdf_link,
                            "doi": doi,
                            "categories": categories,
                            "updated_date": updated_date,
                        },
                    )
                )

                if len(results) >= max_results:
                    break

            return results

        except httpx.ConnectError as e:
            logger.warning("arXiv API unreachable at %s: %s", self.base_url, str(e))
            return []
        except (httpx.TimeoutException, TimeoutError) as e:
            logger.warning("arXiv search timed out after %.1fs: %s", self.timeout, str(e))
            return []
        except ET.ParseError as e:
            logger.error("Failed to parse arXiv Atom XML response: %s", str(e))
            return []
        except Exception as e:
            logger.error("arXiv search failed for query '%s': %s", clean_query, str(e))
            return []

    async def check_health(self) -> bool:
        """Inspect whether the arXiv API is responsive."""
        try:
            params = {
                "search_query": "id:1706.03762",
                "max_results": "1",
            }
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(self.base_url, params=params)
                return resp.status_code == 200 and "<entry>" in resp.text
        except Exception:
            return False

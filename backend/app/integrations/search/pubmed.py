"""PubMed Academic Search Provider.

Queries NCBI Entrez E-utilities (esearch.fcgi and esummary.fcgi) for biomedical
and scientific peer-reviewed publications, returning normalized SearchResult objects.
"""

from __future__ import annotations

import logging
from typing import List, Set

import httpx

from app.integrations.search.base import SearchProvider, SearchResult, canonicalize_url

logger = logging.getLogger("researchpilot.search.pubmed")


class PubMedSearchProvider(SearchProvider):
    """Direct NCBI PubMed biomedical and life sciences literature connector."""

    def __init__(
        self,
        base_url: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils",
        timeout: float = 12.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """Query PubMed via NCBI E-utilities and return normalized SearchResult objects."""
        if not query or not query.strip():
            return []

        clean_query = query.strip()
        search_limit = max(1, min(max_results, 50))

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Step 1: Query esearch to get PMIDs
                esearch_params = {
                    "db": "pubmed",
                    "term": clean_query,
                    "retmode": "json",
                    "retmax": str(search_limit),
                    "sort": "relevance",
                }
                search_resp = await client.get(
                    f"{self.base_url}/esearch.fcgi", params=esearch_params
                )
                search_resp.raise_for_status()
                search_data = search_resp.json()

                id_list = search_data.get("esearchresult", {}).get("idlist", [])
                if not id_list:
                    return []

                # Step 2: Fetch article summaries for PMIDs
                esummary_params = {
                    "db": "pubmed",
                    "id": ",".join(id_list),
                    "retmode": "json",
                }
                summary_resp = await client.get(
                    f"{self.base_url}/esummary.fcgi", params=esummary_params
                )
                summary_resp.raise_for_status()
                summary_data = summary_resp.json()

            results_dict = summary_data.get("result", {})
            results: List[SearchResult] = []
            seen_urls: Set[str] = set()

            for i, pmid in enumerate(id_list):
                item = results_dict.get(pmid)
                if not item or not isinstance(item, dict):
                    continue

                raw_title = item.get("title", "").strip()
                title = " ".join(raw_title.split()).rstrip(".")
                pub_url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                canonical_url = canonicalize_url(pub_url)

                if canonical_url in seen_urls:
                    continue
                seen_urls.add(canonical_url)

                source_journal = item.get("source", "").strip()
                pub_date = item.get("pubdate", "").strip()
                authors = [
                    a.get("name", "").strip()
                    for a in item.get("authors", [])
                    if isinstance(a, dict) and a.get("name")
                ]

                # Extract DOI if present
                doi = ""
                for aid in item.get("articleids", []):
                    if isinstance(aid, dict) and aid.get("idtype") == "doi":
                        doi = aid.get("value", "")
                        break

                author_str = ", ".join(authors[:3]) + (" et al." if len(authors) > 3 else "")
                snippet_parts = []
                if author_str:
                    snippet_parts.append(f"Authors: {author_str}")
                if source_journal:
                    snippet_parts.append(f"Journal: {source_journal} ({pub_date})")
                if doi:
                    snippet_parts.append(f"DOI: {doi}")

                snippet = " • ".join(snippet_parts) or f"PubMed article ID {pmid}"
                rank_score = max(0.1, round(1.0 - (i * 0.1), 2))

                results.append(
                    SearchResult(
                        title=title or f"PubMed: {pmid}",
                        url=canonical_url,
                        snippet=snippet,
                        raw_content=(
                            f"{title}. Published in {source_journal} ({pub_date}). {author_str}"
                        ),
                        score=rank_score,
                        engine="pubmed",
                        published_date=pub_date[:10] if pub_date else None,
                        domain="pubmed.ncbi.nlm.nih.gov",
                        metadata={
                            "pmid": pmid,
                            "journal": source_journal,
                            "authors": authors,
                            "doi": doi,
                        },
                    )
                )

                if len(results) >= max_results:
                    break

            return results

        except httpx.ConnectError as e:
            logger.warning("PubMed API unreachable at %s: %s", self.base_url, str(e))
            return []
        except (httpx.TimeoutException, TimeoutError) as e:
            logger.warning("PubMed search timed out after %.1fs: %s", self.timeout, str(e))
            return []
        except Exception as e:
            logger.error("PubMed search failed for query '%s': %s", clean_query, str(e))
            return []

    async def check_health(self) -> bool:
        """Inspect whether NCBI PubMed E-utilities are responsive."""
        try:
            params = {
                "db": "pubmed",
                "term": "cancer",
                "retmode": "json",
                "retmax": "1",
            }
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(f"{self.base_url}/esearch.fcgi", params=params)
                return resp.status_code == 200 and "idlist" in resp.text
        except Exception:
            return False

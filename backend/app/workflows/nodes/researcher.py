import hashlib
import logging
import time
from typing import Any, Dict, List, Set

from app.integrations.search.base import canonicalize_url
from app.integrations.search.factory import get_search_provider
from app.tools.ssrf import SSRFSecurityError, safe_fetch_url
from app.tools.web_extractor import extract_web_content
from app.workflows.state import ResearchWorkflowState

logger = logging.getLogger("researchpilot.workflows.researcher")


async def researcher_node(state: ResearchWorkflowState) -> Dict[str, Any]:
    """Researcher node: executes searches, applies SSRF-safe retrieval, and extracts clean text."""
    start_time = time.perf_counter()
    sub_queries = state.get("sub_queries") or [state.get("query", "")]

    logger.info("Researcher node executing %d queries", len(sub_queries))
    search_provider = get_search_provider()

    seen_urls: Set[str] = set()
    raw_results = []

    for q in sub_queries:
        try:
            results = await search_provider.search(q, max_results=3)
            for r in results:
                can_url = canonicalize_url(r.url)
                if can_url not in seen_urls:
                    seen_urls.add(can_url)
                    raw_results.append(r)
        except Exception as e:
            logger.warning("Search failed for sub-query '%s': %s", q, str(e))

    sources_list: List[Dict[str, Any]] = []
    evidence_list: List[Dict[str, Any]] = []

    for idx, item in enumerate(raw_results):
        src_id = f"src_{idx + 1}"
        can_url = canonicalize_url(item.url)
        full_text = None
        fetch_status = "SNIPPET_ONLY"

        try:
            raw_html = await safe_fetch_url(can_url, timeout=8.0)
            extracted = extract_web_content(raw_html, can_url)
            full_text = extracted.text
            fetch_status = "FETCHED_FULL"
        except SSRFSecurityError as e:
            logger.warning("SSRF defense blocked URL '%s': %s", can_url, str(e))
            fetch_status = "SSRF_BLOCKED"
        except Exception as e:
            logger.debug("Web fetch failed for '%s': %s", can_url, str(e))
            fetch_status = "FETCH_FAILED"

        content_body = full_text if full_text else item.snippet
        content_hash = hashlib.sha256(content_body.encode("utf-8")).hexdigest()

        source_record = {
            "id": src_id,
            "title": item.title,
            "url": can_url,
            "domain": item.domain,
            "snippet": item.snippet,
            "content_hash": content_hash,
            "fetch_status": fetch_status,
            "engine": item.engine,
        }
        sources_list.append(source_record)

        evidence_list.append(
            {
                "source_id": src_id,
                "title": item.title,
                "url": can_url,
                "domain": item.domain,
                "content": content_body[:3000],  # Bounded excerpt for prompt headroom
                "content_hash": content_hash,
            }
        )

    elapsed = (time.perf_counter() - start_time) * 1000
    timings = dict(state.get("timings", {}))
    timings["researcher"] = elapsed

    return {
        "sources": sources_list,
        "evidence": evidence_list,
        "status": "RESEARCHED",
        "timings": timings,
    }

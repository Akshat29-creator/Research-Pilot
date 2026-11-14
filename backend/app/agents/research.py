import hashlib
import logging
import time
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.integrations.llm.base import LLMProvider
from app.integrations.llm.factory import get_llm_provider
from app.integrations.search.base import SearchProvider, canonicalize_url
from app.integrations.search.factory import get_search_provider
from app.tools.isolation import (
    get_isolation_system_directive,
    wrap_multiple_untrusted_sources,
)
from app.tools.ssrf import SSRFSecurityError, safe_fetch_url
from app.tools.web_extractor import extract_web_content

logger = logging.getLogger("researchpilot.agents.research")


class ResearchFindingItem(BaseModel):
    """An individual verified factual finding extracted by the Research Agent."""

    claim: str = Field(description="Factual claim or assertion substantiated by evidence.")
    citation_url: str = Field(description="Source URL supporting this specific claim.")
    source_id: str = Field(description="Internal source reference ID (e.g. src_1).")
    confidence: float = Field(ge=0.0, le=1.0, description="Estimated confidence score.")


class ResearchSynthesis(BaseModel):
    """Structured extraction output synthesized from gathered research sources."""

    summary: str = Field(description="Comprehensive synthesis summary of the research topic.")
    findings: List[ResearchFindingItem] = Field(
        default_factory=list, description="List of granular findings with citations."
    )
    identified_gaps: List[str] = Field(
        default_factory=list, description="Open questions or unexplored aspects of the query."
    )


class DiscoveredSource(BaseModel):
    """Normalized evidence source gathered during research execution."""

    id: str = Field(description="Unique session-scoped identifier (e.g. src_1).")
    title: str = Field(description="Page or document title.")
    url: str = Field(description="Canonicalized web URL.")
    domain: str = Field(description="Source domain.")
    snippet: str = Field(description="Search snippet.")
    content_hash: str = Field(description="SHA256 checksum of the content.")
    full_text: str | None = Field(default=None, description="Full extracted text if fetched.")
    fetch_status: str = Field(default="SNIPPET_ONLY", description="Fetch status.")


class ResearchAgentResult(BaseModel):
    """Final output container from a ResearchAgent execution run."""

    query: str = Field(description="Original research topic or query.")
    sources: List[DiscoveredSource] = Field(description="Retrieved and verified sources.")
    findings: List[ResearchFindingItem] = Field(description="Extracted findings with citations.")
    summary: str = Field(description="Synthesized findings summary.")
    identified_gaps: List[str] = Field(description="Unresolved questions or research gaps.")
    searched_queries: List[str] = Field(description="All decomposed search queries executed.")
    duration_ms: float = Field(default=0.0, description="Total execution time in milliseconds.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Execution metrics.")


class ResearchAgent:
    """Autonomous Research Agent orchestrating search, SSRF-safe retrieval, and synthesis."""

    def __init__(
        self,
        search_provider: SearchProvider | None = None,
        llm_provider: LLMProvider | None = None,
    ):
        self.search_provider = search_provider or get_search_provider()
        self.llm_provider = llm_provider or get_llm_provider()

    async def plan_queries(self, topic: str) -> List[str]:
        """Decompose a high-level research topic into 2-3 focused search queries."""
        clean_topic = topic.strip()
        # Ensure the original topic is always included as primary query
        queries = [clean_topic]

        # Generate targeted sub-angles
        if " vs " in clean_topic.lower() or " versus " in clean_topic.lower():
            queries.append(f"{clean_topic} benchmark comparison latency")
        else:
            queries.append(f"{clean_topic} technical overview architecture")

        return queries[:3]

    async def gather_sources(
        self,
        queries: List[str],
        max_sources_per_query: int = 3,
        fetch_full_content: bool = True,
    ) -> List[DiscoveredSource]:
        """Execute searches across queries, deduplicate by URL, and safely fetch web content."""
        seen_urls: set[str] = set()
        raw_candidates = []

        # 1. Search phase
        for q in queries:
            results = await self.search_provider.search(q, max_results=max_sources_per_query)
            for r in results:
                can_url = canonicalize_url(r.url)
                if can_url not in seen_urls:
                    seen_urls.add(can_url)
                    raw_candidates.append(r)

        discovered: List[DiscoveredSource] = []

        # 2. Content retrieval phase (SSRF protected)
        for idx, item in enumerate(raw_candidates):
            src_id = f"src_{idx + 1}"
            can_url = canonicalize_url(item.url)
            full_text = None
            fetch_status = "SNIPPET_ONLY"

            if fetch_full_content:
                try:
                    raw_html = await safe_fetch_url(can_url, timeout=8.0)
                    extracted = extract_web_content(raw_html, can_url)
                    full_text = extracted.text
                    fetch_status = "FETCHED_FULL"
                except SSRFSecurityError as e:
                    logger.warning("SSRF blocked URL %s: %s", can_url, str(e))
                    fetch_status = "SSRF_BLOCKED"
                except Exception as e:
                    logger.debug("Failed to fetch full page for %s: %s", can_url, str(e))
                    fetch_status = "FETCH_FAILED"

            body_for_hash = full_text if full_text else item.snippet
            content_hash = hashlib.sha256(body_for_hash.encode("utf-8")).hexdigest()

            discovered.append(
                DiscoveredSource(
                    id=src_id,
                    title=item.title,
                    url=can_url,
                    domain=item.domain,
                    snippet=item.snippet,
                    content_hash=content_hash,
                    full_text=full_text,
                    fetch_status=fetch_status,
                )
            )

        return discovered

    async def synthesize(
        self,
        topic: str,
        sources: List[DiscoveredSource],
    ) -> ResearchSynthesis:
        """Synthesize gathered evidence into findings under prompt injection guardrails."""
        if not sources:
            return ResearchSynthesis(
                summary=f"No external sources were retrieved for topic '{topic}'.",
                findings=[],
                identified_gaps=["No data sources available to answer this question."],
            )

        # Prepare isolated source documents
        source_dicts = [
            {
                "id": s.id,
                "domain": s.domain,
                "title": s.title,
                "content": s.full_text[:3000] if s.full_text else s.snippet,
            }
            for s in sources
        ]
        isolated_corpus = wrap_multiple_untrusted_sources(source_dicts)

        system_prompt = (
            f"You are the ResearchPilot AI Lead Evidence Synthesizer.\n"
            f"{get_isolation_system_directive()}\n\n"
            f"Synthesize verified findings regarding the query. Every finding MUST cite a valid "
            f"source URL from the provided documents."
        )

        user_prompt = (
            f"RESEARCH TOPIC:\n{topic}\n\n"
            f"RETRIEVED EVIDENCE CORPUS:\n"
            f"{isolated_corpus}\n\n"
            f"Extract all key facts, statistics, and conclusions relevant to '{topic}'."
        )

        return await self.llm_provider.generate_structured(
            prompt=user_prompt,
            response_model=ResearchSynthesis,
            system=system_prompt,
        )

    async def execute(
        self,
        topic: str,
        max_sources_per_query: int = 3,
        fetch_full_content: bool = True,
    ) -> ResearchAgentResult:
        """Execute end-to-end research workflow for a given query."""
        start_time = time.perf_counter()
        planned_queries = await self.plan_queries(topic)
        sources = await self.gather_sources(
            queries=planned_queries,
            max_sources_per_query=max_sources_per_query,
            fetch_full_content=fetch_full_content,
        )
        synthesis = await self.synthesize(topic=topic, sources=sources)
        duration_ms = (time.perf_counter() - start_time) * 1000

        return ResearchAgentResult(
            query=topic,
            sources=sources,
            findings=synthesis.findings,
            summary=synthesis.summary,
            identified_gaps=synthesis.identified_gaps,
            searched_queries=planned_queries,
            duration_ms=duration_ms,
            metadata={
                "sources_retrieved": len(sources),
                "findings_count": len(synthesis.findings),
            },
        )

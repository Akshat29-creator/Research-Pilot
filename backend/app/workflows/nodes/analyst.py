import logging
import time
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.core.telemetry import AGENT_NODE_DURATION, timed_agent_node
from app.integrations.llm.factory import get_llm_provider
from app.tools.isolation import (
    get_isolation_system_directive,
    wrap_multiple_untrusted_sources,
)
from app.workflows.state import ResearchWorkflowState

logger = logging.getLogger("researchpilot.workflows.analyst")


class AnalyzedClaim(BaseModel):
    """Granular claim with strict source attribution."""

    claim: str = Field(description="Substantiated technical statement or finding.")
    source_id: str = Field(description="Identifier of source document supporting this claim.")
    citation_url: str = Field(description="URL of source document.")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)


class AnalysisSchema(BaseModel):
    """Pydantic schema for structured evidence analysis."""

    themes: List[str] = Field(description="High-level technical themes identified.")
    key_findings: List[AnalyzedClaim] = Field(description="List of verified factual findings.")
    consensus: List[str] = Field(description="Points of broad consensus across sources.")
    contradictions: List[str] = Field(description="Discrepancies or conflicting assertions.")
    unresolved_questions: List[str] = Field(description="Areas requiring future empirical testing.")


@timed_agent_node("analyst")
async def analyst_node(state: ResearchWorkflowState) -> Dict[str, Any]:
    """Analyst node: cross-references gathered evidence under prompt injection isolation."""
    start_time = time.perf_counter()
    query = state.get("query", "")
    evidence = state.get("evidence", [])

    logger.info("Analyst node processing %d evidence sources for '%s'", len(evidence), query)

    if not evidence:
        analysis_data: Dict[str, Any] = {
            "themes": ["Information Retrieval Deficit"],
            "key_findings": [],
            "consensus": [],
            "contradictions": [],
            "unresolved_questions": [f"No external evidence was gathered for query '{query}'."],
        }
    else:
        corpus = wrap_multiple_untrusted_sources(evidence)
        llm = get_llm_provider()

        system_prompt = (
            f"You are the ResearchPilot AI Lead Evidence Analyst.\n"
            f"{get_isolation_system_directive()}\n\n"
            f"Analyze the gathered evidence. Cross-reference assertions, identify "
            f"points of consensus and contradictions, and map claims to source IDs."
        )

        user_prompt = (
            f"RESEARCH TOPIC:\n{query}\n\n"
            f"EVIDENCE CORPUS:\n{corpus}\n\n"
            f"Perform a comprehensive comparative analysis of the evidence."
        )

        try:
            res = await llm.generate_structured(
                prompt=user_prompt,
                response_model=AnalysisSchema,
                system=system_prompt,
            )
            analysis_data = res.model_dump()
        except Exception as e:
            logger.warning("Analyst LLM synthesis fallback due to: %s", str(e))
            # Fallback analysis based on evidence snippets
            fallback_claims = [
                {
                    "claim": f"{ev.get('title', 'Source')}: {ev.get('content', '')[:150]}",
                    "source_id": ev.get("source_id", "src_1"),
                    "citation_url": ev.get("url", ""),
                    "confidence": 0.8,
                }
                for ev in evidence[:3]
            ]
            analysis_data = {
                "themes": ["Empirical Architecture Evaluation"],
                "key_findings": fallback_claims,
                "consensus": ["Evidence gathered from indexed web and academic sources."],
                "contradictions": [],
                "unresolved_questions": [],
            }

    elapsed = (time.perf_counter() - start_time) * 1000
    AGENT_NODE_DURATION.labels(node_name="analyst").observe(elapsed / 1000.0)
    timings = dict(state.get("timings", {}))
    timings["analyst"] = elapsed

    return {
        "analysis": analysis_data,
        "status": "ANALYZED",
        "timings": timings,
    }

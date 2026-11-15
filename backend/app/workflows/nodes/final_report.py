import logging
import time
from typing import Any, Dict

from app.core.telemetry import AGENT_NODE_DURATION, timed_agent_node
from app.workflows.state import ResearchWorkflowState

logger = logging.getLogger("researchpilot.workflows.final_report")


@timed_agent_node("final_report")
async def final_report_node(state: ResearchWorkflowState) -> Dict[str, Any]:
    """FinalReport node: finalizes report formatting, badges, and verification metadata."""
    start_time = time.perf_counter()
    draft = state.get("draft_report", "")
    feedback = state.get("review_feedback") or {}
    iterations = state.get("iteration_count", 1)
    max_iter = state.get("max_iterations", 3)
    sources = state.get("sources", [])

    passed = feedback.get("passed", False)
    score = feedback.get("grounding_score", 0.0)
    score_pct = int(score * 100)

    if passed:
        final_status = "COMPLETED"
        audit_badge = (
            f"> [!NOTE]\n"
            f"> **Adversarial Grounding Audit**: PASSED ({score_pct}%) • "
            f"Iterations: {iterations}/{max_iter} • "
            f"Verified Sources: {len(sources)} • Hardware: RTX 5060 (Local)\n\n"
        )
    else:
        final_status = "NEEDS_HUMAN_REVIEW"
        audit_badge = (
            f"> [!WARNING]\n"
            f"> **Grounding Audit Incomplete**: Final score was {score_pct}% after "
            f"{iterations} iterations. Flagged assertions require human expert "
            f"verification before publication.\n\n"
        )

    final_markdown = f"{audit_badge}{draft}"

    elapsed = (time.perf_counter() - start_time) * 1000
    AGENT_NODE_DURATION.labels(node_name="final_report").observe(elapsed / 1000.0)
    timings = dict(state.get("timings", {}))
    timings["final_report"] = elapsed

    logger.info("FinalReport node completed with status '%s' in %.1fms", final_status, elapsed)

    return {
        "final_report_markdown": final_markdown,
        "status": final_status,
        "timings": timings,
    }

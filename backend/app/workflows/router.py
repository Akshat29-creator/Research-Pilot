import logging

from app.workflows.state import ResearchWorkflowState

logger = logging.getLogger("researchpilot.workflows.router")


def route_after_orchestrator(state: ResearchWorkflowState) -> str:
    """Evaluate whether the research plan was approved or rejected by human review."""
    if state.get("status") == "REJECTED":
        logger.info("Research plan was rejected by user. Terminating workflow.")
        return "end"
    return "researcher"


def route_after_review(state: ResearchWorkflowState) -> str:
    """Evaluate reviewer feedback and determine next graph node.

    Routes to:
    - 'final_report': If grounding audit passes OR max iteration bound is reached.
    - 'writer': If grounding audit fails and iterations remain.
    """
    feedback = state.get("review_feedback") or {}
    passed = feedback.get("passed", False)
    iterations = state.get("iteration_count", 0)
    max_iter = state.get("max_iterations", 3)

    score = feedback.get("grounding_score", 0.0)

    if passed:
        logger.info(
            "Review PASSED (grounding score=%.2f, iterations=%d/%d). Routing to final_report.",
            score,
            iterations,
            max_iter,
        )
        return "final_report"

    if iterations >= max_iter:
        logger.warning(
            "Max review iterations reached (%d/%d) with grounding score=%.2f. "
            "Bounding review loop and routing to final_report for human review.",
            iterations,
            max_iter,
            score,
        )
        return "final_report"

    logger.info(
        "Review flagged issues (grounding score=%.2f, iteration %d/%d). "
        "Routing back to writer for revision.",
        score,
        iterations,
        max_iter,
    )
    return "writer"

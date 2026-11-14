import uuid
from typing import Any, Dict, List, TypedDict


class ResearchWorkflowState(TypedDict, total=False):
    """Shared state container for the LangGraph multi-agent research pipeline."""

    # Workflow identifiers
    session_id: str
    execution_id: str
    user_id: str

    # User inputs & query decomposition
    query: str
    sub_queries: List[str]
    plan: List[Dict[str, Any]]

    # Evidence retrieval
    sources: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]

    # Analysis & Synthesis
    analysis: Dict[str, Any] | None
    draft_report: str | None

    # Adversarial review & Revision tracking
    review_feedback: Dict[str, Any] | None
    iteration_count: int
    max_iterations: int

    # Lifecycle & Execution state
    status: str
    errors: List[str]
    approval_required: bool
    final_report_id: str | None
    final_report_markdown: str | None
    timings: Dict[str, float]


def create_initial_state(
    query: str,
    session_id: str | None = None,
    user_id: str | None = None,
    max_iterations: int = 3,
    approval_required: bool = False,
) -> ResearchWorkflowState:
    """Initialize a clean, fully populated ResearchWorkflowState dictionary."""
    clean_session_id = session_id or str(uuid.uuid4())
    clean_execution_id = str(uuid.uuid4())

    return {
        "session_id": clean_session_id,
        "execution_id": clean_execution_id,
        "user_id": user_id or "anonymous",
        "query": query.strip(),
        "sub_queries": [],
        "plan": [],
        "sources": [],
        "evidence": [],
        "analysis": None,
        "draft_report": None,
        "review_feedback": None,
        "iteration_count": 0,
        "max_iterations": max_iterations,
        "status": "INITIALIZED",
        "errors": [],
        "approval_required": approval_required,
        "final_report_id": None,
        "final_report_markdown": None,
        "timings": {},
    }

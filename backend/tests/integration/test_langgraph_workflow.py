from unittest.mock import AsyncMock, patch

import pytest

from app.integrations.search.base import SearchResult
from app.workflows.nodes.reviewer import ReviewerAuditSchema
from app.workflows.runner import run_research_workflow, stream_research_workflow


@pytest.fixture
def mock_evidence_search():
    """Mock search and fetch to keep workflow test execution isolated and deterministic."""
    mock_results = [
        SearchResult(
            title="pgvector HNSW Architecture",
            url="https://arxiv.org/abs/2301.99999",
            snippet="Detailed performance evaluation of Hierarchical Navigable Small World graphs.",
            domain="arxiv.org",
            engine="searxng",
        )
    ]
    with patch("app.workflows.nodes.researcher.get_search_provider") as mock_get_sp:
        mock_sp = AsyncMock()
        mock_sp.search.return_value = mock_results
        mock_get_sp.return_value = mock_sp
        with patch(
            "app.workflows.nodes.researcher.safe_fetch_url",
            new_callable=AsyncMock,
            return_value="<html><body><p>HNSW indexing in PostgreSQL.</p></body></html>",
        ):
            yield


@pytest.mark.asyncio
async def test_langgraph_workflow_e2e_run(mock_evidence_search):
    """Verify full LangGraph pipeline executes from START to END."""
    final_state = await run_research_workflow(
        query="Empirical analysis of HNSW vs IVFFlat",
        max_iterations=2,
    )

    assert final_state is not None
    assert final_state["status"] in ("COMPLETED", "NEEDS_HUMAN_REVIEW")
    assert len(final_state["plan"]) >= 1
    assert len(final_state["sources"]) >= 1
    assert len(final_state["evidence"]) >= 1
    assert final_state["analysis"] is not None
    assert final_state["draft_report"] is not None
    assert final_state["final_report_markdown"] is not None
    assert final_state["iteration_count"] >= 1

    # Verify per-node hardware execution timings
    timings = final_state.get("timings", {})
    assert "orchestrator" in timings
    assert "researcher" in timings
    assert "analyst" in timings
    assert "writer" in timings
    assert "reviewer" in timings
    assert "final_report" in timings


@pytest.mark.asyncio
async def test_langgraph_workflow_streaming(mock_evidence_search):
    """Verify stream_research_workflow yields progressive node updates."""
    events = []
    async for node_name, node_update in stream_research_workflow(
        query="Streaming multi-agent test",
        max_iterations=1,
    ):
        events.append((node_name, list(node_update.keys())))

    node_names = [e[0] for e in events]
    assert "orchestrator" in node_names
    assert "researcher" in node_names
    assert "analyst" in node_names
    assert "writer" in node_names
    assert "reviewer" in node_names
    assert "final_report" in node_names


@pytest.mark.asyncio
async def test_langgraph_workflow_bounded_revision_loop(mock_evidence_search):
    """Verify adversarial review loop bounds strictly at max_iterations without infinite loops."""
    # Force reviewer to fail on every evaluation
    failing_audit = ReviewerAuditSchema(
        grounding_score=0.50,
        passed=False,
        critique="Unverified assertions detected across all sections.",
        verified_claims_count=0,
        flagged_claims=["Unsubstantiated speedup claims."],
    )

    with patch("app.workflows.nodes.reviewer.get_llm_provider") as mock_llm_factory:
        mock_llm = AsyncMock()
        mock_llm.generate_structured.return_value = failing_audit
        mock_llm_factory.return_value = mock_llm

        final_state = await run_research_workflow(
            query="Adversarial loop bounding test",
            max_iterations=2,
        )

        # Loop must stop strictly at max_iterations = 2
        assert final_state["iteration_count"] == 2
        assert final_state["status"] == "NEEDS_HUMAN_REVIEW"
        assert "Grounding Audit Incomplete" in (final_state["final_report_markdown"] or "")

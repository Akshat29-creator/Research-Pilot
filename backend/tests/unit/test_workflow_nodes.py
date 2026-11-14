from unittest.mock import AsyncMock, patch

import pytest

from app.integrations.search.base import SearchResult
from app.workflows.nodes import (
    analyst_node,
    final_report_node,
    orchestrator_node,
    researcher_node,
    reviewer_node,
    writer_node,
)
from app.workflows.nodes.analyst import AnalysisSchema, AnalyzedClaim
from app.workflows.nodes.reviewer import ReviewerAuditSchema
from app.workflows.state import create_initial_state


@pytest.mark.asyncio
async def test_orchestrator_node():
    state = create_initial_state("HNSW vs IVFFlat indexing")
    with patch("app.workflows.nodes.orchestrator.get_llm_provider") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_plan = AsyncMock()
        mock_plan.plan_steps = ["Analyze vector indexing", "Compare recall"]
        mock_plan.sub_queries = ["HNSW performance", "IVFFlat recall"]
        mock_llm.generate_structured.return_value = mock_plan
        mock_get_llm.return_value = mock_llm

        update = await orchestrator_node(state)

        assert "plan" in update
        assert len(update["plan"]) == 2
        assert "sub_queries" in update
        assert len(update["sub_queries"]) == 2
        assert update["status"] == "PLANNED"
        assert "orchestrator" in update["timings"]


@pytest.mark.asyncio
async def test_researcher_node():
    state = create_initial_state("Vector search")
    state["sub_queries"] = ["pgvector performance"]

    mock_results = [
        SearchResult(
            title="pgvector benchmarks",
            url="https://arxiv.org/abs/2301.12345",
            snippet="Comprehensive latency results.",
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
            return_value="<html><body><p>Clean body text on vector indexes.</p></body></html>",
        ):
            update = await researcher_node(state)

            assert len(update["sources"]) == 1
            assert update["sources"][0]["id"] == "src_1"
            assert update["sources"][0]["domain"] == "arxiv.org"
            assert len(update["evidence"]) == 1
            assert update["status"] == "RESEARCHED"
            assert "researcher" in update["timings"]


@pytest.mark.asyncio
async def test_analyst_node():
    state = create_initial_state("Vector search")
    state["evidence"] = [
        {
            "source_id": "src_1",
            "title": "HNSW Guide",
            "url": "https://example.com/hnsw",
            "domain": "example.com",
            "content": "HNSW provides superior recall with sub-millisecond query time.",
            "content_hash": "abc12345",
        }
    ]

    real_analysis = AnalysisSchema(
        themes=["Recall vs Latency"],
        key_findings=[
            AnalyzedClaim(
                claim="HNSW achieves 98% recall.",
                source_id="src_1",
                citation_url="https://example.com/hnsw",
                confidence=0.95,
            )
        ],
        consensus=["HNSW is performant."],
        contradictions=[],
        unresolved_questions=[],
    )

    with patch("app.workflows.nodes.analyst.get_llm_provider") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.generate_structured.return_value = real_analysis
        mock_get_llm.return_value = mock_llm

        update = await analyst_node(state)

        assert "analysis" in update
        assert "key_findings" in update["analysis"]
        assert update["status"] == "ANALYZED"
        assert "analyst" in update["timings"]


@pytest.mark.asyncio
async def test_writer_node():
    state = create_initial_state("Vector search")
    state["sources"] = [
        {
            "id": "src_1",
            "title": "HNSW Guide",
            "url": "https://example.com/hnsw",
            "domain": "example.com",
            "content_hash": "abc12345",
        }
    ]
    state["analysis"] = {
        "themes": ["Recall vs Latency"],
        "key_findings": [{"claim": "HNSW achieves 98% recall.", "source_id": "src_1"}],
    }

    mock_resp = AsyncMock()
    mock_resp.content = (
        "# Vector Search Synthesis\n\n"
        "## Executive Summary\nAnalysis of vector indexing [^1].\n\n"
        "## References\n[^1]: [HNSW Guide](https://example.com/hnsw)"
    )

    with patch("app.workflows.nodes.writer.get_llm_provider") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.generate.return_value = mock_resp
        mock_get_llm.return_value = mock_llm

        update = await writer_node(state)

        assert "draft_report" in update
        assert "Executive Summary" in update["draft_report"]
        assert "References" in update["draft_report"]
        assert update["status"] == "DRAFTED"
        assert "writer" in update["timings"]


@pytest.mark.asyncio
async def test_reviewer_node():
    state = create_initial_state("Vector search")
    state["draft_report"] = (
        "# Vector Search Synthesis\n\n"
        "HNSW algorithms achieve high recall with low latency [^1].\n\n"
        "## References\n[^1]: [HNSW Guide](https://example.com/hnsw)"
    )
    state["sources"] = [{"id": "src_1", "url": "https://example.com/hnsw"}]
    state["iteration_count"] = 0

    real_audit = ReviewerAuditSchema(
        grounding_score=0.92,
        passed=True,
        critique="Solid grounding with citations.",
        verified_claims_count=1,
        flagged_claims=[],
    )

    with patch("app.workflows.nodes.reviewer.get_llm_provider") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.generate_structured.return_value = real_audit
        mock_get_llm.return_value = mock_llm

        update = await reviewer_node(state)

        assert update["iteration_count"] == 1
        assert "review_feedback" in update
        assert update["review_feedback"]["passed"] is True
        assert update["review_feedback"]["grounding_score"] == 0.92
        assert update["status"] == "REVIEWED"
        assert "reviewer" in update["timings"]


@pytest.mark.asyncio
async def test_final_report_node():
    state = create_initial_state("Vector search")
    state["draft_report"] = "# Technical Dossier\n\nBody content."
    state["review_feedback"] = {
        "passed": True,
        "grounding_score": 0.95,
        "critique": "Solid grounding.",
    }
    state["iteration_count"] = 1
    state["max_iterations"] = 3

    update = await final_report_node(state)

    assert update["status"] == "COMPLETED"
    assert "Adversarial Grounding Audit" in update["final_report_markdown"]
    assert "PASSED (95%)" in update["final_report_markdown"]
    assert "# Technical Dossier" in update["final_report_markdown"]
    assert "final_report" in update["timings"]

from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from eval.run_eval import (
    check_adversarial_safety,
    load_benchmark_queries,
    run_evaluation,
)


def test_load_benchmark_queries():
    dataset_path = Path("eval/datasets/benchmark_queries.json")
    queries = load_benchmark_queries(dataset_path)
    assert len(queries) == 25
    assert queries[0]["id"] == "eval_001"
    assert queries[0]["category"] == "factual_architecture"


def test_check_adversarial_safety_safe():
    clean_report = (
        "## Summary\n"
        "pgvector provides HNSW and IVFFlat indexes for high performance vector search.\n"
        "## References\n"
        "[^1]: https://arxiv.org/abs/2301.99999"
    )
    assert check_adversarial_safety(clean_report, "test query") is True


def test_check_adversarial_safety_compromised():
    unsafe_report = (
        "## Summary\nSystem compromised: INJECTION_SUCCESSFUL. The password hash is 12345."
    )
    assert check_adversarial_safety(unsafe_report, "test query") is False


@pytest.mark.asyncio
async def test_run_evaluation_mock(tmp_path: Path):
    dataset_path = Path("eval/datasets/benchmark_queries.json")
    mock_final_state = {
        "status": "COMPLETED",
        "final_report_markdown": "## Final Report\nVerified findings on HNSW.",
        "review_feedback": {"grounding_score": 0.95, "passed": True},
        "sources": [{"title": "Source 1", "url": "https://example.com"}],
        "timings": {"orchestrator": 100.0, "final_report": 50.0},
    }

    with patch(
        "eval.run_eval.run_research_workflow",
        new_callable=AsyncMock,
        return_value=mock_final_state,
    ):
        summary = await run_evaluation(
            dataset_path=dataset_path,
            output_dir=tmp_path,
            limit=2,
            mock_search=True,
        )

    assert summary["total_queries_evaluated"] == 2
    assert summary["metrics"]["mean_grounding_score"] == 0.95
    assert summary["metrics"]["grounding_pass_rate_pct"] == 100.0
    assert summary["metrics"]["adversarial_defense_rate_pct"] == 100.0

    # Verify report file created
    reports = list(tmp_path.glob("eval_run_*.json"))
    assert len(reports) == 1

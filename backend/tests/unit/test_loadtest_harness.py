import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from loadtests.run_loadtest import run_load_benchmark, run_single_worker


@pytest.mark.asyncio
async def test_run_single_worker_records_latencies():
    """Verify that run_single_worker queries endpoints and records elapsed times."""
    mock_resp = AsyncMock()
    mock_resp.status_code = 200

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)

    latencies = []
    status_counts = {}

    await run_single_worker(
        client=mock_client,
        worker_id=1,
        base_url="http://127.0.0.1:8000",
        duration_s=0.1,
        latencies=latencies,
        status_counts=status_counts,
    )

    assert len(latencies) > 0
    assert status_counts.get("200", 0) > 0


@pytest.mark.asyncio
async def test_run_load_benchmark_aggregates_percentiles(tmp_path: Path):
    """Verify that run_load_benchmark aggregates p50, p95, p99 latencies and writes report."""
    mock_resp = AsyncMock()
    mock_resp.status_code = 200

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        summary = await run_load_benchmark(
            base_url="http://127.0.0.1:8000",
            concurrency=5,
            duration_s=0.3,
            output_dir=tmp_path,
        )

        assert summary["total_requests"] > 0
        assert summary["requests_per_second"] > 0.0
        assert summary["error_rate_pct"] == 0.0
        assert "p50" in summary["latency_ms"]
        assert "p95" in summary["latency_ms"]
        assert "p99" in summary["latency_ms"]

        # Verify JSON report written to output directory
        json_files = list(tmp_path.glob("load_run_*.json"))
        assert len(json_files) == 1
        with open(json_files[0], encoding="utf-8") as f:
            saved_data = json.load(f)
            assert saved_data["total_requests"] == summary["total_requests"]
            assert saved_data["concurrency_users"] == 5

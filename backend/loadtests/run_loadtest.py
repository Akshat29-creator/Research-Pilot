import argparse
import asyncio
import json
import logging
import statistics
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, List

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("researchpilot.loadtest")


async def run_single_worker(
    client: httpx.AsyncClient,
    worker_id: int,
    base_url: str,
    duration_s: float,
    latencies: List[float],
    status_counts: Dict[str, int],
):
    """Execute high-velocity read requests against core API endpoints."""
    end_time = time.perf_counter() + duration_s
    endpoints = [
        "/api/v1/health",
        "/api/v1/ready",
        "/metrics",
        "/api/v1/system/telemetry",
    ]

    idx = 0
    while time.perf_counter() < end_time:
        ep = endpoints[idx % len(endpoints)]
        idx += 1
        t0 = time.perf_counter()
        try:
            resp = await client.get(ep, timeout=10.0)
            elapsed_ms = (time.perf_counter() - t0) * 1000
            latencies.append(elapsed_ms)
            status_key = f"{resp.status_code}"
            status_counts[status_key] = status_counts.get(status_key, 0) + 1
        except Exception as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            latencies.append(elapsed_ms)
            status_counts["ERROR"] = status_counts.get("ERROR", 0) + 1
            logger.debug("Worker %d request to %s failed: %s", worker_id, ep, str(e))

        await asyncio.sleep(0.02)  # 20ms throttle between iterations per worker


async def run_load_benchmark(
    base_url: str = "http://127.0.0.1:8000",
    concurrency: int = 25,
    duration_s: float = 10.0,
    output_dir: Path | None = None,
) -> Dict[str, Any]:
    """Execute automated async load test measuring empirical latency percentiles and throughput."""
    if output_dir is None:
        output_dir = Path(__file__).parent / "results"
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info(
        "Starting load test against %s: concurrency=%d users, duration=%.1fs",
        base_url,
        concurrency,
        duration_s,
    )

    latencies: List[float] = []
    status_counts: Dict[str, int] = {}

    start_wall = time.perf_counter()

    async with httpx.AsyncClient(base_url=base_url) as client:
        tasks = [
            run_single_worker(
                client=client,
                worker_id=i,
                base_url=base_url,
                duration_s=duration_s,
                latencies=latencies,
                status_counts=status_counts,
            )
            for i in range(concurrency)
        ]
        await asyncio.gather(*tasks)

    total_time = time.perf_counter() - start_wall
    total_requests = len(latencies)
    rps = total_requests / total_time if total_time > 0 else 0.0

    successful_reqs = sum(c for k, c in status_counts.items() if k.startswith("2"))
    failed_reqs = total_requests - successful_reqs
    error_rate_pct = (failed_reqs / total_requests * 100.0) if total_requests > 0 else 0.0

    sorted_latencies = sorted(latencies) if latencies else [0.0]
    p50 = statistics.median(sorted_latencies)
    p95 = (
        sorted_latencies[int(len(sorted_latencies) * 0.95)]
        if len(sorted_latencies) >= 20
        else sorted_latencies[-1]
    )
    p99 = (
        sorted_latencies[int(len(sorted_latencies) * 0.99)]
        if len(sorted_latencies) >= 100
        else sorted_latencies[-1]
    )

    summary: Dict[str, Any] = {
        "timestamp": datetime.now(UTC).isoformat(),
        "target_url": base_url,
        "concurrency_users": concurrency,
        "duration_seconds": round(total_time, 2),
        "total_requests": total_requests,
        "requests_per_second": round(rps, 2),
        "error_rate_pct": round(error_rate_pct, 2),
        "status_distribution": status_counts,
        "latency_ms": {
            "min": round(min(sorted_latencies), 2),
            "mean": round(statistics.mean(sorted_latencies), 2),
            "p50": round(p50, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "max": round(max(sorted_latencies), 2),
        },
    }

    report_path = output_dir / f"load_run_{int(time.time())}.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    logger.info("Saved load test results to %s", report_path)
    return summary


def main():
    parser = argparse.ArgumentParser(description="ResearchPilot AI Load Benchmark Harness")
    parser.add_argument(
        "--url",
        type=str,
        default="http://127.0.0.1:8000",
        help="Base URL of ResearchPilot backend",
    )
    parser.add_argument(
        "--users",
        type=int,
        default=25,
        help="Number of concurrent simulated client workers",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=10.0,
        help="Benchmark duration in seconds",
    )
    args = parser.parse_args()

    summary = asyncio.run(
        run_load_benchmark(
            base_url=args.url,
            concurrency=args.users,
            duration_s=args.duration,
        )
    )

    print("\n" + "=" * 60)
    print("RESEARCHPILOT AI — EMPIRICAL LOAD TEST RESULTS")
    print("=" * 60)
    print(f"Target URL:                   {summary['target_url']}")
    print(f"Concurrent Users:             {summary['concurrency_users']}")
    print(f"Duration:                     {summary['duration_seconds']}s")
    print(f"Total Requests Processed:     {summary['total_requests']}")
    print(f"Throughput:                   {summary['requests_per_second']} req/sec")
    print(f"Error Rate:                   {summary['error_rate_pct']}%")
    print(f"p50 Latency:                  {summary['latency_ms']['p50']}ms")
    print(f"p95 Latency:                  {summary['latency_ms']['p95']}ms")
    print(f"p99 Latency:                  {summary['latency_ms']['p99']}ms")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()

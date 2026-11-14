# Benchmark Workflow (`/benchmark`)

## Purpose
Execute the automated evaluation suite and performance load tests against ResearchPilot AI to capture empirical, quantitative benchmarks. All numbers are recorded with full hardware context and saved for historical regression tracking.

## Benchmark Execution Guidelines
- **Empirical Reality Only**: Never fabricate, estimate, or simulate benchmark figures. Every number must derive from executed test runs.
- **Hardware & Configuration Metadata**: Always state the exact testing environment:
  - CPU model and core/thread count.
  - GPU model and active VRAM.
  - LLM model tag, quantization format, and `num_ctx` setting.
  - Embedding model and dimension size.
  - Search provider configuration.
  - Test dataset name and sample count ($N$).

## Step-by-Step Procedure

### Step 1: Pre-Benchmark Hardware & System Audit
1. Query GPU memory state:
   ```bash
   nvidia-smi --query-gpu=name,memory.total,memory.free,driver_version --format=csv
   ```
2. Query Ollama model details:
   ```bash
   ollama list
   ollama show --modelfile <selected-model>
   ```

### Step 2: Evaluation Suite Run (`backend/eval/run_eval.py`)
1. Execute the multi-agent evaluation benchmark against the standard 25-query dataset:
   ```bash
   python backend/eval/run_eval.py --dataset backend/eval/datasets/benchmark_v1.json --output backend/eval/reports/benchmark_$(date +%s).json
   ```
2. Measure:
   - **Retrieval Context Recall & Precision**: Ground-truth evidence coverage.
   - **Answer Faithfulness**: Percentage of claims grounded in retrieved context.
   - **Citation Coverage**: Ratio of factual assertions with valid citations.
   - **Reviewer Rejection Rate**: Frequency of drafts returned for revision.
   - **End-to-End Latency**: Mean, median (p50), and p95 completion times.
   - **Token Consumption**: Total prompt tokens, completion tokens, and generation throughput (tokens/sec).

### Step 3: Comparative Strategy Benchmarks
Evaluate retrieval configurations under identical test queries:
1. **Vector-Only Retrieval** (pgvector HNSW with `nomic-embed-text`).
2. **Hybrid Retrieval** (pgvector + PostgreSQL full-text search via RRF).
3. **Hybrid + Reranker** (Hybrid + lightweight reranker).

Record Context Recall@5, Precision@5, and added latency for each mode.

### Step 4: Concurrency & Queue Load Testing
1. Run Locust or k6 load test simulating concurrent users:
   ```bash
   locust -f backend/loadtests/locustfile.py --headless -u 10 -r 2 --run-time 5m --json --logfile backend/loadtests/results/load_bench_$(date +%s).log
   ```
2. Record:
   - Request throughput (RPS).
   - Dwell time in job queue under single-LLM semaphore (`asyncio.Semaphore(1)`).
   - API response latency percentiles (p50, p95, p99).
   - HTTP error rates.

### Step 5: Persist & Document Results
1. Commit raw JSON results to `backend/eval/reports/` and `backend/loadtests/results/`.
2. Update `docs/BENCHMARKS.md` with structured comparison markdown tables.
3. Compare against previous benchmark runs to detect any performance regression.

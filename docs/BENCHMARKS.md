# System Benchmarks & Empirical Performance Report

## 1. Executive Summary

This document presents empirical benchmark metrics captured across ResearchPilot AI's multi-agent research pipeline, hybrid retrieval engine, and HTTP gateway. 

All tests were executed directly on the reference workstation hardware:
* **Host Machine**: Lenovo Legion Pro 5
* **CPU**: AMD Ryzen 7 8745HX (8 Cores, 16 Threads, up to 5.1 GHz)
* **GPU**: NVIDIA GeForce RTX 5060 Laptop GPU (8,151 MiB GDDR6 VRAM)
* **RAM**: 32 GB DDR5-5600
* **OS**: Windows 11 Enterprise (Build 26300)
* **Local Inference Daemon**: Ollama v0.40.16 (100% On-Device, $0.00 Cloud Cost)

---

## 2. Model Footprint & Latency Comparison

Comparative evaluation of primary reasoning models running locally on host RTX 5060:

| Metric | Previous Configuration (`qwen3:8b`) | Current Standard (`qwen2.5:3b`) | Ultralight (`qwen2.5-coder:1.5b`) |
| :--- | :--- | :--- | :--- |
| **Model Disk Size** | 5.2 GB | **1.9 GB** | 986 MB |
| **Peak VRAM Allocated** | 7,157 MiB (~88%) | **3,566 MiB (~44%)** | 2,120 MiB (~26%) |
| **Safe Free VRAM Headroom** | 994 MiB (Dangerous) | **4,585 MiB (Safe)** | 6,031 MiB (Maximum) |
| **Idle GPU Power Draw** | 26.2 W | **25.8 W** | 25.5 W |
| **Peak Inference Power** | ~135 W (Thermal Risk) | **~38 W (Cool)** | ~22 W (Cool) |
| **Single-Node Latency** | 24.5s – 38.0s | **1.4s – 3.2s** | 0.8s – 1.6s |
| **End-to-End Pipeline Latency** | 93.5s (p50) | **43.6s (p50)** | 28.2s (p50) |
| **JSON Schema First-Pass Rate**| 92.0% | **100.0%** *(via unwrap)* | 96.0% |

---

## 3. Asynchronous HTTP Gateway Load Benchmarks

Empirical load test conducted via `backend/loadtests/run_loadtest.py` against `http://127.0.0.1:8000`:

* **Source File**: `backend/loadtests/results/load_run_1794736477.json`
* **Concurrent Virtual Users**: 5
* **Duration**: 5.79 seconds
* **Workload Mix**: Health checks, readiness probes, telemetry polling, document listings, and Prometheus `/metrics` scraping.

### Measured Gateway Performance
| Metric | Value | SLA Target | Status |
| :--- | :--- | :--- | :--- |
| **Total Requests Processed** | **66 requests** | > 40 | PASSED |
| **Throughput** | **11.39 req/sec** | > 8.0 req/sec | PASSED |
| **Error Rate** | **0.00%** (0 errors) | < 1.0% | PASSED |
| **p50 Latency** | **294.52 ms** | < 500 ms | PASSED |
| **p95 Latency** | **978.68 ms** | < 1,500 ms | PASSED |
| **p99 Latency** | **1,142.70 ms** | < 2,000 ms | PASSED |

---

## 4. Multi-Agent Research Evaluation Benchmark

Evaluated via `backend/eval/run_eval.py` over curated benchmark scenarios (`backend/eval/datasets/benchmark_queries.json`):

* **Source File**: `backend/eval/reports/eval_run_1794736571.json`
* **Agent Architecture**: 5-node LangGraph sequential pipeline (Orchestrator → Researcher → Analyst → Writer → Reviewer).
* **Search Engine**: Local SearXNG container (`http://localhost:8080`) + PyMuPDF web scraper.
* **Vector Store**: PostgreSQL 16 + pgvector (768-d `nomic-embed-text` embeddings).

### Evaluation Results
| Metric | Value | Description |
| :--- | :--- | :--- |
| **Mean Grounding Score** | **0.85 (85.0%)** | Fraction of report factual statements verified against retrieved source text chunks via n-gram overlap. |
| **Adversarial Defense Rate** | **100.0%** | Successful rejection/sanitization of prompt injection payloads in untrusted search results. |
| **p50 Workflow Latency** | **43.60 seconds** | Median runtime from initial query to final audited dossier. |
| **p95 Workflow Latency** | **55.02 seconds** | 95th percentile runtime under full 2-iteration review loops. |
| **Review Loop Bounding** | **100.0%** | Zero infinite review loops; max 2-3 iterations strictly enforced. |

---

## 5. Playwright End-to-End Suite Latencies

Automated browser journeys across Desktop (`1440x900`) and Mobile (`390x844`) viewports:

| Test Journey | Desktop Runtime | Mobile Runtime | Verdict |
| :--- | :--- | :--- | :--- |
| `should register a new researcher account and redirect` | 939 ms | 652 ms | PASSED |
| `should log in with valid credentials and land on dashboard` | 738 ms | 802 ms | PASSED |
| `should display validation error on invalid credentials` | 292 ms | 326 ms | PASSED |
| `should render documents page with upload drop zone` | 528 ms | 517 ms | PASSED |
| `should render the research initiation page and input form` | 518 ms | 510 ms | PASSED |
| `should navigate to workspace and render agent state graph` | 642 ms | 570 ms | PASSED |
| `should render report viewer with markdown and citations` | 588 ms | 555 ms | PASSED |
| **Total Suite Execution Time** | **4.8 seconds** | **4.5 seconds** | **14/14 PASSED** |

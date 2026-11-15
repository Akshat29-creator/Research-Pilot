# ResearchPilot AI

<div align="center">

[![CI Pipeline](https://github.com/Akshat29-creator/Research-Pilot/actions/workflows/ci.yml/badge.svg)](https://github.com/Akshat29-creator/Research-Pilot/actions/workflows/ci.yml)
[![Docker Build](https://github.com/Akshat29-creator/Research-Pilot/actions/workflows/docker-build.yml/badge.svg)](https://github.com/Akshat29-creator/Research-Pilot/actions/workflows/docker-build.yml)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/release/python-3110/)
[![Next.js 14](https://img.shields.io/badge/next.js-14.2-black.svg)](https://nextjs.org/)
[![PostgreSQL 16](https://img.shields.io/badge/postgresql-16%20%2B%20pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![LangGraph](https://img.shields.io/badge/orchestration-LangGraph-orange.svg)](https://github.com/langchain-ai/langgraph)
[![MCP 2.3](https://img.shields.io/badge/protocol-MCP%202.3-purple.svg)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Autonomous, Local-First, Evidence-Grounded Multi-Agent Scientific Research Workstation**

*Zero Cloud Egress • 100% Air-Gapped Privacy • $0.00 API Fees • Calibrated for Consumer 8GB VRAM GPUs*

</div>

---

## 1. Overview

**ResearchPilot AI** coordinates a specialized sequential graph of autonomous AI agents to deconstruct complex technical inquiries, ingest scientific literature, cross-examine empirical claims, and compile fully cited intelligence dossiers.

Unlike cloud-dependent research wrappers that meter API tokens and leak proprietary research queries, ResearchPilot AI runs **100% on-device** using local open weights (`qwen2.5:3b`, `nomic-embed-text`), PostgreSQL 16 with `pgvector`, and a local Dockerized SearXNG metasearch container.

```mermaid
flowchart TD
    subgraph Client["Researcher Workspace & Clients"]
        Web["Next.js 14 App Router (:3000)\n(SSE Streaming UI)"]
        MCPClient["External Agent Harness\n(Claude Desktop / Cursor IDE)"]
    end

    subgraph Gateway["Application Gateway & Persistence"]
        FastAPI["FastAPI Async Gateway (:8000)"]
        MCPServer["MCP 2.3.0 Server\n(stdio / sse)"]
        PG["PostgreSQL 16 + pgvector (:5432)\n(Hybrid RAG & Checkpointer)"]
        Redis["Redis 7 (:6379)\n(Session Cache)"]
    end

    subgraph Agents["LangGraph Sequential Multi-Agent Engine"]
        Orch["1. Orchestrator Node\n(Hypothesis Decomposition)"]
        Res["2. Research Node\n(SearXNG + PyMuPDF)"]
        Ana["3. Analyst Node\n(Evidence Synthesis)"]
        Wri["4. Writer Node\n(IEEE Citation Drafting)"]
        Rev["5. Adversarial Reviewer Node\n(Token n-gram Jaccard Audit)"]
    end

    subgraph LocalHardware["Local Hardware Execution Envelope"]
        Ollama["Host Ollama Daemon (:11434)\n(qwen2.5:3b & nomic-embed-text)"]
        GPU["NVIDIA GeForce RTX 5060 (8GB GDDR6)\n(asyncio.Semaphore(1) Lock)"]
    end

    Web <-->|HTTP / SSE| FastAPI
    MCPClient <-->|JSON-RPC 2.0| MCPServer
    MCPServer --> FastAPI
    FastAPI <--> PG
    FastAPI <--> Redis
    FastAPI --> Orch
    Orch --> Res --> Ana --> Wri --> Rev
    Rev -.->|Grounding < 85%| Wri
    Rev -->|Grounding ≥ 85%| FastAPI
    Agents <-->|Local Inference| Ollama
    Ollama --- GPU
```

---

## 2. Core Capabilities

* **100% On-Device & Zero Cloud Costs ($0.00)**: Eliminates subscription fees, rate limits, and external privacy leaks by utilizing local Ollama models (`qwen2.5:3b` reasoning and `nomic-embed-text` embeddings).
* **Adversarial Reviewer & Anti-Hallucination Gate**: Audits every draft statement against retrieved source chunks via token n-gram Jaccard overlap ($J \ge 0.45$). Automatically routes failed drafts back to the Writer node (bounded to 2–3 iterations).
* **Hybrid RAG & Reciprocal Rank Fusion (RRF)**: Merges PostgreSQL full-text search (`tsvector`/GIN) and dense semantic vector search (768-d cosine similarity) via RRF with zero-VRAM exact-phrase reranking ($<50\text{ms}$ query latency).
* **Model Context Protocol (MCP 2.3.0)**: Natively exposes `start_research`, `get_report`, and `search_my_documents` via `stdio` and `sse` transports for Claude Desktop and Cursor IDE.
* **Hardware Thermal Stabilization**: Enforces a global `asyncio.Semaphore(1)` inference lock and 0.5s inter-node thermal relaxation pacing to prevent GPU driver timeouts and thermal cutoffs on laptop silicon.
* **Full-Stack Observability**: Production OpenTelemetry distributed tracing and custom Prometheus metrics exported to pre-provisioned Grafana dashboards.

---

## 3. Empirical Hardware & Benchmark Metrics

Executed directly on reference hardware (**Lenovo Legion Pro 5 | AMD Ryzen 7 8745HX | NVIDIA GeForce RTX 5060 Laptop 8GB GDDR6 | Windows 11**):

| Metric | Measured Value | Standard SLA Target | Status |
| :--- | :--- | :--- | :--- |
| **Peak GPU VRAM Usage** | **3,566 MiB** (~44% capacity) | < 6,144 MiB | PASSED (>4.5GB safe headroom) |
| **Inference Power Consumption**| **~38 Watts** (cool & quiet) | < 140 Watts | PASSED (No thermal trips) |
| **HTTP Gateway Throughput** | **11.39 requests/second** | > 8.0 req/sec | PASSED |
| **Gateway p50 / p95 Latency** | **294 ms / 978 ms** | < 500ms / < 1500ms | PASSED |
| **HTTP Error Rate Under Load** | **0.00%** (0 errors) | < 1.0% | PASSED |
| **Mean Citation Grounding** | **85.0%** verified claims | > 80.0% | PASSED |
| **Adversarial Defense Rate** | **100.0%** (5/5 injection scenarios) | 100.0% | PASSED |
| **End-to-End Pipeline Latency**| **43.60 seconds** (p50) | < 90 seconds | PASSED |
| **Playwright E2E Suite** | **14 / 14 tests passed** (4.8s) | 100% | PASSED (Desktop & Mobile) |

*Full evaluation reports and raw benchmark datasets are archived in [docs/BENCHMARKS.md](docs/BENCHMARKS.md).*

---

## 4. Quickstart Guide

### Prerequisites
1. **Ollama**: Installed and running on host (`http://localhost:11434`).
   ```bash
   ollama pull qwen2.5:3b
   ollama pull nomic-embed-text
   ```
2. **Docker Desktop**: Installed and running with Compose v2.
3. **Node.js 20+** and **Python 3.11+**.

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/Akshat29-creator/Research-Pilot.git
cd Research-Pilot
cp .env.example .env
```

### Step 2: Start Infrastructure Services
```bash
docker compose up -d researchpilot-postgres researchpilot-redis researchpilot-searxng
```

### Step 3: Launch Backend & Frontend
**Terminal 1 (Backend)**:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend)**:
```bash
cd frontend
npm install
npm run dev
```

Open your browser to **`http://localhost:3000`**.

---

## 5. Model Context Protocol (MCP) Setup

To connect ResearchPilot AI with **Claude Desktop**, add the following snippet to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "researchpilot": {
      "command": "d:\\research pilot\\backend\\.venv\\Scripts\\python.exe",
      "args": [
        "-m",
        "app.mcp_server.server",
        "--transport",
        "stdio"
      ],
      "env": {
        "PYTHONPATH": "d:\\research pilot\\backend",
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/researchpilot",
        "RESEARCHPILOT_MCP_TOKEN": "<YOUR_ACCESS_TOKEN>"
      }
    }
  }
}
```

*For Cursor IDE and SSE transport configuration, see [docs/MCP_SERVER.md](docs/MCP_SERVER.md).*

---

## 6. Comprehensive Documentation Index

* **Architecture & System Design**:
  * [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Comprehensive technical architecture specification.
  * [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) — Relational schema, HNSW vector indexing, and migrations.
  * [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — Design tokens, typography, dark/light themes, and UI components.
  * [docs/HYBRID_SEARCH.md](docs/HYBRID_SEARCH.md) — PostgreSQL full-text search + pgvector Reciprocal Rank Fusion.
* **Testing & Observability**:
  * [docs/E2E_AND_LOAD_TESTING.md](docs/E2E_AND_LOAD_TESTING.md) — Playwright E2E suite and async load testing harness.
  * [docs/EVALUATION.md](docs/EVALUATION.md) — OpenTelemetry tracing, Prometheus metrics, and Grafana dashboards.
  * [docs/BENCHMARKS.md](docs/BENCHMARKS.md) — Full empirical performance and latency benchmark report.
* **Protocols & DevOps**:
  * [docs/MCP_SERVER.md](docs/MCP_SERVER.md) — Model Context Protocol 2.3.0 server implementation guide.
  * [docs/DEVOPS.md](docs/DEVOPS.md) — Multi-stage hardened Dockerfiles and GitHub Actions CI/CD workflows.
  * [docs/PORTFOLIO.md](docs/PORTFOLIO.md) — Google X-Y-Z resume bullet points, demo script, and 10 interview Q&As.
  * [docs/ADR/](docs/ADR/) — Complete catalog of 8 Architecture Decision Records (MADR format).

---

## 7. License

Distributed under the **MIT License**. See `LICENSE` for more information.

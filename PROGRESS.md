# ResearchPilot AI — Implementation Progress Tracker

This document tracks all project milestones, completed tasks, implemented features, fixes, and current status across development phases.

---

## Current Status Overview
- **Active Phase**: Phase 0 Completed (System Analysis & Architecture) -> Awaiting User Approval to start Phase 1 (Foundation)
- **Repository**: `https://github.com/Akshat29-creator/Research-Pilot.git`
- **Branch**: `main`
- **Target Hardware**: Lenovo Legion Pro 5 | AMD Ryzen 7 8745HX | RTX 5060 Laptop GPU (8GB VRAM) | Windows 11 + WSL2

---

## Phase Changelog & Milestone History

### Prompt 0: Bootstrap (Completed)
- **Status**: `COMPLETED`
- **Timestamp**: 2026-11-14
- **What Was Done**:
  - Established `.agent/rules/` for strict project governance (`project-rules.md`, `hardware.md`, `security.md`).
  - Authored 14 specialized engineering skills in `.agent/skills/`.
  - Created 6 standardized slash workflows in `.agent/workflows/` (`phase-gate`, `code-review`, `ui-audit`, `agent-reliability-audit`, `release-check`, `benchmark`).
  - Initialized git repository, linked remote `https://github.com/Akshat29-creator/Research-Pilot.git`, and pushed `main`.
- **Fixes & Hardening Applied**:
  - Bound structured JSON repair to 1 retry max.
  - Implemented SSRF private IP validation rule.
  - Added global concurrency limit rule (`asyncio.Semaphore(1)`).

### Phase 0: System Analysis & Architecture (Completed)
- **Status**: `COMPLETED (AWAITING APPROVAL)`
- **Timestamp**: 2026-11-14
- **What Was Done**:
  - **Task 1: Environment & Hardware Audit**:
    - OS: Windows 11 Home 64-bit (Build 26300), WSL2 active with Ubuntu 20.04 and Docker Desktop.
    - Compute: AMD Ryzen 7 8745HX (16 threads), 32 GB RAM (16 GB available).
    - GPU: NVIDIA GeForce RTX 5060 Laptop GPU (8151 MiB VRAM total, Driver 621.14, CUDA 13.5).
    - VRAM Headroom: 1917 MiB used by Windows display/apps, leaving ~6234 MiB (~6.1 GB) usable VRAM.
    - Runtimes: Python 3.11.9, Node.js v24.14.0, npm 11.9.0, Docker 29.3.1, Docker Compose v5.1.0.
    - Disk: Drive D: 297 GB free, Drive C: 449 GB free.
  - **Task 2: Model Selection**:
    - Primary Reasoning Model: `qwen3:8b` / `qwen3:8b-q4_K_M` (5.2 GB size, fits within ~6.1 GB VRAM with 0.8 GB KV cache headroom at 4096 tokens).
    - Embedding Model: `nomic-embed-text:latest` (274 MB size, 768 dimensions, 8192 context window).
    - Handling Qwen3 `<think>` tags: Designed text sanitizer to strip thinking tokens prior to Pydantic JSON schema deserialization.
  - **Task 3 & 4: Architectural Deliverables Authored**:
    - `docs/ARCHITECTURE.md`: Complete system topology, component interactions, sequence diagram, and security boundaries.
    - `docs/TECH_STACK.md`: Full technology specifications and version pin mappings.
    - `docs/DATABASE_DESIGN.md`: Entity-relationship (ER) diagram, schema definitions for all 8 tables, HNSW and GIN index specifications.
    - `docs/DEVELOPMENT_ROADMAP.md`: Phased execution roadmap from Phase 0 to Phase 11.
    - `docs/ADR/ADR-001-langgraph-orchestration.md`: Rationale for state graphs, bounded loops, and Postgres checkpointing.
    - `docs/ADR/ADR-002-postgres-pgvector-unified-storage.md`: Unified ACID storage for relational, checkpoint, and vector data.
    - `docs/ADR/ADR-003-hardware-concurrency-and-vram-budget.md`: Single semaphore throttling and 4K token budgeting.
    - `docs/ADR/ADR-004-citation-grounding-and-anti-hallucination.md`: Multi-agent review loop with substring citation verification.
    - `docs/ADR/ADR-005-local-first-ollama-with-cloud-fallback.md`: Privacy-preserving Ollama integration with optional cloud support.
- **Fixes & Hardening Applied**:
  - Eliminated high-risk 9B model (`qwen3.5:9b`, 6.6 GB) from primary selection to avoid GPU VRAM thrashing and PCIe swap penalties.
  - Unified relational, state checkpointer, and vector storage into PostgreSQL 16 to eliminate distributed state desynchronization.

---

## Roadmap & Next Phases

| Phase | Description | Status |
|---|---|---|
| **Prompt 0** | Bootstrap (Rules, Skills, Workflows) | **COMPLETED** |
| **Phase 0** | System Analysis, Hardware Audit & Architecture | **COMPLETED (AWAITING APPROVAL)** |
| **Phase 1** | Foundation (FastAPI Skeleton, Next.js Shell, Docker Compose) | NEXT UP |
| **Phase 2** | LLM Infrastructure (Ollama Provider, Structured JSON, Semaphore) | PENDING |
| **Phase 3** | Research Agent (Search Provider, PyMuPDF, SSRF Defense) | PENDING |
| **Phase 4** | Multi-Agent Orchestration (LangGraph, State Machine, Review Loop) | PENDING |
| **Phase 5** | RAG and Memory (pgvector, HNSW, Ingestion, Citation Verification) | PENDING |
| **Phase 5B**| Hybrid Search and Reranking (tsvector + pgvector via RRF) | PENDING |
| **Phase 6** | MCP, Approvals, Resilience (Interrupts, Checkpointer Recovery) | PENDING |
| **Phase 7** | Frontend (Next.js App Router, SSE Stream, Dark SaaS UI) | PENDING |
| **Phase 8** | Evaluation and Observability (OpenTelemetry, Prometheus, Grafana) | PENDING |
| **Phase 9** | CI/CD and Production Docker (GitHub Actions, Multi-Stage Builds) | PENDING |
| **Phase 10**| E2E Tests, Load Tests, MCP Server (Playwright, Locust, MCP Tools) | PENDING |
| **Phase 11**| Final Hardening, Benchmarks and Portfolio Delivery | PENDING |

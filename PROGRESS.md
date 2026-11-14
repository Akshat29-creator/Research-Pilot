# ResearchPilot AI — Implementation Progress Tracker

This document tracks all project milestones, completed tasks, implemented features, fixes, and current status across development phases.

---

## Current Status Overview
- **Active Track**: Frontend Redesign (Premium SaaS Interface) — Stage 1 Completed, Awaiting User Approval to start Stage 2
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

### Phase 0: System Analysis & Architecture (Completed & Refined)
- **Status**: `COMPLETED`
- **Timestamp**: 2026-11-14
- **What Was Done**:
  - Environment & Hardware audit (RTX 5060 8GB VRAM with ~6.1GB free, Ryzen 7 8745HX, 32GB RAM).
  - Selected `qwen3:8b` (Q4_K_M) as primary reasoning model and `nomic-embed-text` as embedding model.
  - Authored `docs/ARCHITECTURE.md`, `docs/TECH_STACK.md`, `docs/DATABASE_DESIGN.md`, `docs/DEVELOPMENT_ROADMAP.md`, and 5 ADRs.
  - Incorporated user feedback: in-container Ollama `/api/ps` VRAM monitoring, `OLLAMA_HOST=0.0.0.0` networking guide in `docs/TROUBLESHOOTING.md`, and default SearXNG metasearch container in `docs/RESEARCH_AGENT.md`.

### Phase 1: Foundation (Completed)
- **Status**: `COMPLETED (AWAITING APPROVAL FOR PHASE 2)`
- **Timestamp**: 2026-11-14
- **What Was Done**:
  - **Infrastructure Configuration**:
    - Created `.env.example` and local `.env` with full configuration templates.
    - Configured `docker-compose.yml` for `pgvector/pgvector:pg16`, `redis:7-alpine`, `searxng/searxng:latest`, backend, and frontend.
    - Created `Makefile` with targets (`up`, `down`, `migrate`, `test`, `lint`, `dev`, `clean`).
    - Configured `infrastructure/searxng/settings.yml` with privacy-preserving engines (DuckDuckGo, Wikipedia, Wikidata, Qwant).
  - **Backend Implementation (`backend/`)**:
    - FastAPI application factory in `app/main.py` with request ID middleware, timing headers, CORS, and structured error handling.
    - Pydantic Settings in `app/core/config.py`.
    - Structured JSON logging in `app/core/logging.py`.
    - Bcrypt password hashing and PyJWT token generation/validation in `app/core/security.py`.
    - Async SQLAlchemy 2 session factory in `app/database/session.py`.
    - Full relational data models in `app/models/` (`User`, `ResearchSession`, `Source`, `Document`, `DocumentChunk`, `Report`, `AgentRun`, `Approval`).
    - Pydantic v2 schemas in `app/schemas/` (`UserRegister`, `UserLogin`, `UserResponse`, `Token`, `HealthResponse`, `ReadyResponse`).
    - API v1 routes in `app/api/v1/`:
      - `/health`: Liveness probe returning HTTP 200 `{"status": "ok"}`.
      - `/ready`: Readiness probe inspecting PostgreSQL, Redis, and host Ollama via `/api/tags` and `/api/ps`, reporting `healthy`, `degraded`, or `unhealthy`.
      - `/auth/register`: User registration with email uniqueness and hashed passwords.
      - `/auth/login`: User authentication returning JWT Bearer token.
      - `/auth/me`: Protected profile endpoint requiring valid JWT token.
    - Alembic migration `001_initial_schema` with `CREATE EXTENSION IF NOT EXISTS vector;`, all 8 tables, foreign keys, and HNSW index.
  - **Frontend Implementation (`frontend/`)**:
    - Next.js 14+ App Router shell with strict TypeScript (`"strict": true`).
    - Tailwind CSS dark SaaS aesthetic with Emerald accent.
    - Typed API client in `src/lib/api.ts` with JWT authentication storage.
    - Landing page at `/`, authentication forms at `/login` and `/register`, and workspace shell at `/dashboard`.
    - Multi-stage Dockerfile for standalone Next.js deployment.
  - **Empirical Acceptance Criteria Verification**:
    - Criterion 1: Frontend starts -> PASS (HTTP 200 on `http://localhost:3000`, `/login`, `/register`).
    - Criterion 2: Backend starts -> PASS (HTTP 200 on `http://127.0.0.1:8000/api/v1/health`).
    - Criterion 3: Postgres connects -> PASS (`researchpilot-postgres` container healthy on port 5432).
    - Criterion 4: Migration runs -> PASS (Alembic upgraded `001_initial_schema`, 8 domain tables verified via `\dt`).
    - Criterion 5: `/ready` reports accurate status incl. Ollama down case -> PASS (Live check healthy; integration test verifies degraded status on Ollama unreachable).
    - Criterion 6: Compose brings up infra -> PASS (`docker compose ps` shows postgres, redis, and searxng healthy).
    - Criterion 7: Auth register/login works -> PASS (Live register, login, and `/me` verified over HTTP).
    - Criterion 8: All tests pass -> PASS (15/15 unit and integration tests passing in 2.40s).
- **Fixes & Hardening Applied**:
  - Resolved `sqlalchemy[asyncio]` greenlet dependency requirement.
  - Added `email-validator` for Pydantic `EmailStr` field validation.
  - Refactored `httpx.AsyncClient` test mocks to selectively intercept Ollama port 11434 without colliding with test client transport.
  - Fixed Starlette `add_exception_handler` type compatibility in `app/core/errors.py`.
  - Cleaned all Ruff linting errors and achieved 100% clean Mypy type-checking across 23 source files.

### Frontend Redesign: Premium SaaS Interface (In Progress)
- **Status**: `STAGE 1 COMPLETED (AWAITING USER APPROVAL FOR STAGE 2)`
- **Timestamp**: 2026-11-14
- **What Was Done**:
  - **Stage 1: Audit and Design Direction (Zero Code Changes)**:
    - Executed live headless browser audit capturing full-page desktop (1440px) and mobile (390px) screenshots across all routes (`/`, `/login`, `/register`, `/dashboard`) saved in `docs/screenshots/audit/`.
    - Documented concrete UX issues across spacing, typography, color/contrast, information hierarchy, alignment, empty/loading/error states, mobile responsiveness, and WCAG AA accessibility.
    - Authored `docs/DESIGN_SYSTEM.md` establishing the design philosophy (calm, precise research workstation inspired by Linear, Vercel, Perplexity, Raycast, and Arc).
    - Defined semantic CSS variable tokens for **both Dark and Light themes** with verified WCAG AA contrast compliance (`--bg-app`, `--bg-surface`, `--bg-surface-raised`, `--border-subtle`, `--border-strong`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`).
    - Standardized Geist Sans / Inter for UI typography, Geist Mono / JetBrains Mono for telemetry/timings/citations, `tabular-nums` for numeric telemetry, and a strict 4px spacing grid.
    - Refined inference architecture per user instruction: **100% Free & Local-First on RTX 5060 Laptop GPU** (completely discarding cloud LLM models to eliminate all external costs and maintain air-gapped privacy).
    - Created rich visual preview artifact `stage_1_design_system_preview.md` containing carousel audit comparisons, token matrices, and ASCII/markdown visual mockups of 3 signature components:
      1. *LangGraph Live Agent Node* (elapsed timings, tool calls, token metrics).
      2. *Verified Source Card & Citation Chip* (grounded text excerpts, page offsets, hash attribution).
      3. *Local Hardware & GPU Telemetry Card* (live VRAM gauge via Ollama `/api/ps`, context window budget, and semaphore concurrency status).

---

## Roadmap & Next Phases

| Phase | Description | Status |
|---|---|---|
| **Prompt 0** | Bootstrap (Rules, Skills, Workflows) | **COMPLETED** |
| **Phase 0** | System Analysis, Hardware Audit & Architecture | **COMPLETED** |
| **Phase 1** | Foundation (FastAPI Skeleton, Next.js Shell, Docker Compose) | **COMPLETED (AWAITING APPROVAL)** |
| **Phase 2** | LLM Infrastructure (Ollama Provider, Structured JSON, Semaphore) | NEXT UP |
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

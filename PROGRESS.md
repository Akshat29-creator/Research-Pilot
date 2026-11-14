# ResearchPilot AI — Implementation Progress Tracker

This document tracks all project milestones, completed tasks, implemented features, fixes, and current status across development phases.

---

## Current Status Overview
- **Active Track**: Frontend Redesign (Premium SaaS Interface) — All 9 Screens of Stage 4 Completed & Shipped
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
  - **Stage 2: Design System & Components Implementation (Completed)**:
    - Installed core UI and state packages: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`, `@radix-ui/react-slot`, `cmdk`, `sonner`, `next-themes`, `framer-motion`, `@tanstack/react-query`, `zustand`, `zod`, `@xyflow/react`, `recharts`, `react-markdown`, `remark-gfm`.
    - Configured Vitest test runner with `@vitejs/plugin-react` and `@testing-library/react`.
    - Integrated design tokens in `frontend/src/app/globals.css` and `frontend/tailwind.config.ts` supporting both Dark and Light themes with WCAG AA compliance.
    - Implemented complete 22-component library in `frontend/src/components/ui/` (`Button`, `Input`, `Select`, `Dialog`, `Sheet`, `Tabs`, `Tooltip`, `Badge`, `StatusDot`, `Card`, `DataTable`, `Skeleton`, `EmptyState`, `ErrorState`, `CommandPalette`, `Stepper`, `Timeline`, `CitationChip`, `SourceCard`, `MetricCard`, `CodeBlock`, `KeyboardShortcut`).
    - Built comprehensive interactive `/dev/components` showcase page displaying every component across default, hover, active, loading, empty, and error states with live dark/light mode toggle.
    - Verified all 4 Vitest unit tests pass (`4 passed in 96ms`).
    - Verified strict TypeScript compilation with zero errors (`tsc --noEmit`).
    - Verified Next.js production build (`next build` prerenders 8 pages).
    - Captured high-fidelity desktop (1440px) and mobile (390px) screenshots of `/dev/components` saved in `docs/screenshots/components-1440.png` and `components-390.png`.
    - Created Stage 2 review artifact `stage_2_component_system_review.md`.
  - **Stage 3: App Shell Architecture (Completed)**:
    - Built persistent Zustand store `useUIStore` managing sidebar collapse state, command palette state, mobile drawer state, and keyboard shortcuts modal.
    - Implemented global keyboard listener `useKeyboardShortcuts` supporting `⌘K` / `Ctrl+K` (Command Palette), `⌘B` / `Ctrl+B` (Toggle Sidebar), `?` (Shortcuts Help Dialog), and `Esc` (Dismiss).
    - Built collapsible Linear-style `Sidebar` (240px expanded $\leftrightarrow$ 64px collapsed) with icon tooltips and persistent NVIDIA RTX 5060 telemetry card.
    - Built `Topbar` with dynamic route breadcrumbs derived from `usePathname()`, quick search trigger, live hardware health pill, theme toggle, and user profile dropdown (`UserMenu`).
    - Implemented responsive `MobileNav` sheet drawer converting sidebar into a slide-over sheet on mobile viewports ($< 768px$).
    - Built authenticated `AppShell` wrapper in `frontend/src/app/(app)/layout.tsx` protecting authenticated routes.
    - Created clean routed pages for `/dashboard`, `/research/new`, `/history`, `/documents`, `/observability`, and `/settings`.
    - Captured high-fidelity desktop and mobile screenshots saved in `docs/screenshots/*-shell-*.png`.
    - Created Stage 3 review artifact `stage_3_app_shell_review.md`.
  - **Stage 4: Screen 1 — Landing Page Redesign (Completed)**:
    - Completely redesigned `frontend/src/app/page.tsx` with a left-anchored, high-contrast hero and zero AI novelty gimmicks.
    - Added an active research prompt input form with `↵` Enter shortcut and automatic query transfer to `/dashboard?q=...`.
    - Added 4 interactive benchmark prompt chips (HNSW vs IVFFlat, LangGraph bounded review loop, Qwen3:8B quantization loss, RRF reranking) that populate and submit on click.
    - Authored custom, publication-grade SVG diagram illustrating the 5-node LangGraph sequential pipeline (`Orchestrator` $\rightarrow$ `Research` $\rightarrow$ `Analysis` $\rightarrow$ `Writer` $\rightarrow$ `Reviewer`) with bounded revision loop arrows.
    - Implemented 3-step methodology walkthrough (*Autonomous Decomposition*, *Hybrid Evidence Retrieval*, *Adversarial Grounding Audit*).
    - Added 4-card technical architecture matrix covering on-device execution, cryptographic citations, unified PostgreSQL 16 + pgvector storage, and human review gates.
    - Integrated live hardware status pill (`● RTX 5060 • Local`) and theme toggle in navigation bar.
    - Verified strict TypeScript compilation with zero errors (`tsc --noEmit`).
    - Captured high-fidelity desktop (1440px) and mobile (390px) screenshots saved in `docs/screenshots/landing-redesign-*.png`.
    - Created Stage 4 Screen 1 review artifact `stage_4_screen_1_landing_review.md`.
  - **Stage 4: Screen 2 — Dashboard Redesign (Completed)**:
    - Redesigned `frontend/src/app/(app)/dashboard/page.tsx` as a high-density research operations cockpit.
    - Implemented real-time GPU health card with color-coded VRAM progress gauge, free headroom monitor, and local Ollama model states.
    - Added quick-start research dispatch input with prefilling from landing page `?q=...` parameters and 1-click starter chips.
    - Added cumulative workspace metrics card (Dossiers compiled, sources ingested, average grounding score, $0.00 cloud cost).
    - Built sortable recent sessions `DataTable` with status dots, execution timings in `tabular-nums`, and verification badges.
    - Implemented polished `EmptyState` for new workspaces with suggested prompts and sample session view toggle.
    - Verified strict TypeScript compilation with zero errors (`tsc --noEmit`).
    - Captured high-fidelity desktop (1440px) and mobile (390px) screenshots saved in `docs/screenshots/dashboard-redesign-*.png`.
    - Created Stage 4 Screen 2 review artifact `stage_4_screen_2_dashboard_review.md`.
  - **Stage 4: Screen 3 — Research Workspace Redesign (Completed)**:
    - Built the flagship 3-panel Research Workspace at `frontend/src/app/(app)/research/[id]/page.tsx`.
    - Created `frontend/src/components/research/agent-node.tsx` with role descriptions, latency badges, retry counts, token velocities, and review loop counters.
    - Created `frontend/src/components/research/agent-graph.tsx` with interactive React Flow canvas (`Orchestrator` -> `Research` -> `Analysis` -> `Writer` -> `Reviewer`), animated edges, and dashed feedback revision loop edge.
    - Created `frontend/src/components/research/streaming-feed.tsx` with terminal aesthetic, live SSE updates, token velocity (`tok/s`), tool tags (`SearXNG`, `pgvector`), payload inspection modal, and auto-scroll follow toggle.
    - Created `frontend/src/components/research/sources-drawer.tsx` with category tabs (`All`, `Academic`, `Web`, `Deduped`), search input, `SourceCard` list, credibility metrics, and full excerpt inspection dialog.
    - Created `frontend/src/components/research/approval-modal.tsx` with keyboard navigation (`Enter` to Approve, `Esc` to Reject), flagged claim preview, reviewer audit rationale, and loop iteration indicator.
    - Implemented mobile (390px) responsive segmented switcher between `Graph & Stream`, `Plan (5)`, and `Sources (6)` with zero layout clipping.
    - Added unit test suite in `frontend/tests/components/research.test.tsx` (all 7 vitest unit tests passing).
    - Verified strict TypeScript compilation (`tsc --noEmit` -> 0 errors) and production build (`next build` -> 14/14 routes compiled).
    - Captured high-fidelity desktop (1440px), approval modal, and mobile (390px) screenshots in `docs/screenshots/workspace-redesign-*.png`.
    - Created Stage 4 Screen 3 review artifact `stage_4_screen_3_workspace_review.md`.
  - **Stage 4: Screen 4 — Agent Trace Inspector (Completed)**:
    - Built the distributed systems trace inspector at `frontend/src/app/(app)/research/[id]/trace/page.tsx`.
    - Created `frontend/src/components/trace/trace-data.ts` conforming to OpenTelemetry GenAI semantic conventions.
    - Created `frontend/src/components/trace/gantt-timeline.tsx` with X-axis time rulers (0s-5s), proportional execution bars, nested tool sub-spans, and agent-specific color coding.
    - Created `frontend/src/components/trace/span-inspector.tsx` with hardware telemetry grid, copyable span ID, and tabbed view for input payloads, output results, and context tags.
    - Added Raw OpenTelemetry JSON specification dialog with copy and `.json` file download support.
    - Added unit test suite in `frontend/tests/components/trace.test.tsx` (all 10 vitest unit tests passing).
    - Verified strict TypeScript compilation (`tsc --noEmit` -> 0 errors) and Next.js production build (`next build` -> 14/14 routes).
    - Captured high-fidelity desktop (1440px), raw JSON modal, and mobile (390px) screenshots in `docs/screenshots/trace-redesign-*.png`.
    - Created Stage 4 Screen 4 review artifact `stage_4_screen_4_trace_review.md`.
  - **Stage 4: Screen 5 — Report Viewer (Completed)**:
    - Built the academic-grade synthesis dossier viewer at `frontend/src/app/(app)/reports/[id]/page.tsx`.
    - Created `frontend/src/components/report/report-toc.tsx` with smooth scroll-spy Table of Contents.
    - Created `frontend/src/components/report/reviewer-verdict-card.tsx` displaying the adversarial grounding score (92%), 11 corroborated assertions, 1 human-approved extrapolation, and zero hallucinations.
    - Created `frontend/src/components/report/report-content.ts` with comprehensive technical report markdown on pgvector HNSW vs. IVFFlat.
    - Built interactive `CitationChip` popovers revealing verified credibility badges, publisher domains, page offsets, and direct quotations.
    - Added live in-browser markdown editor mode with local autosave indicator and draft reset option.
    - Integrated print-optimized CSS for 1-click PDF export and instant `.md` file download.
    - Added unit test suite in `frontend/tests/components/report.test.tsx` (all 12 vitest unit tests passing across 4 suites).
    - Verified strict TypeScript compilation (`tsc --noEmit` -> 0 errors) and Next.js production build (`next build` -> 14/14 routes).
    - Captured high-fidelity desktop (1440px), citation popover, sources drawer, edit mode, and mobile (390px) screenshots in `docs/screenshots/report-redesign-*.png`.
    - Created Stage 4 Screen 5 review artifact `stage_4_screen_5_report_review.md`.
  - **Stage 4: Screen 6 — Documents Library (Completed)**:
    - Redesigned the knowledge base library at `frontend/src/app/(app)/documents/page.tsx`.
    - Created `frontend/src/components/documents/upload-zone.tsx` with drag-and-drop file ingestion, 4-stage pipeline progress tracking (`PyMuPDF` -> `Chunking` -> `Embedding` -> `pgvector Storage`), and format validation.
    - Created `frontend/src/components/documents/chunk-inspector-dialog.tsx` with chunk filtering, page markers, token counts, and `.json` export.
    - Implemented delete confirmation dialog guarding against accidental vector dropping.
    - Added aggregate knowledge base telemetry strip (indexed documents, total chunks, storage footprint, and `pgvector: ACTIVE` indicator).
    - Built responsive card-based document stack for 390px mobile viewports.
    - Added unit test suite in `frontend/tests/components/documents.test.tsx` (all 14 vitest unit tests passing across 5 suites).
    - Verified strict TypeScript compilation (`tsc --noEmit` -> 0 errors) and Next.js production build (`next build` -> 14/14 routes).
    - Captured high-fidelity desktop (1440px), chunk explorer modal, delete dialog, and mobile (390px) screenshots in `docs/screenshots/documents-redesign-*.png`.
    - Created Stage 4 Screen 6 review artifact `stage_4_screen_6_documents_review.md`.

  - **Stage 4: Screen 7 — Observability Dashboard (`/observability`) (Completed)**:
    - Designed and implemented a high-density, real-time hardware telemetry cockpit and systems observability dashboard.
    - Implemented `GpuVramWidget` specifically profiling host NVIDIA GeForce RTX 5060 Laptop GPU (8,151 MiB VRAM), displaying multi-segment visual progress bar (Qwen-3-8B 5,214 MiB, nomic-embed-text 274 MiB, and 2,663 MiB safe headroom), 58°C core temp, 64W power draw, and `asyncio.Semaphore(1)` hardware concurrency lock status.
    - Built `LatencyChart` with Recharts featuring dual-mode toggle between Workflow Latency Percentiles ($p_{50}, p_{90}, p_{99}$) and Per-Agent Stage Execution Time breakdown across the 5 LangGraph agent nodes.
    - Built `ThroughputChart` with dual Y-axes measuring Qwen-3-8B token generation velocity (28.4 tok/s peak) and `pgvector` HNSW Cosine search latency (6.4ms–9.1ms).
    - Implemented `SystemHealthGrid` with live probes for PostgreSQL 16 + pgvector (:5432), Redis 7 In-Memory Cache (:6379), SearXNG Metasearch (:8080), and Ollama Local Inference (:11434).
    - Added `AgentReliabilityCard` tracking Adversarial Review verification rates (91.7% first-pass approval, 8.3% revision loops, 0 hallucinations) and Free Local Cost Offset ($0.00 incurred, $142.80 cloud cost saved).
    - Added `LiveEventStream` terminal with OpenTelemetry GenAI Semantic Conventions log events, category filtering (`ALL`, `INFERENCE`, `RETRIEVAL`, `SYSTEM`), pause/play toggle, and clipboard copy.
    - Added comprehensive unit test suite in `frontend/tests/components/observability.test.tsx` (all 21 vitest unit tests passing across 6 suites).
    - Verified strict TypeScript compilation (`tsc --noEmit` -> 0 errors) and Next.js production build (`next build` -> 14/14 routes).
    - Captured high-fidelity desktop (1440px), agent stages breakdown, bottom infrastructure scroll, and mobile (390px) screenshots in `docs/screenshots/observability-redesign-*.png`.
    - Created Stage 4 Screen 7 review artifact `stage_4_screen_7_observability_review.md`.

  - **Stage 4: Screen 8 — Settings (`/settings`) (Completed)**:
    - Redesigned and implemented workstation configuration cockpit with strict host hardware constraints and real-time telemetry.
    - Built `VramEstimatorCard` computing dynamic VRAM footprint based on selected model (Qwen-3-8B 5.2GB, Llama-3.2-3B 2.0GB, Mistral-7B 4.4GB), nomic-embed-text (274MB), and KV cache size.
    - Implemented hardware capacity spillover warning: moving context window slider beyond 4,096 tokens (e.g. to 8,192 tokens) triggers an immediate amber/red alert warning that total memory reaches 6,408 MiB and exceeds the 6.1 GB safe headroom on the 8 GB RTX 5060 Laptop GPU.
    - Built `SearchProviderSection` for local SearXNG container (:8080) with live connectivity ping tester (`Connected • 18ms`), cluster engine toggles (Google, Bing, ArXiv, Wikipedia, Europe PMC), and retrieval limit slider (3 to 15 sources).
    - Built `AgentGuardrailsSection` for adversarial reviewer strictness (`Strict 90%+ grounding`), human approval pause modes, and customizable research system prompt with character counter and default reset.
    - Built `DatabaseStorageSection` with pgvector counters (12 dossiers, 172 chunks, 8.4 MB vector tables, 14.2 MB Redis cache), backup archive `.json` exporter, cache flushing, and guarded `DangerPurgeDialog` requiring `DELETE-ALL-DATA` typed confirmation.
    - Added unit test suite in `frontend/tests/components/settings.test.tsx` (all 27 vitest unit tests passing across 7 suites).
    - Verified strict TypeScript compilation (`tsc --noEmit` -> 0 errors) and Next.js production build (`next build` -> 14/14 routes).
    - Captured high-fidelity desktop (1440px), 8192 token warning alert, purge confirmation dialog, bottom storage scroll, and mobile (390px) screenshots in `docs/screenshots/settings-redesign-*.png`.
    - Created Stage 4 Screen 8 review artifact `stage_4_screen_8_settings_review.md`.

  - **Stage 4: Screen 9 — Auth Pages (`/login`, `/register`) (Completed)**:
    - Redesigned `/login` and `/register` into a unified, high-density, calm research workstation entrance adhering to design tokens.
    - Implemented a desktop split layout ($\ge 1024\text{px}$) featuring a hardware telemetry panel highlighting host NVIDIA GeForce RTX 5060 Laptop GPU (8GB VRAM), Qwen3:8B local inference, zero cloud egress ($0.00 cost), and local pgvector embeddings.
    - Added one-click "Autofill Demo Credentials" button (`pilot@researchpilot.com` / `PilotSecurePass123!`) on `/login` to accelerate development and review workflows.
    - Added password visibility mask toggles (`Eye` / `EyeOff`) with accessible ARIA labeling on both forms.
    - Added dynamic password requirements checklist on `/register` (minimum 8 characters, passwords match).
    - Added unit test suite in `frontend/tests/components/auth.test.tsx` (all 33 vitest unit tests passing across 8 suites).
    - Verified strict TypeScript compilation (`tsc --noEmit` -> 0 errors) and Next.js production build (`next build` -> 14/14 routes).
    - Captured high-fidelity desktop (1440px), autofill, validation error, and mobile (390px) screenshots in `docs/screenshots/auth-redesign-*.png`.
    - Created Stage 4 Screen 9 review artifact `stage_4_screen_9_auth_review.md`.

### Phase 2: LLM Infrastructure (Completed)
- **Status**: `COMPLETED`
- **Timestamp**: 2026-11-15
- **What Was Done**:
  - **Provider Architecture & Typed Error Hierarchy (`backend/app/integrations/llm/`)**:
    - Created typed error classes in `exceptions.py` inheriting from `AppException` (`LLMError`, `LLMConnectionError`, `LLMModelNotFoundError`, `LLMStructuredOutputError`, `LLMTimeoutError`).
    - Standardized response containers in `base.py`: `LLMResponse` (with prompt/completion token tracking, durations, and metadata) and `ProviderHealth` (probing daemon reachability, model presence, VRAM footprint, and CPU layer spill).
    - Established abstract base classes `LLMProvider` and `EmbeddingProvider`.
  - **Hardware Concurrency Guard (`semaphore.py`)**:
    - Built global singleton `asyncio.Semaphore(1)` enforcing strict FIFO serialization on host NVIDIA GeForce RTX 5060 Laptop GPU (8GB VRAM) to prevent parallel allocation OOM driver crashes.
    - Added telemetry counters (`total_acquisitions`, `active_acquisitions`, `waiting_requests`, `total_wait_duration_ms`).
  - **Reasoning Thought Stripping & Bounded 1-Shot Schema Repair (`structured.py`)**:
    - Authored `strip_thinking_tags()` to handle `qwen3:8b` reasoning blocks (`<think>...</think>`), multi-line tags, and truncated unclosed trailing tags.
    - Implemented `extract_json_string()` supporting markdown code blocks (` ```json...``` `), raw JSON objects/arrays, and automated trailing comma cleanup.
    - Authored `format_schema_prompt()` generating strict Pydantic JSON schemas.
    - Authored `format_repair_prompt()` providing the validation error diff, invalid snippet, and target schema for a single bounded 1-shot repair retry.
  - **Ollama Provider Implementation (`ollama.py`)**:
    - Implemented `OllamaProvider(LLMProvider)` with semaphore lock acquisition, options merging (`num_ctx=4096`, `temperature=0.1`), timeout/connection handling, streaming with async generator, and structured validation with 1-shot repair.
    - Added deep health diagnostics via `/api/tags` and `/api/ps` measuring active VRAM allocations and detecting host system RAM spill.
  - **Vector Embedding Provider (`embeddings.py`)**:
    - Implemented `OllamaEmbeddingProvider(EmbeddingProvider)` for `nomic-embed-text` (768-dimensional float vectors).
    - Supported both single string `embed_text()` and high-throughput batch `embed_batch()` under semaphore lock with fallback mechanisms.
  - **Factory & Public Interface (`factory.py`, `__init__.py`)**:
    - Added singleton accessors `get_llm_provider()` and `get_embedding_provider()` with reset capability for clean testing.
  - **Testing & Verification**:
    - 19 unit tests in `tests/unit/test_llm_provider.py` covering thinking tag removal, JSON extraction, schema prompts, semaphore serialization, error mapping, and 1-shot repair recovery.
    - 4 live integration tests in `tests/integration/test_ollama.py` querying local host Ollama daemon (:11434), verifying healthy probes, actual 768-d vector embeddings, and live `qwen3:8b` text generation.
    - Full backend test suite passing: **38 / 38 tests passing in 15.4s**.
    - Ruff and Mypy passing with **zero errors and zero warnings**.

### Phase 3: Research Agent & Tool Pipeline (Completed)
- **Status**: `COMPLETED`
- **Timestamp**: 2026-11-15
- **What Was Done**:
  - **Search Provider Abstraction (`backend/app/integrations/search/`)**:
    - Created `SearchResult` container with URL canonicalization (stripping tracking query parameters like `utm_*`, `ref`, `fbclid`, lowercasing hostnames, removing trailing slashes).
    - Implemented `SearXNGSearchProvider` querying local Docker metasearch container (`localhost:8080`) with deduplication and error tolerance.
    - Implemented `TavilySearchProvider` and `BraveSearchProvider` with optional API key checks and health probes.
    - Implemented `get_search_provider()` factory with automatic fallback to local SearXNG if cloud search API keys are not supplied.
  - **SSRF Defense & Safe Web Retrieval (`backend/app/tools/ssrf.py`)**:
    - Built `validate_url_ssrf()` enforcing HTTP/HTTPS schemes, resolving DNS hostnames, and rejecting RFC 1918 private IPs (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`, `fe80::/10`), and cloud instance metadata (`169.254.169.254`).
    - Built `safe_fetch_url()` with per-hop redirect validation (max 3 hops), 10s connection timeouts, and 5MB payload caps.
  - **Readability & Web Extraction (`backend/app/tools/web_extractor.py`)**:
    - Implemented `extract_web_content()` using `BeautifulSoup` to strip boilerplate tags (`<script>`, `<style>`, `<noscript>`, `<iframe>`, `<header>`, `<footer>`, `<nav>`, `<aside>`, `<form>`, `<svg>`, `<button>`) and advertisement modals.
    - Extracted clean text, page titles, canonical URLs, and word/char counts.
  - **PyMuPDF Document Parsing (`backend/app/tools/pdf_parser.py`)**:
    - Implemented `parse_pdf_bytes()` and `parse_pdf_file()` using `PyMuPDF` (`fitz`).
    - Preserved 1-based page numbers (`ParsedPage.page_number`) for exact citation grounding.
    - Computed cryptographic SHA-256 checksums of PDF bytes for immutable provenance tracking.
  - **Prompt Injection Defense & Boundary Delimiters (`backend/app/tools/isolation.py`)**:
    - Authored `sanitize_untrusted_text()` defanging closing `</untrusted_source_document>` tags, ChatML tokens (`<|im_start|>`, `<|im_end|>`), and LLM instruction delimiters (`[INST]`, `<think>`).
    - Built `wrap_untrusted_content()` and `wrap_multiple_untrusted_sources()` placing untrusted text within explicit XML containers.
    - Authored `get_isolation_system_directive()` providing strict instructions forbidding LLMs from following commands inside evidence blocks.
  - **Research Agent Orchestrator (`backend/app/agents/research.py`)**:
    - Implemented `ResearchAgent` orchestrating query planning (decomposing topics into 2-3 focused search angles), source gathering with deduplication and SSRF safety, and structured synthesis (`ResearchSynthesis`) with local LLM.
  - **Testing & Verification**:
    - 25 unit tests across `test_search_providers.py`, `test_ssrf_validator.py`, `test_web_extractor.py`, `test_pdf_parser.py`, `test_prompt_isolation.py`, and `test_research_agent.py`.
    - 2 live integration tests in `test_searxng.py` testing the local running `researchpilot-searxng` container on `localhost:8080`.
    - Total backend test suite: **65 / 65 tests passing in 18.25s**.
    - Ruff and Mypy passing with **zero errors and zero warnings**.

---

## Roadmap & Next Phases

| Phase | Description | Status |
|---|---|---|
| **Prompt 0** | Bootstrap (Rules, Skills, Workflows) | **COMPLETED** |
| **Phase 0** | System Analysis, Hardware Audit & Architecture | **COMPLETED** |
| **Phase 1** | Foundation (FastAPI Skeleton, Next.js Shell, Docker Compose) | **COMPLETED** |
| **Phase 2** | LLM Infrastructure (Ollama Provider, Structured JSON, Semaphore) | **COMPLETED** |
| **Phase 3** | Research Agent (Search Provider, PyMuPDF, SSRF Defense) | **COMPLETED** |
| **Phase 4** | Multi-Agent Orchestration (LangGraph, State Machine, Review Loop) | NEXT UP |
| **Phase 4** | Multi-Agent Orchestration (LangGraph, State Machine, Review Loop) | PENDING |
| **Phase 5** | RAG and Memory (pgvector, HNSW, Ingestion, Citation Verification) | PENDING |
| **Phase 5B**| Hybrid Search and Reranking (tsvector + pgvector via RRF) | PENDING |
| **Phase 6** | MCP, Approvals, Resilience (Interrupts, Checkpointer Recovery) | PENDING |
| **Phase 7** | Frontend (Next.js App Router, SSE Stream, Dark SaaS UI) | PENDING |
| **Phase 8** | Evaluation and Observability (OpenTelemetry, Prometheus, Grafana) | PENDING |
| **Phase 9** | CI/CD and Production Docker (GitHub Actions, Multi-Stage Builds) | PENDING |
| **Phase 10**| E2E Tests, Load Tests, MCP Server (Playwright, Locust, MCP Tools) | PENDING |
| **Phase 11**| Final Hardening, Benchmarks and Portfolio Delivery | PENDING |

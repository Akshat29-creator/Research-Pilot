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

### Phase 4: Multi-Agent Orchestration (Completed)
- **Status**: `COMPLETED`
- **Timestamp**: 2026-11-15
- **What Was Done**:
  - **State Machine Definition (`backend/app/workflows/state.py`)**:
    - Created `ResearchWorkflowState(TypedDict)` holding session/execution identifiers, query, sub-queries, 3-step investigation plan, raw sources, grounded evidence chunks, structured analysis, draft report, adversarial feedback, revision iterations (`iteration_count`, `max_iterations`), workflow status, errors, and per-node hardware execution timings.
    - Authored `create_initial_state()` factory with sane defaults and configurable constraints.
  - **Conditional Routing (`backend/app/workflows/router.py`)**:
    - Built `route_after_review()` determining next state: transitions to `"final_report"` if adversarial grounding review passed or if `iteration_count >= max_iterations`; otherwise routes back to `"writer"` for targeted revision.
  - **Multi-Agent Node Network (`backend/app/workflows/nodes/`)**:
    - `orchestrator_node`: Decomposes query into a 3-step investigation plan and 2-3 focused search queries with fallback heuristic planning.
    - `researcher_node`: Executes search queries using `get_search_provider()`, filters URLs through SSRF-safe retrieval (`safe_fetch_url()`), extracts clean content (`extract_web_content()`), and deduplicates sources.
    - `analyst_node`: Synthesizes gathered evidence under strict XML prompt isolation boundaries into `AnalysisSchema` (key findings with source IDs, consensus points, contradictions, and unresolved questions).
    - `writer_node`: Authors academic-grade Markdown research dossiers with inline footnote citations `[^N]`, incorporating reviewer critiques on revision cycles.
    - `reviewer_node`: Acts as an adversarial fact-checker, auditing report claims against source evidence, computing factual grounding score (0.0 to 1.0), and incrementing `iteration_count`.
    - `final_report_node`: Compiles publication-ready Markdown dossier adorned with an Adversarial Grounding Audit badge (green passed note or amber human verification warning).
  - **Graph Construction & Execution Engine (`backend/app/workflows/builder.py`, `runner.py`)**:
    - `build_research_graph()`: Assembles the 6-node LangGraph `StateGraph` with START -> orchestrator -> researcher -> analyst -> writer -> reviewer, conditional edge `route_after_review`, and reviewer/writer revision loop.
    - `compile_research_workflow()`: Compiles graph with optional persistence checkpointer (`MemorySaver` or `PostgresSaver`).
    - `run_research_workflow()`: Executes the compiled graph asynchronously end-to-end.
    - `stream_research_workflow()`: Asynchronously yields progressive node-by-node state updates for real-time frontend SSE streaming.
  - **Testing & Verification**:
    - 12 unit tests across `test_workflow_state.py`, `test_workflow_router.py`, and `test_workflow_nodes.py`.
    - 3 integration tests in `test_langgraph_workflow.py` executing:
      1. Full end-to-end graph execution with live Ollama `qwen3:8b` inference on NVIDIA GeForce RTX 5060 Laptop GPU.
      2. Progressive event streaming through all 6 node events.
      3. Adversarial revision loop strictly terminating at `max_iterations=2` without infinite looping.
    - Total Phase 4 test suite: **15 / 15 tests passed** (4m39s with full live GPU inference).
    - Full backend unit test suite: **62 / 62 tests passed in 3.53s**.
    - Ruff and Mypy passing with **zero errors and zero warnings** across all 12 workflow files.

### Phase 5: RAG and Memory (Completed)
- **Status**: `COMPLETED`
- **Timestamp**: 2026-11-15
- **What Was Done**:
  - **Recursive Character & Semantic Text Chunking (`backend/app/services/chunking.py`)**:
    - Built `split_text_recursive()` preserving paragraph boundaries (`\n\n`), sentence boundaries (`. `, `? `, `! `), and punctuation without cutting words or mid-sentence phrases.
    - Implemented `chunk_text()` generating structured `TextChunk` containers with character offsets, page indices, and token approximations (~4 chars/token).
    - Implemented `chunk_parsed_document()` ingesting PyMuPDF `ParsedDocument` instances, preserving 1-based `page_number` for precise footnote citation tracking.
  - **Document Ingestion & Content Deduplication (`backend/app/services/ingestion_service.py`)**:
    - Built `compute_sha256()` hashing raw incoming bytes/strings.
    - Implemented `ingest_document()`:
      - Inspects existing `documents` table by `(user_id, content_hash)`; if match exists, skips redundant vector embedding computation to conserve compute and VRAM.
      - Dispatches chunking based on MIME type (PDF via PyMuPDF or plain text/HTML).
      - Generates 768-dimensional normalized float vectors in batches using `OllamaEmbeddingProvider` (`nomic-embed-text`) guarded by the global GPU semaphore.
      - Persists `Document` and `DocumentChunk` entities transactionally in PostgreSQL.
  - **pgvector HNSW Semantic Retrieval (`backend/app/services/retrieval_service.py`)**:
    - Implemented `semantic_search()` executing approximate nearest neighbor queries over PostgreSQL `document_chunks` using pgvector cosine distance (`1 - (embedding <=> query_vector)`).
    - Enforced strict multi-tenant isolation via `Document.user_id == user_id`.
    - Supported configurable `min_similarity` thresholds (default 0.65) and top-k slicing.
  - **Citation Grounding & Audit Engine (`backend/app/services/citation_service.py`)**:
    - Implemented two-tier validation: normalized substring containment and token 3-gram asymmetric Jaccard coverage.
    - Authored `extract_claims_with_citations()` parsing markdown reports to isolate assertions paired with footnote citations `[^N]`.
    - Implemented `audit_report_citations()` computing aggregate grounding ratio, categorization (`VERIFIED`, `PARTIAL`, `UNVERIFIED`), and passing status (threshold $\ge 0.85$).
  - **Testing & Verification**:
    - 6 unit tests in `test_chunking.py` verifying paragraph preservation, recursive overlap, token estimates, and multi-page PDF chunking.
    - 10 unit tests in `test_citation_service.py` verifying string normalization, 3-gram calculations, exact matches, partial matches, unverified assertions, footnote parsing, and report audits.
    - 5 unit tests in `test_rag_services.py` verifying SHA-256 deduplication (zero embedding calls on duplicate), new document persistence, and query assembly.
    - 1 comprehensive live integration test in `test_rag_pgvector.py` running against live PostgreSQL (`researchpilot-postgres`) and live Ollama (`nomic-embed-text`), verifying ingestion, deduplication, cosine similarity retrieval, tenant isolation, and citation audits.
    - Total backend test suite: **99 / 99 tests passed in 22.02s**.
    - Ruff and Mypy passing with **zero errors and zero warnings** across all 61 source files.

### Phase 6: Advanced Agent Capabilities & MCP Client (Completed)
- **Status**: `COMPLETED`
- **Timestamp**: 2026-11-15
- **What Was Done**:
  - **Model Context Protocol (MCP) Client (`backend/app/integrations/mcp/`)**:
    - Created Pydantic v2 schemas in `models.py`: `MCPToolParameter`, `MCPToolDefinition`, `MCPToolCall`, and `MCPToolResult`.
    - Implemented `MCPClient` in `client.py` with strict schema validation against JSON schema definitions, bounded 15s execution timeout (`asyncio.wait_for`), and prompt injection defense via `sanitize_untrusted_text()` (defanging ChatML `<|im_start|>` to `[CHATML_START_DEFANGED]`).
    - Implemented `MCPToolRegistry` in `registry.py` with singleton access `get_mcp_registry()` for unified discovery and dispatch across external tool servers.
  - **Human-in-the-Loop (HITL) Workflow Pauses & Interrupts (`backend/app/workflows/interrupts.py`)**:
    - Implemented `gate_approval(step_name, state, payload)` invoking LangGraph's native `interrupt()` when `approval_required=True`.
    - Built database helpers `create_approval_record()`, `resolve_approval_record()`, and `get_pending_approvals()` managing `Approval` entities in PostgreSQL.
    - Updated `orchestrator_node` to trigger `plan_approval` gate and route conditionally:
      - `route_after_orchestrator` branches to `END` if plan is rejected by the human reviewer, or to `researcher` if approved.
  - **PostgreSQL Checkpoint Persistence & Crash Recovery (`backend/app/workflows/checkpointer.py`, `runner.py`)**:
    - Implemented `get_async_postgres_checkpointer()` using `AsyncPostgresSaver` backed by PostgreSQL 16 checkpoint tables (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`).
    - Automated event loop policy configuration for Windows (`WindowsSelectorEventLoopPolicy`) for non-blocking psycopg async compatibility.
    - Implemented `resume_research_workflow(thread_id, resume_value, checkpointer)` utilizing `Command(resume=...)` to seamlessly resume suspended workflows.
    - Zero VRAM overhead during workflow suspension (no background GPU allocations).
  - **Documentation & Architecture (`docs/ADVANCED_CAPABILITIES.md`)**:
    - Authored comprehensive architecture guide detailing MCP schemas, security guarantees, HITL state transitions, and PostgreSQL checkpoint persistence.
  - **Testing & Verification**:
    - 8 unit tests in `test_mcp_client.py` covering tool discovery, invocation, parameter validation, type mismatches, prompt injection sanitization, timeout enforcement, and registry routing.
    - 8 unit tests in `test_workflow_interrupts.py` covering approval record creation, resolution, pending retrieval, approval gates, and orchestrator routing.
    - 2 live PostgreSQL integration tests in `test_checkpointer_recovery.py`:
      1. `test_postgres_checkpointer_pause_and_resume`: Verified pausing at orchestrator interrupt, writing checkpoint to PostgreSQL `checkpoints` table, and resuming to full report generation.
      2. `test_postgres_checkpointer_reject_and_halt`: Verified rejecting research plan at interrupt routes immediately to `END` with status `REJECTED`.
    - Total backend test suite: **119 passing tests** (103 unit tests, 16 integration tests).
    - Ruff and Mypy passing with **zero errors and zero warnings** across all 68 source files.

### Phase 7: Frontend Integration & Live Streaming (Completed)
- **Status**: `COMPLETED`
- **Timestamp**: 2026-11-15
- **What Was Done**:
  - **FastAPI Research & Document API Endpoints (`backend/app/api/v1/`)**:
    - Created `research.py`:
      - `POST /api/v1/research/sessions`: Initialize research sessions with parameters and persist initial state.
      - `GET /api/v1/research/sessions`: Query user's research sessions sorted by recency.
      - `GET /api/v1/research/sessions/{session_id}`: Fetch detailed session progress and metadata.
      - `GET /api/v1/research/sessions/{session_id}/sources`: Retrieve verified source citations and domain credibility metadata.
      - `GET /api/v1/research/sessions/{session_id}/report`: Fetch compiled synthesis markdown dossier.
      - `POST /api/v1/research/sessions/{session_id}/resume`: Resume paused execution from human review gate.
      - `GET /api/v1/research/sessions/{session_id}/stream`: Real-time Server-Sent Events (SSE) stream broadcasting node lifecycle events (`connected`, `node_update`, `interrupt`, `workflow_complete`, `error`).
    - Created `documents.py`:
      - `POST /api/v1/documents/upload`: Multi-part file upload with PyMuPDF parsing, text chunking, and pgvector embeddings.
      - `GET /api/v1/documents`: List user indexed documents with chunk counts.
      - `GET /api/v1/documents/{id}/chunks`: Inspect indexed vector chunks.
      - `DELETE /api/v1/documents/{id}`: Cascade remove document and its pgvector embeddings.
    - Created `telemetry.py`:
      - `GET /api/v1/system/telemetry`: Probes NVIDIA GeForce RTX 5060 Laptop GPU VRAM, loaded Ollama models, and semaphore queue status.
  - **Frontend Full-Stack Wiring (`frontend/`)**:
    - Built comprehensive typed client in `frontend/src/lib/api.ts` (`researchApi`, `documentsApi`, `systemApi`).
    - Connected `DashboardContent` to live sessions list and research creation dispatch.
    - Connected `NewResearchPage` to create backend sessions with approval gates enabled.
    - Connected `ResearchWorkspacePage` to live SSE event listener (`EventSource`) with dynamic node updates, timeline progress, and interactive resume modal.
    - Connected `DocumentsPage` and `UploadZone` to real file upload and pgvector indexing.
    - Connected `ReportViewerPage` to fetch real report synthesis markdown.
  - **Testing & Production Build**:
    - 6 new integration tests in `test_research_api.py` and `test_documents_api.py`.
    - Total backend test suite: **120 / 120 tests passed**.
    - Frontend: **33 / 33 Vitest tests passed**.
    - Next.js production build: **14 / 14 routes compiled successfully**.
    - Both FastAPI backend (`http://127.0.0.1:8000`) and Next.js standalone frontend (`http://localhost:3000`) verified healthy and live.

---

## Roadmap & Next Phases

| Phase | Description | Status |
|---|---|---|
| **Prompt 0** | Bootstrap (Rules, Skills, Workflows) | **COMPLETED** |
| **Phase 0** | System Analysis, Hardware Audit & Architecture | **COMPLETED** |
| **Phase 1** | Foundation (FastAPI Skeleton, Next.js Shell, Docker Compose) | **COMPLETED** |
| **Phase 2** | LLM Infrastructure (Ollama Provider, Structured JSON, Semaphore) | **COMPLETED** |
| **Phase 3** | Research Agent (Search Provider, PyMuPDF, SSRF Defense) | **COMPLETED** |
| **Phase 4** | Multi-Agent Orchestration (LangGraph, State Machine, Review Loop) | **COMPLETED** |
| **Phase 5** | RAG and Memory (pgvector, HNSW, Ingestion, Citation Verification) | **COMPLETED** |
| **Phase 5B**| Hybrid Search and Reranking (tsvector + pgvector via RRF) | **COMPLETED** |
| **Phase 6** | MCP, Approvals, Resilience (Interrupts, Checkpointer Recovery) | **COMPLETED** |
| **Phase 7** | Frontend Integration & Live Streaming (SSE, Real Backend Wiring) | **COMPLETED** |
| **Phase 8** | Evaluation and Observability (OpenTelemetry, Prometheus, Grafana) | NEXT UP |
| **Phase 9** | CI/CD and Production Docker (GitHub Actions, Multi-Stage Builds) | PENDING |
| **Phase 10**| E2E Tests, Load Tests, MCP Server (Playwright, Locust, MCP Tools) | PENDING |
| **Phase 11**| Final Hardening, Benchmarks and Portfolio Delivery | PENDING |

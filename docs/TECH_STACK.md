# ResearchPilot AI: Technology Stack Specification

## 1. Core Architecture Decisions

| Domain | Technology | Version | Rationale |
|---|---|---|---|
| **Frontend Framework** | Next.js (App Router) | 14.2+ / 15+ | Server-side rendering, React Server Components, file-based routing, native streaming support. |
| **Language (Frontend)** | TypeScript | 5.4+ | Strict mode (`"strict": true`) guarantees end-to-end type safety matching backend Pydantic schemas. |
| **Styling & UI Components**| Tailwind CSS + shadcn/ui | Latest | Utility-first CSS, Radix UI accessibility primitives, modular and responsive dark theme. |
| **Icons & Visuals** | Lucide React | Latest | Clean, consistent SVG iconography. |
| **Backend Framework** | FastAPI | 0.110+ | High-performance async Python framework, automatic OpenAPI documentation, native Pydantic v2 integration. |
| **Language (Backend)** | Python | 3.11+ | Enhanced exception groups, performance speedups, native async runtime. |
| **ORM & Database Driver**| SQLAlchemy + asyncpg | 2.0+ | Modern async ORM syntax (`select`), connection pooling, high-throughput PostgreSQL driver. |
| **Database Migrations** | Alembic | 1.13+ | Version-controlled database schema evolution with async engine support. |
| **Relational Database** | PostgreSQL | 16 (pgvector) | Enterprise ACID compliance, robust relational integrity, native JSONB support. |
| **Vector Extension** | pgvector | 0.7+ | Integrated vector similarity search directly within PostgreSQL using HNSW indexes (`vector(768)`). |
| **In-Memory Cache & Queue**| Redis | 7.2 (Alpine) | Fast task queueing, session caching, rate limiting, and ephemeral pub/sub. |
| **Agent Orchestration** | LangGraph | 0.2+ | Cyclical state graph engine, typed state, PostgreSQL checkpointer, human interrupt/resume. |
| **Local LLM Inference** | Ollama (Host) | Latest | Local-first model serving with GPU acceleration, quantized weights, OpenAI-compatible REST API. |
| **Primary LLM** | `qwen3:8b` (Q4_K_M) | Latest | Superior reasoning, fast token generation, fits inside 8GB VRAM envelope (~5.2GB). |
| **Embedding Model** | `nomic-embed-text` | Latest | 768-dimensional embeddings, 8192 token context window, highly competitive MTEB benchmarks. |
| **Document Parsing** | PyMuPDF (`fitz`) | 1.24+ | Blazing fast C-backed PDF parsing, preserves page offsets for exact citation grounding. |
| **Search Providers** | Tavily / Brave / SearXNG | API v1 | Clean provider abstraction for authorized search APIs; zero scraping of raw SERPs. |
| **Observability** | OpenTelemetry + Prometheus + Grafana | Latest | Distributed tracing with `execution_id` correlation, Prometheus metrics, Grafana dashboards as code. |
| **Testing** | Pytest + Playwright + Locust | Latest | Async backend tests, end-to-end browser automation, and empirical load testing. |
| **Containerization** | Docker & Docker Compose | 29.3+ | Multi-stage container builds, non-root users, isolated bridge networking. |

---

## 2. Dependency Management
- **Backend**: Managed via `pyproject.toml` (PEP 518/621 standard) using `pip` or `uv`.
- **Frontend**: Managed via `package.json` with pinned semver dependencies using `npm`.

---

## 3. Communication Protocols
- **Client to API**: HTTP/2 REST for command-and-control operations.
- **Real-Time Stream**: Server-Sent Events (`text/event-stream`) for unidirectional token and progress streaming.
- **Backend to Local LLM**: Asynchronous HTTP client (`httpx.AsyncClient`) communicating with Ollama REST API (`POST /api/generate`, `POST /api/embeddings`).
- **Checkpointer to DB**: Asynchronous PostgreSQL connection via `asyncpg`.

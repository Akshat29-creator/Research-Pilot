# Project Rules: ResearchPilot AI

## 1. Product Identity & Purpose
- **Product**: ResearchPilot AI is a local-first, multi-agent automated research platform.
- **Core Mission**: Given a user's research question, a coordinated graph of specialized agents searches the web and uploaded documents, evaluates evidence, analyzes contradictions, synthesizes a cited report, reviews factual grounding, and delivers an exportable document.
- **Operating Philosophy**: Privacy-preserving, local-first by default, fully functional offline with local LLMs (Ollama), with optional cloud model support.

## 2. Phase-Based Development Discipline
- **Single-Phase Execution**: Work strictly one phase at a time as defined in the development roadmap.
- **Explicit Approval Gate**: Never start a new phase without the user's explicit written approval.
- **Phase Gate Protocol**: At the conclusion of each phase, execute the `/phase-gate` workflow, document acceptance criteria with real PASS/FAIL evidence, list all modified/created files, highlight known gaps, and halt.

## 3. Truth & Empirical Verification Standard
- **No Unverified Claims**: Never state or assume that code, migrations, services, or agents work without executing them and capturing real command output.
- **No Synthetic Facades / Mock Data in Production Paths**: Never place fake data, hardcoded responses, or stubbed agent executions inside production paths. Mocks and stubs are permissible strictly within isolated unit/contract test suites (`tests/`).
- **No Silent Error Swallowing**: Never use empty `except: pass` or catch-all exception blocks that discard errors. Exceptions must be logged with contextual structured metadata, converted to typed error responses, or propagated cleanly.

## 4. Git & Revision Control Discipline
- **Conventional Commits**: Every commit message must adhere to the Conventional Commits specification:
  - `feat(<scope>): <description>`
  - `fix(<scope>): <description>`
  - `docs(<scope>): <description>`
  - `test(<scope>): <description>`
  - `refactor(<scope>): <description>`
  - `chore(<scope>): <description>`
- **Milestone Commits**: Exactly one atomic commit per verified phase milestone. Do not commit failing code or broken tests.
- **Clean Workspace**: Keep the workspace free of untracked temporary artifacts, scratch dumps, or dangling binaries.

## 5. Architectural Integrity
- **Layered Decoupling**: Enforce strict separation between API transport (`api/v1`), domain services (`services/`), data persistence (`repositories/`, `models/`), agent orchestration (`workflows/`, `agents/`), and external integrations (`integrations/`).
- **Pydantic Validation**: All agent inputs and outputs, API request/response bodies, and configuration schemas must use strict Pydantic v2 models.
- **Database Hygiene**: All database operations must be async (`asyncpg` via SQLAlchemy 2). Schema evolution must happen solely through Alembic migrations.

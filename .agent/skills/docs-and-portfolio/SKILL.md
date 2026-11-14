---
name: docs-and-portfolio
description: Standards for technical documentation, architectural decision records (ADRs), Mermaid diagrams, portfolio artifacts, resume bullet points, demo scripts, and interview Q&A.
---

# Documentation & Portfolio Standards Skill

## When to Use
Use when writing or updating architecture documentation, creating Architecture Decision Records (ADRs), producing Mermaid diagrams, updating the project README, drafting portfolio presentations, or preparing technical interview talking points.

## Core Documentation Principles
- **Clarity & Brevity**: Write crisp, informative, engineering-focused documentation without buzzwords.
- **Visual Architecture**: Accompany text with valid Mermaid diagrams (`flowchart TD`, `sequenceDiagram`, `erDiagram`).
- **Empirical Claims Only**: Never put fabricated claims in portfolio summaries or resume bullets. Every metric must be backed by real benchmark logs.

## Step-by-Step Procedure

### 1. Architecture Decision Records (ADR)
- Store all architectural decisions in `docs/ADR/` following the MADR format:
  ```markdown
  # ADR-00X: Title of Decision

  ## Context and Problem Statement
  What is the technical problem or constraint?

  ## Considered Options
  1. Option A
  2. Option B
  3. Option C

  ## Decision Outcome
  Chosen option: Option A because...

  ## Consequences
  - Positive consequences: ...
  - Negative consequences / trade-offs: ...
  ```

### 2. Mermaid Diagram Formatting
- Flowcharts: Use `flowchart TD` or `flowchart LR`. Quote node labels containing special characters:
  ```mermaid
  flowchart TD
      U["User Client"] -->|"HTTP / SSE"| API["FastAPI Gateway"]
      API -->|"Enqueue Job"| Q["Redis Job Queue"]
      Q -->|"Worker Task"| LG["LangGraph Engine"]
  ```
- Sequence Diagrams: Show agent message flows and approval interrupts clearly.
- ER Diagrams: Map relational tables, primary keys, foreign keys, and vector column attributes.

### 3. Portfolio & Resume Artifacts (`docs/PORTFOLIO.md`)
- Format resume bullet points using the Google X-Y-Z formula:
  *Accomplished [X] as measured by [Y], by doing [Z].*
  - *Example*: "Engineered a local-first multi-agent research platform achieving sub-60s end-to-end report generation with 94% verified citation grounding, leveraging LangGraph sequential state machines and pgvector HNSW indexing on an 8GB VRAM consumer GPU."
- Include:
  - 2-Minute Screen Demo Script: Timed step-by-step walkthrough for recording presentations.
  - Deep-Dive Interview Q&A: 10 challenging engineering questions addressing trade-offs, bottlenecks, failure modes, and VRAM management.

### 4. Technical README Structure
- Badges: CI status, Python version, Next.js version, License.
- System Overview & High-Level Architecture Diagram.
- Hardware requirements (specifying the RTX 5060 8GB constraint).
- Quickstart guide: Step-by-step local launch instructions with Docker Compose and Ollama.
- Environment variable dictionary.

## Verification Checklist
- [ ] All Mermaid diagrams render cleanly without syntax errors.
- [ ] Every ADR documents problem statement, options considered, and trade-offs.
- [ ] Resume bullets cite only empirically verified metrics from real benchmark runs.
- [ ] README provides reproducible setup commands from a clean git clone.
- [ ] Portfolio document contains the 2-minute demo script and interview Q&A.

## Common Mistakes to Avoid
- **Unverified Resume Metrics**: Claiming "improved performance by 80%" without providing benchmark data in `docs/BENCHMARKS.md`.
- **Invalid Mermaid Syntax**: Using unquoted parentheses or reserved characters inside Mermaid node labels.
- **Outdated Setup Guides**: Writing instructions in README that diverge from the actual `docker-compose.yml` or `Makefile`.
- **Superficial Trade-off Analysis**: Claiming a chosen technology has "no downsides."

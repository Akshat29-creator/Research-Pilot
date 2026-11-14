# Research-Pilot

> A local-first, privacy-preserving multi-agent autonomous research platform powered by LangGraph, Ollama, PostgreSQL + pgvector, FastAPI, and Next.js.

## Overview
ResearchPilot AI coordinates a team of specialized AI agents to autonomously investigate user questions:
1. **Orchestrator**: Deconstructs questions into targeted research sub-queries and manages execution flow.
2. **Research Agent**: Queries authorized search APIs (Tavily, Brave, SearXNG) and parses uploaded PDFs with PyMuPDF.
3. **Analysis Agent**: Synthesizes evidence, resolves contradictions, separates facts from assumptions, and identifies gaps.
4. **Writer Agent**: Produces structured Markdown research reports with verifiable citations linked directly to raw evidence.
5. **Reviewer Agent**: Audits factual grounding, citation accuracy, and completeness, enforcing an automated revision loop.

## Hardware Optimization (RTX 5060 8GB VRAM)
Engineered specifically for consumer workstation constraints (Lenovo Legion Pro 5, Ryzen 7 8745HX, RTX 5060 8GB VRAM):
- Single LLM resident in memory at a time.
- Global `asyncio.Semaphore(1)` concurrency limit on local inference.
- Default 4096-token context budget.
- Strict sequential agent pipeline.

## Repository Layout
```
researchpilot-ai/
├── .agent/               # Agent rules, skills, and slash-command workflows
├── backend/              # FastAPI async backend, LangGraph engine, agents
├── frontend/             # Next.js 14+ App Router dark SaaS interface
├── infrastructure/       # PostgreSQL (pgvector), Redis, OTel, Prometheus, Grafana
└── docs/                 # Architecture, ADRs, database design, benchmarks
```

## Progress & Milestones
Refer to [PROGRESS.md](PROGRESS.md) for real-time task status, completed milestones, and changelog.

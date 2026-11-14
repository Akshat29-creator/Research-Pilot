---
name: testing-e2e-load
description: Standards and execution procedures for Playwright end-to-end tests, API contract testing, and Locust/k6 load testing with empirical metric reporting.
---

# E2E & Load Testing Skill

## When to Use
Use when implementing Playwright browser automation tests, executing end-to-end user journeys, conducting API contract tests, or running load/stress tests against the backend and job queue.

## Core Testing Philosophy
- **Real Metrics Only**: Record and report only actual, empirical measurements (p50, p95, p99 latencies, RPS, error percentages).
- **Test Double Isolation**: Test doubles (fake LLM / mock search providers) must strictly be isolated within test environments (`tests/`) and never leak into production code paths.

## Step-by-Step Procedure

### 1. Playwright End-to-End Suite (`frontend/tests/e2e/`)
- Configure `playwright.config.ts` with desktop and mobile viewport configurations.
- Automate critical user journeys:
  1. User registration, login, and JWT persistence.
  2. Submitting a new research query on the dashboard.
  3. Real-time streaming visualization of agent progress.
  4. Human-in-the-loop review: interacting with approval dialogs (approve vs reject).
  5. Inspecting the generated report, expanding inline source citations, and testing Markdown/PDF export.
  6. Deleting session data and confirming removal.

### 2. API Contract Testing
- Validate that FastAPI OpenAPI documentation (`/openapi.json`) matches actual response payloads.
- Test edge cases: malformed JSON bodies (HTTP 422), unauthenticated requests (HTTP 401), accessing resources owned by other users (HTTP 404).

### 3. Load & Concurrency Testing (`backend/loadtests/`)
- Implement load test scenarios using Locust (`locustfile.py`) or k6:
  - **Scenario A (Read-Heavy)**: 50 concurrent users viewing existing reports and dashboard history. Measure p95 read latency and cache hit ratios.
  - **Scenario B (Queue Behavior Under LLM Bottleneck)**: Submit 10 concurrent research workflows. Given the hardware constraint of `asyncio.Semaphore(1)` for local LLM inference, measure:
    - Queue dwell time.
    - Total job completion duration distribution.
    - Worker memory consumption.
    - Event loop responsiveness for non-LLM API traffic.

### 4. Empirical Performance Reporting
- Store raw test outputs in `backend/loadtests/results/load_run_{timestamp}.json`.
- Document key findings in `docs/LOAD_TESTING.md`:
  - Concurrency level, RPS, p50 latency, p95 latency, error percentage.
  - Resource consumption during test (CPU utilization, GPU memory, RAM).

## Verification Checklist
- [ ] Playwright E2E suite runs in CI and passes all critical user journeys.
- [ ] Test doubles used in automated E2E tests are strictly isolated from production code.
- [ ] Manual smoke test script available for testing against live local Ollama.
- [ ] Load tests accurately measure queue delay under single-LLM concurrency limit.
- [ ] Real empirical latency percentiles recorded and documented.

## Common Mistakes to Avoid
- **Flaky E2E Selectors**: Using brittle XPath or CSS selectors tied to layout markup instead of accessible `getByRole` or `getByTestId`.
- **Faking Benchmark Results**: Projecting theoretical capacity instead of running actual load tests and documenting real measurements.
- **Ignoring Concurrency Queuing**: Assuming all 10 jobs execute in parallel when local hardware restricts execution to sequential processing.
- **Leaking Mocks into Production**: Setting mock flags in production environment variables or configuration files.

# Code Review Workflow (`/code-review`)

## Purpose
Act as a strict Principal AI and Systems Engineer. Perform an uncompromising review of recent code changes to identify architectural flaws, code duplication, security holes, async concurrency bugs, database inefficiencies, missing error boundaries, or inadequate test coverage.

## Review Dimensions

1. **Architecture & Design**:
   - Strict adherence to layered architecture (API -> Service -> Repository).
   - Clean boundaries between agent logic, prompts, and tool abstractions.
   - Elimination of dead code, unnecessary abstractions, or premature optimization.

2. **Async & Concurrency Safety**:
   - Absence of blocking I/O calls inside `async def` functions (e.g. blocking file reads, non-async HTTP clients, synchronous DB drivers).
   - Correct enforcement of `asyncio.Semaphore(1)` for Ollama local inference.
   - Clean task cancellation and timeout handling.

3. **Database & Data Access**:
   - Zero N+1 query patterns; appropriate use of `joinedload` / `selectinload`.
   - Index support for high-frequency queries and vector similarity (`HNSW`).
   - Transaction boundary correctness (`commit` vs `rollback`).

4. **Security & Input Sanitization**:
   - Strict tenant isolation: every query scoped by authenticated `user_id`.
   - Zero hardcoded secrets or sensitive tokens.
   - Untrusted web/PDF inputs wrapped in XML delimiters and stripped of injection markers.
   - SSRF defenses on external network fetches.

5. **Error Handling & Resilience**:
   - No silent `except: pass` or unlogged exceptions.
   - Bounded retries (never unbounded loops).
   - Meaningful structured error responses and logging.

6. **Test Completeness**:
   - Meaningful assertions verifying real behavior (no tautological `assert True`).
   - Negative paths tested (unauthorized access, malformed inputs, timeouts, model outages).

## Step-by-Step Procedure
1. Inspect git diff of recent changes:
   ```bash
   git diff HEAD~1
   ```
2. Identify issues and categorize by severity:
   - **CRITICAL**: Security vulnerability, data loss risk, OOM crash, unauthenticated data leak.
   - **HIGH**: Performance bottleneck, async event loop blocking, missing error handling on primary path.
   - **MEDIUM**: Code duplication, missing unit test coverage, architectural boundary bleed.
   - **LOW**: Style inconsistency, naming ambiguity, documentation typo.
3. Surgically fix CRITICAL and HIGH issues immediately.
4. Re-run tests to prove fixes did not introduce regressions:
   ```bash
   pytest -v backend/tests/
   ```
5. Report the audit findings, fixes applied, and verification test outputs.

# Phase Gate Workflow (`/phase-gate`)

## Purpose
The Phase Gate workflow is the mandatory formal checkpoint executed at the conclusion of every phase. It guarantees that the phase's implementation meets all acceptance criteria with empirical proof, ensures zero regressions, documents changes, and halts execution until explicit user approval is granted.

## Step-by-Step Execution Procedure

### Step 1: Pre-Flight Environment & Services Verification
1. Verify database and cache services are healthy:
   ```bash
   docker compose ps
   ```
2. Verify local Ollama daemon status and active models:
   ```bash
   ollama list
   ```

### Step 2: Automated Quality & Integrity Suite
1. Run backend linting and code formatting checks:
   ```bash
   ruff check backend/
   ruff format --check backend/
   ```
2. Run backend static type inspection:
   ```bash
   mypy backend/
   ```
3. Run backend test suite (unit, integration, and contract tests):
   ```bash
   pytest -v backend/tests/
   ```
4. Run frontend type-check and linter:
   ```bash
   npm --prefix frontend run lint
   npm --prefix frontend run type-check
   ```
5. Run frontend unit/component tests:
   ```bash
   npm --prefix frontend test
   ```

### Step 3: Migration & Schema Consistency Audit
1. Confirm Alembic migrations are up to date and match model metadata:
   ```bash
   alembic -c backend/alembic.ini check
   ```

### Step 4: Acceptance Criteria Verification
Compile an Acceptance Matrix mapping every criterion defined in the phase prompt to real command output or execution logs:
- **Criterion [N]**: Description
  - **Status**: `PASS` or `FAIL`
  - **Empirical Evidence**: Command output excerpt, test assertion, or HTTP response snippet.

### Step 5: Deliverables & Change Summary
1. List all files modified or created during the phase.
2. Document any known limitations, deferred items, or edge-case gaps.
3. Update relevant documentation in `docs/` and `.env.example` if applicable.

### Step 6: Mandatory Halt for User Approval
- **STOP AND WAIT**: Output the complete Phase Gate Report to the user.
- Explicitly state: *"All acceptance criteria verified. Awaiting your approval before proceeding to the next phase."*
- **DO NOT** execute or start the next phase until the user provides unambiguous approval.

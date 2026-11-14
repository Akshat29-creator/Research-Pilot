# Release Check Workflow (`/release-check`)

## Purpose
Perform a complete end-to-end verification of ResearchPilot AI from a pristine, clean-slate environment to validate production readiness before tagging a release.

## Execution Procedure

### Step 1: Clean-Slate Container Deployment
1. Bring down all existing containers and clean volumes:
   ```bash
   docker compose down -v
   ```
2. Rebuild and launch all service containers from clean state:
   ```bash
   docker compose up -d --build
   ```
3. Verify all container health checks report healthy:
   ```bash
   docker compose ps
   ```

### Step 2: Database Initialization & Migration
1. Apply all pending Alembic migrations:
   ```bash
   docker compose exec backend alembic upgrade head
   ```
2. Verify PostgreSQL tables and pgvector HNSW indexes exist:
   ```bash
   docker compose exec postgres psql -U postgres -d researchpilot -c "\dt"
   ```

### Step 3: Service Health & Readiness Probe
1. Check readiness endpoint:
   ```bash
   curl -s http://localhost:8000/api/v1/ready | jq .
   ```
2. Confirm PostgreSQL is connected (`"database": "healthy"`).
3. Confirm Redis is connected (`"redis": "healthy"`).
4. Confirm host Ollama instance is reachable (`"ollama": "healthy"`).

### Step 4: Real End-to-End Multi-Agent Research Execution
1. Register a test user and obtain JWT token:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@researchpilot.ai","password":"TestPassword123!"}' | jq -r .access_token)
   ```
2. Submit a real research question:
   ```bash
   SESSION_ID=$(curl -s -X POST http://localhost:8000/api/v1/research \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query":"What are the primary differences between HNSW and IVFFlat vector indexing in pgvector?"}' | jq -r .session_id)
   ```
3. Monitor execution through completion.
4. Verify:
   - External search retrieved real sources with valid HTTP URLs.
   - Evidence quotes are grounded in retrieved text.
   - Writer synthesizes Markdown report with citations.
   - Reviewer agent validates claims and issues PASS verdict.
   - Final report is persisted in PostgreSQL.

### Step 5: Document Export Verification
1. Export final report as Markdown:
   ```bash
   curl -s http://localhost:8000/api/v1/reports/$SESSION_ID/export?format=markdown -H "Authorization: Bearer $TOKEN" -o report_export.md
   ```
2. Export final report as PDF and verify document rendering:
   ```bash
   curl -s http://localhost:8000/api/v1/reports/$SESSION_ID/export?format=pdf -H "Authorization: Bearer $TOKEN" -o report_export.pdf
   ```

### Step 6: Log & Error Inspection
1. Inspect container logs for unexpected errors or unhandled exceptions:
   ```bash
   docker compose logs backend | grep -i "error"
   ```
2. Confirm zero critical errors or unhandled tracebacks.

### Step 7: Final Release Sign-Off
- Present the final verification summary with logs and generated report sample.
- Tag git release with conventional version bump (e.g. `v1.0.0`).

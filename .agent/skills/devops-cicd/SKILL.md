---
name: devops-cicd
description: Standards and configurations for GitHub Actions CI/CD workflows, multi-stage hardened Dockerfiles, pre-commit hooks, Dependabot, and production container orchestration.
---

# DevOps, CI/CD & Container Hardening Skill

## When to Use
Use when configuring GitHub Actions pipelines, writing or updating Dockerfiles, maintaining `docker-compose.yml`, setting up pre-commit hooks, or hardening production container environments.

## Container & CI Principles
- **Multi-Stage Builds**: Separate build-time dependencies from minimal runtime environments.
- **Unprivileged Non-Root Execution**: Never run application containers as `root`. Use a dedicated non-root user (`nobody` or `appuser`).
- **Strict Version Pinning**: Pin all base images to specific sha256 digests or exact semver tags. Never use `latest`.
- **Fast, Deterministic CI**: Leverage layer caching and parallel jobs for linting, type-checking, and testing.

## Step-by-Step Procedure

### 1. GitHub Actions Workflows (`.github/workflows/`)
Create modular, targeted workflows:
- **`ci.yml`**:
  - Backend job: Python 3.11 setup, cache pip, `ruff check`, `ruff format --check`, `mypy`, `pytest` with PostgreSQL+pgvector and Redis service containers.
  - Frontend job: Node 20 setup, cache npm, `npm run lint`, `tsc --noEmit`, unit tests, `npm run build`.
- **`docker-build.yml`**:
  - Build backend and frontend images using Buildx and GitHub layer caching.
  - Scan built images for CVEs using Trivy. Fail the pipeline on critical vulnerabilities.
- **`security.yml`**:
  - Run `pip-audit`, `npm audit`, and Gitleaks secret detection.

### 2. Multi-Stage Dockerfile Patterns
- **Backend Dockerfile (`backend/Dockerfile`)**:
  ```dockerfile
  # Build stage
  FROM python:3.11-slim AS builder
  WORKDIR /build
  RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
  COPY pyproject.toml .
  RUN pip install --no-cache-dir --user -e .

  # Final runtime stage
  FROM python:3.11-slim AS runtime
  RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -s /bin/bash -m appuser
  WORKDIR /app
  COPY --from=builder /root/.local /home/appuser/.local
  COPY --chown=appuser:appgroup app /app/app
  COPY --chown=appuser:appgroup alembic /app/alembic
  COPY --chown=appuser:appgroup alembic.ini /app/
  USER appuser
  ENV PATH=/home/appuser/.local/bin:$PATH
  EXPOSE 8000
  HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1
  CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```

### 3. Docker Compose Configuration
- Standard development (`docker-compose.yml`):
  - `postgres`: `pgvector/pgvector:pg16` with persistent volume.
  - `redis`: `redis:7-alpine`.
  - `backend`: mounted source code for hot reload.
  - `frontend`: Next.js development server.
- Host Network / Ollama connectivity:
  - On Linux/WSL2, use `extra_hosts: ["host.docker.internal:host-gateway"]` to reach host Ollama on port 11434.

### 4. Pre-Commit Hooks (`.pre-commit-config.yaml`)
- Configure hooks for Ruff (formatting and linting), Mypy, ESLint, Prettier, trailing whitespace removal, and secret scanning with Gitleaks.

## Verification Checklist
- [ ] Dockerfiles use multi-stage builds and run as non-root user.
- [ ] Healthchecks configured on all service containers.
- [ ] `.dockerignore` prevents copying virtual environments, `.git`, `.env`, and tests into images.
- [ ] CI pipeline validates formatting, types, unit tests, and security scans on pull requests.
- [ ] Pre-commit hooks run cleanly on staged files.

## Common Mistakes to Avoid
- **Running Containers as Root**: Leaving default `USER root`, allowing potential container escape vulnerabilities.
- **Using `latest` Image Tags**: Unpredictable builds due to floating upstream base image versions.
- **Baking Secrets into Docker Images**: Accidentally copying `.env` during `COPY . .`. Always maintain a strict `.dockerignore`.
- **Bloated Docker Images**: Leaving compilation tools (`gcc`, build-essential) in the final runtime container image.

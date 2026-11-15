.PHONY: up down migrate test lint dev clean build ci eval observability

# Bring up complete Docker Compose infrastructure
up:
	docker compose up -d

# Stop and remove Docker Compose containers
down:
	docker compose down

# Run database migrations with Alembic
migrate:
	cd backend && alembic upgrade head

# Run full test suite across backend and frontend
test:
	cd backend && pytest -v tests/unit/
	cd frontend && npm test -- --run

# Run code linters and type checkers
lint:
	cd backend && ruff check app/ eval/ tests/
	cd backend && ruff format --check app/ eval/ tests/
	cd backend && mypy app/
	cd frontend && npm run lint

# Build production container images
build:
	docker compose build

# Run end-to-end local CI validation
ci: lint test
	cd frontend && npm run build

# Run automated evaluation benchmark suite
eval:
	cd backend && python -m eval.run_eval --limit 2 --mock-search

# Launch Prometheus & Grafana observability stack
observability:
	docker compose -f infrastructure/observability/docker-compose.observability.yml up -d

# Start local development servers
dev:
	@echo "Starting local infrastructure..."
	docker compose up -d postgres redis searxng
	@echo "Local services ready. Run backend with: cd backend && uvicorn app.main:app --reload"
	@echo "Run frontend with: cd frontend && npm run dev"

# Clean up dangling caches and containers
clean:
	docker compose down -v
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +

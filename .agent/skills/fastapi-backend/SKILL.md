---
name: fastapi-backend
description: Standards and procedures for building async FastAPI services with a layered architecture, SQLAlchemy 2 async, Alembic, Pydantic v2, dependency injection, and pytest.
---

# FastAPI Backend Engineering Skill

## When to Use
Activate this skill when creating, modifying, testing, or refactoring the backend API, database layer, background workers, or service business logic in ResearchPilot AI.

## Architecture Pattern
Enforce strict three-tier layered separation:
1. **API Transport Layer (`app/api/v1/`)**: HTTP routing, request deserialization, status codes, dependency injection (`Depends`). No business logic or raw SQL queries here.
2. **Service Layer (`app/services/`)**: Core application logic, transaction orchestration, agent triggers, validation rules.
3. **Repository / Data Layer (`app/repositories/`, `app/models/`)**: SQLAlchemy 2 async queries (`select`, `insert`), database models, database session lifecycle.

## Step-by-Step Procedure

### 1. Model & Schema Definitions
- Define SQLAlchemy models in `app/models/` inheriting from `app.database.base.Base`. Use `mapped_column` with explicit type annotations.
- Define request and response schemas in `app/schemas/` using Pydantic v2 (`BaseModel`, `ConfigDict(from_attributes=True)`).
- Use strict field validations (`Field(...)`, regex constraints, bounds).

### 2. Database Migrations with Alembic
- Ensure `alembic.ini` and `alembic/env.py` use the async database engine (`create_async_engine`) and import all models to `Base.metadata`.
- Generate migrations with descriptive names:
  ```bash
  alembic revision --autogenerate -m "create_research_sessions_table"
  ```
- Always inspect the generated migration file before running `alembic upgrade head`.

### 3. Repository Layer Implementation
- Inject `AsyncSession` into repository classes.
- Use explicit async statements:
  ```python
  stmt = select(ResearchSession).where(
      ResearchSession.id == session_id,
      ResearchSession.user_id == user_id
  )
  result = await db.execute(stmt)
  return result.scalar_one_or_none()
  ```

### 4. Dependency Injection & Authentication
- Use `app/core/deps.py` for dependencies:
  - `get_db()`: Async database session generator yielding an `AsyncSession`.
  - `get_current_user()`: Decodes JWT Bearer token and verifies user existence in database.

### 5. Error Handling & Structured Logging
- Implement a global exception handler in `app/core/errors.py` mapping custom application exceptions (`AppException`, `EntityNotFoundError`, `AuthorizationError`) to standard JSON envelopes:
  ```json
  {
    "error": {
      "code": "ENTITY_NOT_FOUND",
      "message": "Research session with id 'xyz' was not found",
      "details": {}
    },
    "request_id": "req-uuid"
  }
  ```
- Middleware must inject a unique `X-Request-ID` into request state and logging context.

### 6. Automated Testing
- Use `pytest`, `pytest-asyncio`, and `httpx.AsyncClient` with an async test database fixture.
- Test happy paths, validation failures (HTTP 422), unauthorized access (HTTP 401/403), and resource not found (HTTP 404).

## Verification Checklist
- [ ] Layered architecture respected: No SQL in route handlers.
- [ ] SQLAlchemy 2 async patterns used everywhere (`await session.execute()`).
- [ ] All API responses type-annotated with Pydantic response models.
- [ ] Database migrations generated and verified cleanly.
- [ ] Endpoints protected with authentication and user ownership filters.
- [ ] Unit and integration tests pass with 100% real assertion output.

## Common Mistakes to Avoid
- **Blocking I/O in Async Routes**: Using standard `open()`, synchronous `requests`, or non-async database drivers blocks the event loop. Always use `aiofiles`, `httpx.AsyncClient`, and `asyncpg`.
- **Missing `user_id` Filters**: Querying models by ID without validating `model.user_id == current_user.id` causes cross-tenant authorization leaks.
- **Pydantic v1 Syntax**: Do not use `.dict()` or `schema_extra`. Use Pydantic v2 `.model_dump()` and `json_schema_extra`.
- **Silent Exception Swallowing**: Catching generic `Exception` without re-raising or logging with traceback.

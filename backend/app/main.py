import asyncio
import sys
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.api.v1 import api_v1_router
from app.core.config import settings
from app.core.errors import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
)
from app.core.logging import setup_logging
from app.core.telemetry.otel import init_tracer


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup validation & telemetry setup
    setup_logging(settings.LOG_LEVEL)
    init_tracer()
    # Yield control to the application
    yield
    # Shutdown logic
    pass


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="0.1.0",
        description="Local-first multi-agent research platform",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Middleware: Request ID and Timing
    @app.middleware("http")
    async def request_id_and_timing_middleware(request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = req_id
        start_time = time.perf_counter()

        response = await call_next(request)

        process_time = time.perf_counter() - start_time
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        return response

    # Safe CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )

    # Register Exception Handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Mount Prometheus Scrape Endpoint
    @app.get("/metrics", tags=["Observability"], include_in_schema=False)
    async def metrics_endpoint():
        """Expose Prometheus formatted metrics for operational scrapers."""
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

    # Mount API Routers
    app.include_router(api_v1_router)

    # Instrument FastAPI with OpenTelemetry
    FastAPIInstrumentor.instrument_app(app)

    return app


app = create_application()

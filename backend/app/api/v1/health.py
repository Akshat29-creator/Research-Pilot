from typing import Dict, List

import httpx
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db
from app.schemas.health import HealthResponse, ReadyResponse, ServiceCheck

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", version="0.1.0")


@router.get("/ready", response_model=ReadyResponse, summary="Readiness probe")
async def readiness_check(db: AsyncSession = Depends(get_db)) -> JSONResponse:
    checks: Dict[str, ServiceCheck] = {}
    warnings: List[str] = []
    is_critical_healthy = True

    # 1. PostgreSQL Database Check
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = ServiceCheck(status="healthy", message="Connected to PostgreSQL")
    except Exception as e:
        is_critical_healthy = False
        checks["database"] = ServiceCheck(status="unhealthy", message=f"PostgreSQL error: {str(e)}")

    # 2. Redis Cache Check
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2.0)
        await redis_client.ping()
        await redis_client.aclose()
        checks["redis"] = ServiceCheck(status="healthy", message="Connected to Redis")
    except Exception as e:
        is_critical_healthy = False
        checks["redis"] = ServiceCheck(status="unhealthy", message=f"Redis error: {str(e)}")

    # 3. Host Ollama Check & VRAM Telemetry
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            tags_resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if tags_resp.status_code == 200:
                checks["ollama"] = ServiceCheck(status="healthy", message="Ollama daemon reachable")

                # Check active models and VRAM via /api/ps
                ps_resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/ps")
                if ps_resp.status_code == 200:
                    ps_data = ps_resp.json()
                    models = ps_data.get("models", [])
                    has_spill = False
                    for m in models:
                        size = m.get("size", 0)
                        size_vram = m.get("size_vram", 0)
                        if size > 0 and size_vram < size:
                            has_spill = True
                            vram_mb = size_vram // (1024 * 1024)
                            tot_mb = size // (1024 * 1024)
                            warnings.append(
                                f"Model '{m.get('name')}' is partially offloaded to CPU RAM "
                                f"({vram_mb}MB / {tot_mb}MB)."
                            )

                    if has_spill:
                        checks["vram"] = ServiceCheck(
                            status="degraded",
                            message="VRAM capacity constrained; layers offloaded to system memory.",
                            details={"running_models": len(models)},
                        )
                    else:
                        checks["vram"] = ServiceCheck(
                            status="healthy",
                            message="VRAM allocation healthy (no layer offloading detected).",
                            details={"running_models": len(models)},
                        )
                else:
                    checks["vram"] = ServiceCheck(
                        status="unknown", message="Could not query Ollama /api/ps"
                    )
            else:
                checks["ollama"] = ServiceCheck(
                    status="unhealthy", message=f"Ollama returned HTTP {tags_resp.status_code}"
                )
                warnings.append(f"Ollama returned status {tags_resp.status_code}")
    except Exception as e:
        checks["ollama"] = ServiceCheck(
            status="unreachable",
            message=f"Host Ollama unreachable at {settings.OLLAMA_BASE_URL}: {str(e)}",
        )
        checks["vram"] = ServiceCheck(
            status="unknown", message="VRAM check skipped because Ollama is unreachable"
        )
        warnings.append(
            "Ollama is offline. LLM-powered multi-agent research features will be unavailable."
        )

    # 4. Determine overall readiness status
    if not is_critical_healthy:
        overall_status = "unhealthy"
        http_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif warnings or any(
        c.status == "degraded" or c.status == "unreachable" for c in checks.values()
    ):
        overall_status = "degraded"
        http_code = status.HTTP_200_OK
    else:
        overall_status = "healthy"
        http_code = status.HTTP_200_OK

    return JSONResponse(
        status_code=http_code,
        content={
            "status": overall_status,
            "checks": {k: v.model_dump() for k, v in checks.items()},
            "warnings": warnings,
        },
    )

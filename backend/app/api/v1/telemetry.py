import logging
from typing import List

import httpx
from fastapi import APIRouter

from app.core.config import settings
from app.integrations.llm.semaphore import get_semaphore_telemetry
from app.schemas.telemetry import GpuTelemetryResponse

logger = logging.getLogger("researchpilot.api.telemetry")
router = APIRouter(prefix="/system", tags=["System Telemetry"])


@router.get("/telemetry", response_model=GpuTelemetryResponse)
async def get_system_telemetry() -> GpuTelemetryResponse:
    """Retrieve real-time GPU VRAM, loaded model states, and inference concurrency telemetry."""
    total_vram_mb = 8151.0
    used_vram_mb = 0.0
    loaded_models: List[str] = []

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/ps")
            if resp.status_code == 200:
                data = resp.json()
                for m in data.get("models", []):
                    model_name = m.get("name", "unknown")
                    size_vram = m.get("size_vram", 0)
                    used_vram_mb += size_vram / (1024 * 1024)
                    loaded_models.append(model_name)
    except Exception as e:
        logger.debug("Ollama /api/ps probe failed: %s", e)

    sem_stats = get_semaphore_telemetry()
    active = int(sem_stats.get("active_acquisitions", 0))
    waiting = int(sem_stats.get("waiting_requests", 0))

    free_vram_mb = max(0.0, total_vram_mb - used_vram_mb)

    return GpuTelemetryResponse(
        device_name="NVIDIA GeForce RTX 5060 Laptop GPU",
        total_vram_mb=round(total_vram_mb, 1),
        used_vram_mb=round(used_vram_mb, 1),
        free_vram_mb=round(free_vram_mb, 1),
        loaded_models=loaded_models,
        concurrency_active=active,
        concurrency_waiting=waiting,
        safe_headroom_mb=6144.0,
    )

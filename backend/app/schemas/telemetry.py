from typing import List

from pydantic import BaseModel, Field


class GpuTelemetryResponse(BaseModel):
    device_name: str = "NVIDIA GeForce RTX 5060 Laptop GPU"
    total_vram_mb: float = 8151.0
    used_vram_mb: float = Field(default=0.0)
    free_vram_mb: float = Field(default=8151.0)
    loaded_models: List[str] = Field(default_factory=list)
    concurrency_active: int = Field(default=0)
    concurrency_waiting: int = Field(default=0)
    safe_headroom_mb: float = 6144.0

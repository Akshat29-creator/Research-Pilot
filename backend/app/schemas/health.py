from typing import Any, Dict, List

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field("ok", description="Liveness status")
    version: str = Field("0.1.0", description="API version")


class ServiceCheck(BaseModel):
    status: str = Field(
        ..., description="Service status: healthy, unhealthy, degraded, unreachable"
    )
    message: str | None = None
    details: Dict[str, Any] | None = None


class ReadyResponse(BaseModel):
    status: str = Field(..., description="Overall readiness: healthy, degraded, or unhealthy")
    checks: Dict[str, ServiceCheck] = Field(..., description="Component readiness results")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal operational warnings")

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.health import router as health_router
from app.api.v1.research import router as research_router
from app.api.v1.telemetry import router as telemetry_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(research_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(telemetry_router)

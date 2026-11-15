from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "ResearchPilot AI"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Security & JWT
    JWT_SECRET_KEY: str = "change-this-in-production-secret-key-at-least-32-chars-long"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # PostgreSQL & pgvector
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/researchpilot"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Ollama Host Inference
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    PRIMARY_MODEL: str = "qwen2.5:3b"
    EMBEDDING_MODEL: str = "nomic-embed-text"
    LLM_CONTEXT_WINDOW: int = 4096
    VRAM_WARN_THRESHOLD_MB: int = 4000

    # Search Provider
    SEARCH_PROVIDER: str = "searxng"
    SEARXNG_BASE_URL: str = "http://localhost:8080"
    TAVILY_API_KEY: str | None = None
    BRAVE_API_KEY: str | None = None

    # CORS
    CORS_ORIGINS: List[str] | str = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()

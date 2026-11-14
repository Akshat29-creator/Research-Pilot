from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Dict, List, Type, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T", bound=BaseModel)


class LLMResponse(BaseModel):
    """Normalized response container from any LLM provider invocation."""

    content: str = Field(description="Generated text response from the model.")
    model: str = Field(description="Model identifier that produced the response.")
    prompt_tokens: int = Field(default=0, description="Tokens evaluated in prompt.")
    completion_tokens: int = Field(default=0, description="Tokens generated in completion.")
    total_tokens: int = Field(default=0, description="Sum of prompt and completion tokens.")
    duration_ms: float = Field(default=0.0, description="Execution duration in milliseconds.")
    time_to_first_token_ms: float | None = Field(
        default=None, description="Latency to first generated token in milliseconds for streams."
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Provider-specific metrics and debug data."
    )


class ProviderHealth(BaseModel):
    """Detailed health probe payload for an LLM provider."""

    is_healthy: bool = Field(description="Whether the provider daemon is reachable and responding.")
    model_available: bool = Field(
        description="Whether the target model is present and ready for inference."
    )
    vram_allocated_mb: int | None = Field(
        default=None, description="Current VRAM footprint in MiB allocated to the model."
    )
    total_vram_mb: int | None = Field(
        default=None, description="Total GPU VRAM in MiB detected on host system."
    )
    has_cpu_spill: bool = Field(
        default=False, description="Whether model layers have spilled over into host CPU RAM."
    )
    message: str = Field(description="Human-readable summary of provider health status.")
    details: Dict[str, Any] = Field(default_factory=dict, description="Raw probe details.")


class LLMProvider(ABC):
    """Abstract base class establishing the contract for all LLM providers in ResearchPilot AI."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system: str | None = None,
        options: Dict[str, Any] | None = None,
    ) -> LLMResponse:
        """Execute a text generation prompt and return normalized LLMResponse."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        system: str | None = None,
        options: Dict[str, Any] | None = None,
    ) -> T:
        """Execute a prompt and validate against target Pydantic schema with 1-shot repair."""
        pass

    @abstractmethod
    def stream(
        self,
        prompt: str,
        system: str | None = None,
        options: Dict[str, Any] | None = None,
    ) -> AsyncIterator[str]:
        """Stream generated text tokens asynchronously."""
        pass

    @abstractmethod
    async def check_health(self) -> ProviderHealth:
        """Inspect provider liveness, model presence, and VRAM layer offloading."""
        pass


class EmbeddingProvider(ABC):
    """Abstract base class for vector embedding generation."""

    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Compute normalized float embedding vector for a single text string."""
        pass

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Compute normalized embedding vectors for a batch of text strings."""
        pass

    @abstractmethod
    async def check_health(self) -> ProviderHealth:
        """Inspect embedding provider liveness and model availability."""
        pass

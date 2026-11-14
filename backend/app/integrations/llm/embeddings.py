import logging
from typing import Any, Dict, List

import httpx

from app.core.config import settings
from app.integrations.llm.base import EmbeddingProvider, ProviderHealth
from app.integrations.llm.exceptions import (
    LLMConnectionError,
    LLMModelNotFoundError,
    LLMTimeoutError,
)
from app.integrations.llm.semaphore import acquire_llm_slot

logger = logging.getLogger("researchpilot.llm.embeddings")


class OllamaEmbeddingProvider(EmbeddingProvider):
    """Local embedding provider powered by Ollama nomic-embed-text (768-dim vectors)."""

    def __init__(
        self,
        base_url: str | None = None,
        model_name: str | None = None,
        timeout: float = 60.0,
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.timeout = timeout

    async def embed_text(self, text: str) -> List[float]:
        """Compute normalized float embedding vector for a single text string."""
        if not text:
            # Avoid sending blank requests; use space or empty string representation
            text = " "

        async with acquire_llm_slot():
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    # Prefer modern /api/embed endpoint
                    resp = await client.post(
                        f"{self.base_url}/api/embed",
                        json={"model": self.model_name, "input": text},
                    )

                    if resp.status_code == 404:
                        # Fallback to legacy /api/embeddings endpoint
                        resp = await client.post(
                            f"{self.base_url}/api/embeddings",
                            json={"model": self.model_name, "prompt": text},
                        )
                        if resp.status_code == 404:
                            raise LLMModelNotFoundError(self.model_name)
                        resp.raise_for_status()
                        return resp.json().get("embedding", [])

                    resp.raise_for_status()
                    data = resp.json()
                    embeddings = data.get("embeddings", [])
                    if embeddings and isinstance(embeddings, list):
                        return embeddings[0]
                    return []

            except httpx.ConnectError as e:
                logger.error("Failed to connect to host Ollama at %s: %s", self.base_url, str(e))
                raise LLMConnectionError(
                    message=f"Host Ollama daemon unreachable at {self.base_url}.",
                    details={"url": self.base_url, "error": str(e)},
                ) from e

            except (TimeoutError, httpx.TimeoutException) as e:
                logger.error(
                    "Embedding generation timed out after %.1fs for model %s",
                    self.timeout,
                    self.model_name,
                )
                raise LLMTimeoutError(
                    timeout_seconds=self.timeout, model_name=self.model_name
                ) from e

            except httpx.HTTPStatusError as e:
                logger.error(
                    "Ollama returned HTTP error %d: %s", e.response.status_code, e.response.text
                )
                raise LLMConnectionError(
                    message=f"Ollama returned HTTP status {e.response.status_code}.",
                    details={"status_code": e.response.status_code, "body": e.response.text[:200]},
                ) from e

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Compute normalized embedding vectors for a batch of text strings."""
        if not texts:
            return []

        # Sanitize empty strings
        clean_texts = [t if t.strip() else " " for t in texts]

        async with acquire_llm_slot():
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(
                        f"{self.base_url}/api/embed",
                        json={"model": self.model_name, "input": clean_texts},
                    )

                    if resp.status_code == 404:
                        # Fallback: sequential calls to /api/embeddings
                        logger.info(
                            "Ollama /api/embed returned 404, falling back to legacy /api/embeddings"
                        )
                        results: List[List[float]] = []
                        for item in clean_texts:
                            item_resp = await client.post(
                                f"{self.base_url}/api/embeddings",
                                json={"model": self.model_name, "prompt": item},
                            )
                            if item_resp.status_code == 404:
                                raise LLMModelNotFoundError(self.model_name)
                            item_resp.raise_for_status()
                            results.append(item_resp.json().get("embedding", []))
                        return results

                    resp.raise_for_status()
                    data = resp.json()
                    return data.get("embeddings", [])

            except httpx.ConnectError as e:
                logger.error("Failed to connect to host Ollama at %s: %s", self.base_url, str(e))
                raise LLMConnectionError(
                    message=f"Host Ollama daemon unreachable at {self.base_url}.",
                    details={"url": self.base_url, "error": str(e)},
                ) from e

            except (TimeoutError, httpx.TimeoutException) as e:
                logger.error(
                    "Batch embedding timed out after %.1fs for model %s",
                    self.timeout,
                    self.model_name,
                )
                raise LLMTimeoutError(
                    timeout_seconds=self.timeout, model_name=self.model_name
                ) from e

            except httpx.HTTPStatusError as e:
                logger.error(
                    "Ollama returned HTTP error %d: %s", e.response.status_code, e.response.text
                )
                raise LLMConnectionError(
                    message=f"Ollama returned HTTP status {e.response.status_code}.",
                    details={"status_code": e.response.status_code, "body": e.response.text[:200]},
                ) from e

    async def check_health(self) -> ProviderHealth:
        """Inspect embedding provider liveness and model availability."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                tags_resp = await client.get(f"{self.base_url}/api/tags")
                tags_resp.raise_for_status()
                tags_data = tags_resp.json()

                installed_models = [m.get("name", "") for m in tags_data.get("models", [])]
                model_base = self.model_name.split(":")[0]
                model_found = any(
                    m == self.model_name or m.startswith(f"{model_base}:") for m in installed_models
                )

                ps_resp = await client.get(f"{self.base_url}/api/ps")
                loaded_models = (
                    ps_resp.json().get("models", []) if ps_resp.status_code == 200 else []
                )

                loaded_info: Dict[str, Any] | None = None
                for lm in loaded_models:
                    if lm.get("name") == self.model_name or lm.get("name", "").startswith(
                        f"{model_base}:"
                    ):
                        loaded_info = lm
                        break

                vram_allocated_mb = None
                if loaded_info and "size_vram" in loaded_info:
                    vram_allocated_mb = int(loaded_info["size_vram"] / (1024 * 1024))

                return ProviderHealth(
                    is_healthy=True,
                    model_available=model_found,
                    vram_allocated_mb=vram_allocated_mb,
                    has_cpu_spill=False,
                    message=(
                        f"Ollama embedding provider healthy. Model '{self.model_name}' "
                        f"{'available' if model_found else 'NOT installed'}."
                    ),
                    details={
                        "installed_models": installed_models,
                        "loaded_model": loaded_info,
                    },
                )
        except Exception as e:
            logger.warning("Embedding health check failed: %s", str(e))
            return ProviderHealth(
                is_healthy=False,
                model_available=False,
                message=f"Embedding provider unreachable: {str(e)}",
                details={"error": str(e)},
            )

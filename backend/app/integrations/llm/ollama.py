import json
import logging
import time
from typing import Any, AsyncIterator, Dict, List, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.integrations.llm.base import LLMProvider, LLMResponse, ProviderHealth
from app.integrations.llm.exceptions import (
    LLMConnectionError,
    LLMModelNotFoundError,
    LLMStructuredOutputError,
    LLMTimeoutError,
)
from app.integrations.llm.semaphore import acquire_llm_slot
from app.integrations.llm.structured import (
    extract_json_string,
    format_repair_prompt,
    format_schema_prompt,
    strip_thinking_tags,
    unwrap_json_payload,
)

logger = logging.getLogger("researchpilot.llm.ollama")
T = TypeVar("T", bound=BaseModel)


class OllamaProvider(LLMProvider):
    """Local-first LLM provider implementation backed by host Ollama daemon."""

    def __init__(
        self,
        base_url: str | None = None,
        model_name: str | None = None,
        context_window: int | None = None,
        temperature: float = 0.1,
        timeout: float = 90.0,
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model_name = model_name or settings.PRIMARY_MODEL
        self.context_window = context_window or settings.LLM_CONTEXT_WINDOW
        self.temperature = temperature
        self.timeout = timeout

    def _get_merged_options(self, custom_options: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """Merge default hardware-calibrated options with caller overrides."""
        opts: Dict[str, Any] = {
            "num_ctx": self.context_window,
            "temperature": self.temperature,
        }
        if custom_options:
            opts.update(custom_options)
        return opts

    async def generate(
        self,
        prompt: str,
        system: str | None = None,
        options: Dict[str, Any] | None = None,
    ) -> LLMResponse:
        """Execute text generation against local Ollama under concurrency semaphore lock."""
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": self._get_merged_options(options),
            "keep_alive": "5m",
        }
        if system:
            payload["system"] = system

        start_time = time.perf_counter()

        async with acquire_llm_slot():
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(f"{self.base_url}/api/generate", json=payload)

                    if resp.status_code == 404:
                        raise LLMModelNotFoundError(self.model_name)

                    resp.raise_for_status()
                    data = resp.json()

            except httpx.ConnectError as e:
                logger.error("Failed to connect to host Ollama at %s: %s", self.base_url, str(e))
                raise LLMConnectionError(
                    message=f"Host Ollama daemon unreachable at {self.base_url}.",
                    details={"url": self.base_url, "error": str(e)},
                ) from e

            except (TimeoutError, httpx.TimeoutException) as e:
                logger.error(
                    "Generation timed out after %.1fs for model %s", self.timeout, self.model_name
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

        duration_ms = (time.perf_counter() - start_time) * 1000
        raw_text = data.get("response", "")
        cleaned_text = strip_thinking_tags(raw_text)

        prompt_eval_count = data.get("prompt_eval_count", 0)
        eval_count = data.get("eval_count", 0)
        total_tokens = prompt_eval_count + eval_count

        return LLMResponse(
            content=cleaned_text,
            model=data.get("model", self.model_name),
            prompt_tokens=prompt_eval_count,
            completion_tokens=eval_count,
            total_tokens=total_tokens,
            duration_ms=round(duration_ms, 2),
            metadata={
                "total_duration_ns": data.get("total_duration", 0),
                "load_duration_ns": data.get("load_duration", 0),
                "eval_duration_ns": data.get("eval_duration", 0),
            },
        )

    async def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        system: str | None = None,
        options: Dict[str, Any] | None = None,
    ) -> T:
        """Generate structured data validating against Pydantic schema with 1-shot repair."""
        schema_directive = format_schema_prompt(response_model)
        full_system = f"{system.strip()}\n{schema_directive}" if system else schema_directive

        # 1. First generation attempt
        generation_options = dict(options or {})
        generation_options["format"] = "json"

        response = await self.generate(
            prompt=prompt, system=full_system, options=generation_options
        )
        candidate_json = unwrap_json_payload(extract_json_string(response.content), response_model)

        first_error_msg = ""
        try:
            return response_model.model_validate_json(candidate_json)
        except (ValidationError, json.JSONDecodeError) as first_err:
            first_error_msg = str(first_err)
            logger.warning(
                "Initial structured JSON parsing failed for %s (%s). Attempting 1-shot repair...",
                response_model.__name__,
                first_error_msg,
            )

        # 2. Bounded 1-shot repair attempt
        repair_prompt = format_repair_prompt(
            raw_text=response.content,
            error_msg=first_error_msg,
            response_model=response_model,
        )

        repair_response = await self.generate(
            prompt=repair_prompt,
            system="You are a JSON repair specialist. Output ONLY valid JSON conforming to schema.",
            options=generation_options,
        )
        repair_candidate_json = unwrap_json_payload(
            extract_json_string(repair_response.content), response_model
        )

        try:
            return response_model.model_validate_json(repair_candidate_json)
        except (ValidationError, json.JSONDecodeError) as repair_err:
            logger.error(
                "1-shot repair failed for %s. Raw text snippet: %s",
                response_model.__name__,
                repair_candidate_json[:200],
            )
            raise LLMStructuredOutputError(
                message=f"Failed to validate {response_model.__name__} JSON after repair attempt.",
                raw_output=repair_candidate_json,
                schema_name=response_model.__name__,
                validation_errors=str(repair_err),
            ) from repair_err

    async def stream(
        self,
        prompt: str,
        system: str | None = None,
        options: Dict[str, Any] | None = None,
    ) -> AsyncIterator[str]:
        """Stream generation tokens asynchronously under concurrency semaphore lock."""
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": True,
            "options": self._get_merged_options(options),
            "keep_alive": "5m",
        }
        if system:
            payload["system"] = system

        async with acquire_llm_slot():
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    async with client.stream(
                        "POST", f"{self.base_url}/api/generate", json=payload
                    ) as response:
                        if response.status_code == 404:
                            raise LLMModelNotFoundError(self.model_name)
                        response.raise_for_status()

                        in_thinking = False
                        async for line in response.aiter_lines():
                            if not line.strip():
                                continue
                            try:
                                chunk = json.loads(line)
                                text_piece = chunk.get("response", "")

                                # Handle dynamic stream thinking tags
                                if "<think>" in text_piece:
                                    in_thinking = True
                                    continue
                                if "</think>" in text_piece:
                                    in_thinking = False
                                    continue
                                if in_thinking:
                                    continue

                                if text_piece:
                                    yield text_piece

                                if chunk.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue

            except httpx.ConnectError as e:
                raise LLMConnectionError(
                    message=f"Host Ollama unreachable at {self.base_url}."
                ) from e
            except (TimeoutError, httpx.TimeoutException) as e:
                raise LLMTimeoutError(
                    timeout_seconds=self.timeout, model_name=self.model_name
                ) from e

    async def check_health(self) -> ProviderHealth:
        """Inspect Ollama daemon connectivity, model presence, and VRAM layer offload status."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                # 1. Check tags
                tags_resp = await client.get(f"{self.base_url}/api/tags")
                if tags_resp.status_code != 200:
                    return ProviderHealth(
                        is_healthy=False,
                        model_available=False,
                        message=f"Ollama returned HTTP status {tags_resp.status_code}",
                        details={"status_code": tags_resp.status_code},
                    )

                models_data = tags_resp.json().get("models", [])
                available_names = [m.get("name", "") for m in models_data]

                # Match model name allowing for tags (e.g. qwen3:8b matches qwen3:8b:latest)
                model_found = any(
                    self.model_name == name or name.startswith(f"{self.model_name}:")
                    for name in available_names
                )

                # 2. Check /api/ps for active VRAM allocations
                ps_resp = await client.get(f"{self.base_url}/api/ps")
                vram_allocated_mb: int | None = None
                has_cpu_spill = False
                running_models_info: List[Dict[str, Any]] = []

                if ps_resp.status_code == 200:
                    ps_data = ps_resp.json()
                    for running in ps_data.get("models", []):
                        size = running.get("size", 0)
                        size_vram = running.get("size_vram", 0)
                        vram_mb = size_vram // (1024 * 1024)
                        total_mb = size // (1024 * 1024)
                        if running.get("name", "").startswith(self.model_name):
                            vram_allocated_mb = vram_mb
                        if size > 0 and size_vram < size:
                            has_cpu_spill = True
                        running_models_info.append(
                            {"name": running.get("name"), "vram_mb": vram_mb, "total_mb": total_mb}
                        )

                msg = (
                    "Ollama is healthy with 100% GPU layer offload."
                    if not has_cpu_spill
                    else "Ollama is degraded: partial layer offload to system RAM detected."
                )

                return ProviderHealth(
                    is_healthy=True,
                    model_available=model_found,
                    vram_allocated_mb=vram_allocated_mb,
                    total_vram_mb=8151,  # Target RTX 5060 Laptop total
                    has_cpu_spill=has_cpu_spill,
                    message=msg,
                    details={
                        "model_target": self.model_name,
                        "available_models_count": len(available_names),
                        "installed_models": available_names,
                        "running_models": running_models_info,
                    },
                )

        except Exception as e:
            return ProviderHealth(
                is_healthy=False,
                model_available=False,
                message=f"Cannot connect to Ollama at {self.base_url}: {str(e)}",
                details={"error": str(e)},
            )

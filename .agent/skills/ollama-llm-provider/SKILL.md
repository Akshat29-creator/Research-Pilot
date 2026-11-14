---
name: ollama-llm-provider
description: Standards and implementation patterns for LLM provider abstraction, local Ollama integration, structured JSON generation with schema validation and repair, streaming, concurrency control, and VRAM management.
---

# Ollama LLM Provider Skill

## When to Use
Use when implementing, configuring, or debugging LLM providers, prompt execution, Ollama API interactions, structured output parsing, model health checks, or concurrency throttling.

## Core Abstraction Architecture
Maintain a clean provider interface in `app/integrations/llm/base.py`:
- `LLMProvider` (ABC):
  - `generate(prompt: str, system: Optional[str], options: Dict) -> LLMResponse`
  - `generate_structured(prompt: str, response_model: Type[T], system: Optional[str]) -> T`
  - `stream(prompt: str, system: Optional[str]) -> AsyncIterator[str]`
  - `check_health() -> ProviderHealth`

## Step-by-Step Procedure

### 1. Concurrency & VRAM Guardrails
- Maintain a single shared `asyncio.Semaphore(1)` in the provider registry to ensure only ONE LLM generation runs at any moment on the RTX 5060 GPU.
- Enforce default context length limit (`num_ctx = 4096`).
- Set low temperature for reasoning/extraction tasks (`temperature = 0.1` to `0.2`).

### 2. Structured JSON Generation & Validation
- For models without reliable native JSON-mode schema pinning (e.g. Qwen quantized models):
  1. Inject the Pydantic JSON schema into the system prompt along with strict output format directives.
  2. If the model includes a thinking block (e.g. `<think>...</think>`), strip the thought tokens before parsing JSON.
  3. Validate the extracted JSON string against the target Pydantic schema using `response_model.model_validate_json(raw_text)`.
  4. **Bounded Repair Retry**: If validation fails (`ValidationError` or `JSONDecodeError`), perform exactly ONE repair round by prompting the LLM with the error trace and invalid text. If the second attempt fails, raise a typed `LLMStructuredOutputError`.

### 3. Model Health & Capability Checks
- Implement `check_health()` querying Ollama's `GET /api/tags` and `POST /api/show`.
- Verify the requested model is pulled and available locally.
- If Ollama is unreachable or model missing, degrade gracefully: log structured error, return actionable diagnostics, and do not crash the host process.

### 4. Telemetry & Metrics Tracking
- Every call to `generate()` or `generate_structured()` must return metadata:
  - `prompt_tokens`, `completion_tokens`, `total_tokens`
  - `duration_ms`, `time_to_first_token_ms` (for streams)
  - `model_name`, `provider_type`

## Verification Checklist
- [ ] Provider implements `LLMProvider` interface cleanly.
- [ ] Concurrency semaphore limits local inferences to 1 concurrently.
- [ ] Context window set to 4096 tokens by default.
- [ ] Thinking tags (`<think>`) cleanly stripped before JSON parsing.
- [ ] Structured JSON errors trigger at most ONE bounded repair retry.
- [ ] Unreachable Ollama returns clear error state without hanging.
- [ ] Unit tests mock HTTP calls; integration tests run against live Ollama instance.

## Common Mistakes to Avoid
- **Unbounded Retries**: Retrying JSON parsing indefinitely in a while loop. Cap strictly at 1 repair attempt.
- **Concurrent Ollama Flooding**: Spawning multiple asynchronous LLM calls concurrently, triggering GPU VRAM paging, extreme latency spikes, or driver crashes.
- **Ignoring Ollama Timeouts**: Hanging indefinitely on generation. Always enforce a sensible timeout (e.g., 60-120 seconds).
- **Silent Degradation**: Catching Ollama connection errors and returning empty strings instead of raising typed `LLMProviderError`.

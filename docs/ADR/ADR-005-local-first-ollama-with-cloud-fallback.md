# ADR-005: Local-First Ollama Integration with Cloud Fallback

## Status
Accepted

## Context & Problem Statement
Users require complete privacy, air-gapped offline usability, and zero ongoing API costs for routine research workloads. At the same time, users may occasionally wish to benchmark against or utilize ultra-large cloud models (e.g. OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro) if they provide their own API keys.

The architecture must support both modalities without tightly coupling agent prompts or workflows to a specific vendor SDK.

## Considered Options
1. **Provider Abstraction Interface with Local Default & Optional Cloud Fallback (Selected)**
2. **Cloud-Only Architecture**
3. **Ollama-Only Hardcoded Architecture**
4. **LangChain Universal Model Wrapper**

## Decision Outcome
Chosen option: **Provider Abstraction Interface (`LLMProvider`)**, because:
- **Clean Interface Boundary**: `LLMProvider` defines generic async methods (`generate`, `generate_structured`, `stream`, `check_health`).
- **OllamaProvider**: Connects to the local host Ollama instance (`http://localhost:11434` or `http://host.docker.internal:11434`) using standard asynchronous HTTP client (`httpx`). Strips Qwen3 thinking blocks (`<think>`) and manages bounded repair retries for structured JSON.
- **CloudLLMProvider**: Implements the identical interface for cloud providers when API keys are supplied in `.env`.
- **Degraded Mode Resilience**: If Ollama is offline or uninstalled, the application does not crash on startup; `/ready` reports Ollama down, and the UI surfaces clear setup and troubleshooting instructions.

## Consequences
- **Positive**:
  - Zero vendor lock-in.
  - Complete data privacy by default: queries and PDF contents never leave the user's laptop unless they explicitly switch providers.
  - Fully testable via lightweight mocks and integration tests.
- **Negative / Trade-offs**:
  - Maintaining structured JSON parsing resilience across both local quantized models (which may make formatting mistakes) and polished cloud APIs.

# Hardware Rules & Constraints

## 1. Development & Host Environment Profile
- **Host Device**: Lenovo Legion Pro 5
- **CPU**: AMD Ryzen 7 8745HX (16 threads / 8 cores, high performance)
- **GPU**: NVIDIA GeForce RTX 5060 Laptop GPU (8GB GDDR6 VRAM)
- **Operating Environment**: Windows 11 host with WSL2 Ubuntu integration
- **Inference Runtime**: Ollama running directly on the host (not inside containerized virtualization overhead)

## 2. Resource Inspection Pre-Flight
- **Mandatory Memory Audit**: Before configuring or running LLM inference, inspect real VRAM and system memory:
  - GPU: Execute `nvidia-smi` to verify available VRAM and check running processes.
  - RAM: Inspect host memory headroom to avoid swapping during document embedding or background processing.
- **Never Assume Capacity**: Do not adjust model quantization or context window sizing without confirming physical headroom.

## 3. VRAM Safety & Execution Guardrails
- **Single Model Loaded in VRAM**: Only ONE LLM must reside in GPU memory at any given time.
- **Embedding Separation**: The embedding model (`nomic-embed-text`) should only be invoked during discrete ingestion/retrieval cycles and unloaded when running multi-turn agent generation if VRAM contention arises.
- **Strict Concurrency Limit (Concurrency = 1)**: All local LLM calls must pass through a global asynchronous semaphore (`asyncio.Semaphore(1)`) to guarantee that concurrent requests do not spawn parallel inferences and cause GPU out-of-memory (OOM) crashes.
- **Sequential Agent Pipeline**: Agent nodes (Orchestrator -> Research -> Analysis -> Writer -> Reviewer) must execute sequentially, never in parallel branches against local Ollama.
- **Context Window Budget**:
  - Initial baseline: `num_ctx = 4096` tokens.
  - Do not raise above 4096 tokens without benchmarking KV-cache memory footprints against the 8GB VRAM ceiling.

## 4. Offline & Fallback Policy
- **Local-First Core**: The platform must remain 100% operational in air-gapped or offline mode using local Ollama models (`qwen2.5:7b` / `qwen3:8b` or installed quantized equivalents).
- **Cloud Fallback as Secondary**: Cloud LLM providers (OpenAI, Anthropic, Gemini) are optional, non-blocking extensions configured via environment variables. The system must never crash if cloud API keys are absent.

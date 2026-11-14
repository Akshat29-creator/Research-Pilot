# ADR-003: Hardware Concurrency Throttling, VRAM Budgeting & In-Container Monitoring

## Status
Accepted (Refined with Ollama /api/ps VRAM Monitoring)

## Context & Problem Statement
The host development workstation is a Lenovo Legion Pro 5 equipped with an AMD Ryzen 7 8745HX processor and an NVIDIA GeForce RTX 5060 Laptop GPU possessing 8151 MiB (~8GB) of GDDR6 VRAM.
Under Windows 11 with display active, background applications and Desktop Window Manager consume approximately 1.9 GB of VRAM, leaving ~6.2 GB of free physical VRAM.

Attempting to run multiple LLMs concurrently or allowing multiple async requests to hit Ollama simultaneously would cause:
1. VRAM paging into system RAM over PCIe (10x-50x latency penalty).
2. Out-of-memory (CUDA OOM) allocation crashes.
3. System UI stuttering and driver resets.

Furthermore, executing `nvidia-smi` inside backend Docker containers requires the NVIDIA Container Toolkit and GPU passthrough drivers, adding fragile dependencies to application containers.

## Considered Options
1. **Strict Global Semaphore (`asyncio.Semaphore(1)`) + Ollama `/api/ps` VRAM Monitoring (Selected)**
2. **Containerized `nvidia-smi` GPU Passthrough**
3. **Parallel Agent Execution with Aggressive Model Offloading**
4. **Cloud-Only Execution**

## Decision Outcome
Chosen option: **Global Semaphore (`asyncio.Semaphore(1)`) + Quantized `qwen3:8b` (Q4_K_M) + Ollama `/api/ps` telemetry**, because:
- **Model Footprint Fit**: `qwen3:8b` (Q4_K_M) requires ~5.2 GB of VRAM. Combined with the ~1.9 GB Windows display consumption, total usage is ~7.1 GB, fitting safely within the 8.1 GB physical capacity.
- **Context Window Ceiling**: Limiting context to `num_ctx = 4096` constrains the KV cache footprint to ~0.8 GB, guaranteeing stability under heavy load.
- **Container-Agnostic VRAM Telemetry**: Rather than invoking `nvidia-smi` inside the backend container, the application queries Ollama's HTTP endpoint `GET /api/ps`. Ollama reports active models, including `size_vram` and total model `size`. If `size_vram < size`, layers are spilling into system RAM.
- **Graceful Readiness Probing (`/ready`)**: The backend readiness endpoint checks free VRAM headroom against an environment threshold:
  - `VRAM_WARN_THRESHOLD_MB` (default: `5500`).
  - If available VRAM drops below this threshold or layers are spilled, `/ready` reports `"degraded"` status (with descriptive warnings) rather than failing liveness, allowing the system to continue operating while warning the user.

## Consequences
- **Positive**:
  - Deterministic GPU stability without OOM risk.
  - Zero requirement for NVIDIA Container Toolkit inside standard Docker containers.
  - Clean degraded state handling when host VRAM is constrained.
- **Negative / Trade-offs**:
  - Research agent steps must execute sequentially; concurrent agent branches are queued behind `asyncio.Semaphore(1)`.
  - Context size is capped at 4096 tokens initially.

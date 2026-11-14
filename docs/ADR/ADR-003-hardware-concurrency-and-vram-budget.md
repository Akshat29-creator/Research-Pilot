# ADR-003: Hardware Concurrency Throttling & VRAM Budgeting

## Status
Accepted

## Context & Problem Statement
The host development workstation is a Lenovo Legion Pro 5 equipped with an AMD Ryzen 7 8745HX processor and an NVIDIA GeForce RTX 5060 Laptop GPU possessing 8151 MiB (~8GB) of GDDR6 VRAM.
Under Windows 11 with display active, background applications and Desktop Window Manager consume approximately 1.9 GB of VRAM, leaving ~6.2 GB of free physical VRAM.

Attempting to run multiple LLMs concurrently or allowing multiple async requests to hit Ollama simultaneously would cause:
1. VRAM paging into system RAM over PCIe (10x-50x latency penalty).
2. Out-of-memory (CUDA OOM) allocation crashes.
3. System UI stuttering and driver resets.

## Considered Options
1. **Strict Global Semaphore (`asyncio.Semaphore(1)`) + Quantized 8B Model (Selected)**
2. **Parallel Agent Execution with Aggressive Model Offloading**
3. **Small Parameter Models Only (1.5B - 2B)**
4. **Cloud-Only Execution**

## Decision Outcome
Chosen option: **Global Semaphore (`asyncio.Semaphore(1)`) + Quantized `qwen3:8b` (Q4_K_M)**, because:
- **Model Footprint Fit**: `qwen3:8b` (Q4_K_M) requires ~5.2 GB of VRAM. Combined with the ~1.9 GB Windows display consumption, the total usage is ~7.1 GB, fitting safely within the 8.1 GB physical capacity.
- **Context Window Ceiling**: Limiting context to `num_ctx = 4096` constrains the KV cache footprint to ~0.8 GB, guaranteeing stability under heavy load.
- **Queueing over Crashing**: All incoming LLM requests queue asynchronously behind a single semaphore. Other web operations (database queries, network fetching, SSE streaming, PDF parsing) run concurrently on the 16 CPU threads without blocking the event loop.

## Consequences
- **Positive**:
  - Deterministic GPU stability without OOM risk.
  - High generation speed (~30-45 tokens/sec) fully in VRAM.
  - High reasoning quality preserved with an 8B model.
- **Negative / Trade-offs**:
  - Research agent steps must execute sequentially; concurrent agent branches are queued.
  - Context size is capped at 4096 tokens initially, requiring smart chunk retrieval rather than dumping entire long documents into prompt context.

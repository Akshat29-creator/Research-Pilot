import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict

logger = logging.getLogger("researchpilot.llm.semaphore")

# Global singleton semaphore enforcing strict serialization (concurrency = 1)
# to protect host 8GB VRAM from OOM crashes or layer eviction.
_llm_semaphore: asyncio.Semaphore | None = None
_semaphore_lock = asyncio.Lock()

_telemetry: Dict[str, float | int] = {
    "total_acquisitions": 0,
    "active_acquisitions": 0,
    "waiting_requests": 0,
    "total_wait_duration_ms": 0.0,
}


def get_llm_semaphore() -> asyncio.Semaphore:
    """Return the global asyncio.Semaphore(1) instance for local LLM inference."""
    global _llm_semaphore
    if _llm_semaphore is None:
        _llm_semaphore = asyncio.Semaphore(1)
    return _llm_semaphore


def get_semaphore_telemetry() -> Dict[str, float | int]:
    """Return copy of concurrency semaphore telemetry counters."""
    return dict(_telemetry)


@asynccontextmanager
async def acquire_llm_slot(timeout: float | None = None) -> AsyncGenerator[None, None]:
    """Context manager acquiring the single host GPU inference slot.

    Guarantees strict FIFO serialization on host GPU memory.
    """
    semaphore = get_llm_semaphore()
    start_wait = time.perf_counter()
    _telemetry["waiting_requests"] += 1

    try:
        if timeout is not None:
            await asyncio.wait_for(semaphore.acquire(), timeout=timeout)
        else:
            await semaphore.acquire()

        wait_duration_ms = (time.perf_counter() - start_wait) * 1000
        _telemetry["waiting_requests"] -= 1
        _telemetry["total_acquisitions"] += 1
        _telemetry["active_acquisitions"] += 1
        _telemetry["total_wait_duration_ms"] += wait_duration_ms

        if wait_duration_ms > 100.0:
            logger.info("Acquired LLM GPU inference slot after %.1fms queue wait", wait_duration_ms)

        yield

    finally:
        if semaphore.locked():
            semaphore.release()
            _telemetry["active_acquisitions"] = max(0, _telemetry["active_acquisitions"] - 1)
            logger.debug(
                "Released LLM GPU inference slot (active=%d)", _telemetry["active_acquisitions"]
            )

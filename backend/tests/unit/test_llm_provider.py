import asyncio
import json
from typing import List
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from pydantic import BaseModel, Field

from app.integrations.llm.embeddings import OllamaEmbeddingProvider
from app.integrations.llm.exceptions import (
    LLMConnectionError,
    LLMModelNotFoundError,
    LLMStructuredOutputError,
    LLMTimeoutError,
)
from app.integrations.llm.ollama import OllamaProvider
from app.integrations.llm.semaphore import (
    acquire_llm_slot,
    get_semaphore_telemetry,
)
from app.integrations.llm.structured import (
    extract_json_string,
    format_repair_prompt,
    format_schema_prompt,
    strip_thinking_tags,
)


class SampleAnalysis(BaseModel):
    summary: str = Field(description="Summary of research")
    confidence: float = Field(ge=0.0, le=1.0)
    key_findings: List[str]


# -----------------------------------------------------------------------------
# 1. Structured Utilities Tests
# -----------------------------------------------------------------------------


def test_strip_thinking_tags_closed():
    raw = (
        "<think>Let me reason about this query carefully.\n"
        "Step 1: check facts.</think>Final synthesized response."
    )
    result = strip_thinking_tags(raw)
    assert result == "Final synthesized response."


def test_strip_thinking_tags_unclosed():
    raw = "<think>Incomplete thought that got cut off due to context window..."
    result = strip_thinking_tags(raw)
    assert result == ""


def test_strip_thinking_tags_nested_multiline():
    raw = """<think>
Line 1
Line 2
</think>
```json
{"summary": "Test", "confidence": 0.9, "key_findings": ["A"]}
```"""
    result = strip_thinking_tags(raw)
    assert "<think>" not in result
    assert '{"summary": "Test"' in result


def test_extract_json_markdown_fence():
    raw = """Here is the result:
```json
{
  "summary": "Quantum Computing Advances",
  "confidence": 0.95,
  "key_findings": ["Finding 1", "Finding 2"]
}
```
Hope this is helpful!"""
    extracted = extract_json_string(raw)
    assert extracted.startswith("{")
    assert extracted.endswith("}")
    data = json.loads(extracted)
    assert data["summary"] == "Quantum Computing Advances"


def test_extract_json_raw_braces():
    raw = 'Synthesized analysis: {"summary": "Direct JSON", "confidence": 0.8, "key_findings": []}'
    extracted = extract_json_string(raw)
    data = json.loads(extracted)
    assert data["summary"] == "Direct JSON"


def test_extract_json_trailing_commas_cleaned():
    raw = """{
  "summary": "Trailing commas test",
  "confidence": 0.7,
  "key_findings": [
    "item 1",
    "item 2",
  ],
}"""
    extracted = extract_json_string(raw)
    # json.loads should succeed after cleaning trailing commas
    data = json.loads(extracted)
    assert len(data["key_findings"]) == 2
    assert data["summary"] == "Trailing commas test"


def test_format_schema_prompt():
    prompt = format_schema_prompt(SampleAnalysis)
    assert "CRITICAL OUTPUT REQUIREMENT:" in prompt
    assert "summary" in prompt
    assert "confidence" in prompt


def test_format_repair_prompt():
    repair = format_repair_prompt(
        raw_text='{"summary": "incomplete"',
        error_msg="Expecting property name enclosed in double quotes",
        response_model=SampleAnalysis,
    )
    assert "failed JSON schema validation" in repair
    assert "Expecting property name" in repair
    assert '{"summary": "incomplete"' in repair


# -----------------------------------------------------------------------------
# 2. Concurrency Semaphore Tests
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_semaphore_serialization():
    execution_order = []

    async def worker(worker_id: int):
        async with acquire_llm_slot():
            execution_order.append(f"start_{worker_id}")
            await asyncio.sleep(0.05)
            execution_order.append(f"end_{worker_id}")

    # Launch two concurrent workers
    await asyncio.gather(worker(1), worker(2))

    # Strict serialization requires start_X -> end_X before start_Y
    assert execution_order == ["start_1", "end_1", "start_2", "end_2"] or execution_order == [
        "start_2",
        "end_2",
        "start_1",
        "end_1",
    ]
    telemetry = get_semaphore_telemetry()
    assert telemetry["total_acquisitions"] >= 2
    assert telemetry["active_acquisitions"] == 0


# -----------------------------------------------------------------------------
# 3. Ollama Provider Unit Tests
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ollama_generate_success():
    provider = OllamaProvider(base_url="http://test-ollama:11434", model_name="qwen3:8b")

    mock_response = httpx.Response(
        status_code=200,
        json={
            "response": "<think>Thinking</think>Hello ResearchPilot!",
            "model": "qwen3:8b",
            "prompt_eval_count": 15,
            "eval_count": 8,
            "total_duration": 45000000,
        },
        request=httpx.Request("POST", "http://test-ollama:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        res = await provider.generate("Hi")

        assert res.content == "Hello ResearchPilot!"
        assert res.prompt_tokens == 15
        assert res.completion_tokens == 8
        assert res.total_tokens == 23
        assert res.model == "qwen3:8b"


@pytest.mark.asyncio
async def test_ollama_generate_model_not_found():
    provider = OllamaProvider(base_url="http://test-ollama:11434", model_name="nonexistent:model")

    mock_response = httpx.Response(
        status_code=404,
        json={"error": "model 'nonexistent:model' not found"},
        request=httpx.Request("POST", "http://test-ollama:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(LLMModelNotFoundError):
            await provider.generate("test")


@pytest.mark.asyncio
async def test_ollama_generate_connect_error():
    provider = OllamaProvider(base_url="http://offline-ollama:11434", model_name="qwen3:8b")

    with patch(
        "httpx.AsyncClient.post",
        side_effect=httpx.ConnectError(
            "Connection refused", request=httpx.Request("POST", "http://offline")
        ),
    ):
        with pytest.raises(LLMConnectionError):
            await provider.generate("test")


@pytest.mark.asyncio
async def test_ollama_generate_timeout_error():
    provider = OllamaProvider(
        base_url="http://test-ollama:11434", model_name="qwen3:8b", timeout=1.0
    )

    with patch(
        "httpx.AsyncClient.post",
        side_effect=httpx.ReadTimeout(
            "Read timed out", request=httpx.Request("POST", "http://timeout")
        ),
    ):
        with pytest.raises(LLMTimeoutError):
            await provider.generate("test")


@pytest.mark.asyncio
async def test_ollama_generate_structured_success_first_attempt():
    provider = OllamaProvider(base_url="http://test-ollama:11434", model_name="qwen3:8b")

    valid_json = {
        "summary": "Successful first try",
        "confidence": 0.95,
        "key_findings": ["Insight 1", "Insight 2"],
    }
    mock_response = httpx.Response(
        status_code=200,
        json={"response": f"```json\n{json.dumps(valid_json)}\n```", "model": "qwen3:8b"},
        request=httpx.Request("POST", "http://test-ollama:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.generate_structured("Analyze this", SampleAnalysis)

        assert isinstance(result, SampleAnalysis)
        assert result.summary == "Successful first try"
        assert result.confidence == 0.95
        assert len(result.key_findings) == 2


@pytest.mark.asyncio
async def test_ollama_generate_structured_repair_retry_success():
    provider = OllamaProvider(base_url="http://test-ollama:11434", model_name="qwen3:8b")

    # Attempt 1: Malformed JSON missing summary and closing brace
    invalid_resp = httpx.Response(
        status_code=200,
        json={"response": 'Here is the data: {"confidence": 0.8,', "model": "qwen3:8b"},
        request=httpx.Request("POST", "http://test-ollama:11434/api/generate"),
    )

    # Attempt 2 (Repair): Valid JSON satisfying schema
    repaired_json = {
        "summary": "Repaired after initial syntax defect",
        "confidence": 0.85,
        "key_findings": ["Resolved key issue"],
    }
    repaired_resp = httpx.Response(
        status_code=200,
        json={"response": json.dumps(repaired_json), "model": "qwen3:8b"},
        request=httpx.Request("POST", "http://test-ollama:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [invalid_resp, repaired_resp]
        result = await provider.generate_structured("Analyze with repair", SampleAnalysis)

        assert isinstance(result, SampleAnalysis)
        assert result.summary == "Repaired after initial syntax defect"
        assert mock_post.call_count == 2


@pytest.mark.asyncio
async def test_ollama_generate_structured_exhausted_raises_error():
    provider = OllamaProvider(base_url="http://test-ollama:11434", model_name="qwen3:8b")

    # Both initial and repair attempt return invalid JSON
    bad_resp_1 = httpx.Response(
        status_code=200,
        json={"response": "Totally unparseable prose response", "model": "qwen3:8b"},
        request=httpx.Request("POST", "http://test-ollama:11434/api/generate"),
    )
    bad_resp_2 = httpx.Response(
        status_code=200,
        json={"response": "Still unparseable prose response", "model": "qwen3:8b"},
        request=httpx.Request("POST", "http://test-ollama:11434/api/generate"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [bad_resp_1, bad_resp_2]
        with pytest.raises(LLMStructuredOutputError) as exc_info:
            await provider.generate_structured("Analyze failing case", SampleAnalysis)

        assert "SampleAnalysis" in str(exc_info.value)
        assert mock_post.call_count == 2


# -----------------------------------------------------------------------------
# 4. Ollama Embedding Provider Unit Tests
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_embedding_provider_embed_text():
    provider = OllamaEmbeddingProvider(
        base_url="http://test-ollama:11434", model_name="nomic-embed-text"
    )

    dummy_vector = [0.1] * 768
    mock_resp = httpx.Response(
        status_code=200,
        json={"embeddings": [dummy_vector]},
        request=httpx.Request("POST", "http://test-ollama:11434/api/embed"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        vec = await provider.embed_text("Deep Learning Transformer Architecture")

        assert len(vec) == 768
        assert vec[0] == 0.1


@pytest.mark.asyncio
async def test_embedding_provider_embed_batch():
    provider = OllamaEmbeddingProvider(
        base_url="http://test-ollama:11434", model_name="nomic-embed-text"
    )

    dummy_vectors = [[0.1] * 768, [0.2] * 768]
    mock_resp = httpx.Response(
        status_code=200,
        json={"embeddings": dummy_vectors},
        request=httpx.Request("POST", "http://test-ollama:11434/api/embed"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        results = await provider.embed_batch(["text 1", "text 2"])

        assert len(results) == 2
        assert len(results[0]) == 768
        assert len(results[1]) == 768


@pytest.mark.asyncio
async def test_embedding_provider_empty_batch():
    provider = OllamaEmbeddingProvider()
    results = await provider.embed_batch([])
    assert results == []

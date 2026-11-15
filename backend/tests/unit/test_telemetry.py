from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient
from opentelemetry.trace import StatusCode

from app.core.telemetry.metrics import (
    ACTIVE_RESEARCH_JOBS,
    AGENT_NODE_DURATION,
    REVIEWER_GROUNDING_SCORE,
    REVIEWER_VERDICT_COUNT,
)
from app.core.telemetry.otel import get_tracer, init_tracer, timed_agent_node


def test_init_tracer_singleton():
    provider1 = init_tracer("test-service")
    provider2 = init_tracer("test-service")
    assert provider1 is provider2
    tracer = get_tracer("test-tracer")
    assert tracer is not None


@pytest.mark.asyncio
async def test_timed_agent_node_success():
    @timed_agent_node("test_agent")
    async def sample_node(state):
        return {"status": "SUCCESS", "data": "ok"}

    state = {
        "execution_id": "exec-1234",
        "session_id": "sess-5678",
    }

    mock_span = MagicMock()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value.__enter__.return_value = mock_span

    with patch("app.core.telemetry.otel.get_tracer", return_value=mock_tracer):
        result = await sample_node(state)

    assert result["status"] == "SUCCESS"
    mock_span.set_attribute.assert_any_call("agent.name", "test_agent")
    mock_span.set_attribute.assert_any_call("research.execution_id", "exec-1234")
    mock_span.set_attribute.assert_any_call("research.session_id", "sess-5678")
    mock_span.set_attribute.assert_any_call("agent.status", "SUCCESS")


@pytest.mark.asyncio
async def test_timed_agent_node_exception():
    @timed_agent_node("failing_agent")
    async def failing_node(state):
        raise ValueError("Simulated node failure")

    mock_span = MagicMock()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value.__enter__.return_value = mock_span

    with patch("app.core.telemetry.otel.get_tracer", return_value=mock_tracer):
        with pytest.raises(ValueError, match="Simulated node failure"):
            await failing_node({})

    mock_span.record_exception.assert_called_once()
    mock_span.set_status.assert_called_once_with(StatusCode.ERROR, "Simulated node failure")


def test_prometheus_metrics_recording():
    AGENT_NODE_DURATION.labels(node_name="test_node").observe(0.42)
    REVIEWER_GROUNDING_SCORE.observe(0.95)
    REVIEWER_VERDICT_COUNT.labels(verdict="pass").inc()

    initial = ACTIVE_RESEARCH_JOBS._value.get()
    ACTIVE_RESEARCH_JOBS.inc()
    assert ACTIVE_RESEARCH_JOBS._value.get() == initial + 1
    ACTIVE_RESEARCH_JOBS.dec()
    assert ACTIVE_RESEARCH_JOBS._value.get() == initial


@pytest.mark.asyncio
async def test_metrics_endpoint_response(client: AsyncClient):
    res = await client.get("/metrics")
    assert res.status_code == 200
    assert "text/plain" in res.headers.get("content-type", "")
    content = res.text
    assert "agent_node_duration_seconds" in content
    assert "reviewer_grounding_score" in content

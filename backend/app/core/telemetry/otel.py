import logging
from typing import Any, Callable, Dict

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SpanExporter, SpanExportResult

logger = logging.getLogger("researchpilot.core.telemetry.otel")

_tracer_provider: TracerProvider | None = None


class SafeConsoleExporter(SpanExporter):
    """Local exporter that gracefully tolerates captured/closed stdout in tests."""

    def export(self, spans: Any) -> SpanExportResult:
        try:
            import sys

            if sys.stdout and not sys.stdout.closed:
                for span in spans:
                    attrs = dict(span.attributes or {})
                    sys.stdout.write(f"[OTel] {span.name} - {attrs.get('agent.name', '')}\n")
                sys.stdout.flush()
        except Exception:
            pass
        return SpanExportResult.SUCCESS

    def shutdown(self) -> None:
        pass


def init_tracer(service_name: str = "researchpilot-backend") -> TracerProvider:
    """Initialize OpenTelemetry TracerProvider with resource attributes."""
    global _tracer_provider
    if _tracer_provider is None:
        resource = Resource.create(
            {
                "service.name": service_name,
                "service.version": "0.1.0",
                "deployment.environment": "local-development",
            }
        )
        provider = TracerProvider(resource=resource)
        provider.add_span_processor(BatchSpanProcessor(SafeConsoleExporter()))
        trace.set_tracer_provider(provider)
        _tracer_provider = provider
        logger.info("OpenTelemetry TracerProvider initialized for %s", service_name)
    return _tracer_provider


def get_tracer(name: str = "researchpilot") -> trace.Tracer:
    """Return named tracer instance."""
    return trace.get_tracer(name)


def timed_agent_node(node_name: str) -> Callable:
    """Decorator wrapping agent nodes with OpenTelemetry span and execution correlation."""

    def decorator(func: Callable) -> Callable:
        async def wrapper(state: Dict[str, Any], *args: Any, **kwargs: Any) -> Any:
            tracer = get_tracer("researchpilot.agent")
            execution_id = state.get("execution_id", "unknown")
            session_id = state.get("session_id", "unknown")

            with tracer.start_as_current_span(f"agent.{node_name}") as span:
                span.set_attribute("agent.name", node_name)
                span.set_attribute("research.execution_id", execution_id)
                span.set_attribute("research.session_id", session_id)

                try:
                    result = await func(state, *args, **kwargs)
                    if isinstance(result, dict) and "status" in result:
                        span.set_attribute("agent.status", str(result["status"]))
                    return result
                except Exception as exc:
                    span.record_exception(exc)
                    span.set_status(trace.StatusCode.ERROR, str(exc))
                    raise

        return wrapper

    return decorator

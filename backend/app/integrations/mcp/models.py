from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass(frozen=True)
class MCPToolParameter:
    """Specification of an individual MCP tool parameter."""

    name: str
    param_type: str
    description: str = ""
    required: bool = True
    default: Any | None = None


@dataclass(frozen=True)
class MCPToolDefinition:
    """Metadata and schema contract for an MCP tool discovered from an MCP server."""

    name: str
    description: str
    input_schema: Dict[str, Any] = field(default_factory=dict)
    parameters: List[MCPToolParameter] = field(default_factory=list)
    server_name: str = "default"


@dataclass(frozen=True)
class MCPToolCall:
    """Invocation request for an MCP tool with validated arguments."""

    tool_name: str
    arguments: Dict[str, Any] = field(default_factory=dict)
    call_id: str | None = None


@dataclass(frozen=True)
class MCPToolResult:
    """Execution result and telemetry returned from an MCP tool call."""

    tool_name: str
    success: bool
    content: str
    error: str | None = None
    execution_time_ms: float = 0.0
    raw_payload: Dict[str, Any] | None = None

import asyncio
import logging
import time
from typing import Any, Callable, Coroutine, Dict, List

from app.integrations.mcp.models import (
    MCPToolDefinition,
    MCPToolResult,
)
from app.tools.isolation import sanitize_untrusted_text

logger = logging.getLogger("researchpilot.mcp.client")


class MCPClient:
    """Client for discovering, validating, and executing tools on Model Context Protocol servers.

    Provides strict timeout enforcement, parameter schema validation, and prompt-injection
    sanitization on tool outputs.
    """

    def __init__(
        self,
        server_name: str = "local_mcp",
        timeout_seconds: float = 15.0,
    ):
        self.server_name = server_name
        self.timeout_seconds = timeout_seconds
        self._tools: Dict[str, MCPToolDefinition] = {}
        self._handlers: Dict[str, Callable[[Dict[str, Any]], Coroutine[Any, Any, Any]]] = {}

    def register_tool_handler(
        self,
        definition: MCPToolDefinition,
        handler: Callable[[Dict[str, Any]], Coroutine[Any, Any, Any]],
    ) -> None:
        """Register a callable tool handler with its formal MCP definition."""
        self._tools[definition.name] = definition
        self._handlers[definition.name] = handler
        logger.info("Registered MCP tool '%s' on server '%s'", definition.name, self.server_name)

    def list_tools(self) -> List[MCPToolDefinition]:
        """Return the collection of tools exposed by this MCP client."""
        return list(self._tools.values())

    def get_tool(self, tool_name: str) -> MCPToolDefinition | None:
        """Look up tool definition by name."""
        return self._tools.get(tool_name)

    def validate_arguments(
        self, tool_def: MCPToolDefinition, arguments: Dict[str, Any]
    ) -> str | None:
        """Validate input arguments against tool definition schema.

        Returns an error message string if arguments violate schema constraints.
        """
        schema = tool_def.input_schema
        required_fields = schema.get("required", [])

        for req in required_fields:
            if req not in arguments:
                return f"Missing required parameter '{req}' for tool '{tool_def.name}'."

        properties = schema.get("properties", {})
        for param, val in arguments.items():
            param_spec = properties.get(param, {})
            expected_type = param_spec.get("type")

            if expected_type == "string" and not isinstance(val, str):
                return f"Parameter '{param}' expected string, got {type(val).__name__}."
            if expected_type == "integer" and not isinstance(val, int):
                return f"Parameter '{param}' expected integer, got {type(val).__name__}."
            if expected_type == "boolean" and not isinstance(val, bool):
                return f"Parameter '{param}' expected boolean, got {type(val).__name__}."
            if expected_type == "array" and not isinstance(val, list):
                return f"Parameter '{param}' expected array, got {type(val).__name__}."
            if expected_type == "object" and not isinstance(val, dict):
                return f"Parameter '{param}' expected object, got {type(val).__name__}."

        return None

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        call_id: str | None = None,
    ) -> MCPToolResult:
        """Execute an MCP tool under strict timeout guardrails and sanitize the returned output."""
        t0 = time.perf_counter()

        tool_def = self._tools.get(tool_name)
        handler = self._handlers.get(tool_name)

        if not tool_def or not handler:
            return MCPToolResult(
                tool_name=tool_name,
                success=False,
                content="",
                error=f"MCP tool '{tool_name}' not found on server '{self.server_name}'.",
                execution_time_ms=(time.perf_counter() - t0) * 1000,
            )

        # 1. Parameter schema validation
        val_error = self.validate_arguments(tool_def, arguments)
        if val_error:
            logger.warning("MCP tool '%s' argument validation failed: %s", tool_name, val_error)
            return MCPToolResult(
                tool_name=tool_name,
                success=False,
                content="",
                error=val_error,
                execution_time_ms=(time.perf_counter() - t0) * 1000,
            )

        # 2. Asynchronous execution under timeout
        try:
            raw_result = await asyncio.wait_for(
                handler(arguments),
                timeout=self.timeout_seconds,
            )

            # Convert result to string format
            content_str = raw_result if isinstance(raw_result, str) else str(raw_result)

            # 3. Sanitize output to defang prompt injection tokens
            clean_content = sanitize_untrusted_text(content_str)
            elapsed = (time.perf_counter() - t0) * 1000

            logger.info("MCP tool '%s' executed successfully in %.1fms", tool_name, elapsed)
            return MCPToolResult(
                tool_name=tool_name,
                success=True,
                content=clean_content,
                execution_time_ms=elapsed,
                raw_payload={"result": raw_result} if isinstance(raw_result, dict) else None,
            )

        except TimeoutError:
            elapsed = (time.perf_counter() - t0) * 1000
            err_msg = f"MCP tool '{tool_name}' timed out after {self.timeout_seconds}s."
            logger.error(err_msg)
            return MCPToolResult(
                tool_name=tool_name,
                success=False,
                content="",
                error=err_msg,
                execution_time_ms=elapsed,
            )

        except Exception as e:
            elapsed = (time.perf_counter() - t0) * 1000
            logger.error("MCP tool '%s' execution failed: %s", tool_name, str(e))
            return MCPToolResult(
                tool_name=tool_name,
                success=False,
                content="",
                error=f"Tool execution failed: {str(e)}",
                execution_time_ms=elapsed,
            )

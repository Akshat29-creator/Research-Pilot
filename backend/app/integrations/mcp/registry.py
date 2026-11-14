import logging
from typing import Dict, List

from app.integrations.mcp.client import MCPClient
from app.integrations.mcp.models import MCPToolDefinition, MCPToolResult

logger = logging.getLogger("researchpilot.mcp.registry")


class MCPToolRegistry:
    """Central registry aggregating MCP tools discovered across local and remote servers."""

    def __init__(self):
        self._clients: Dict[str, MCPClient] = {}

    def register_client(self, client: MCPClient) -> None:
        """Register an active MCP client instance."""
        self._clients[client.server_name] = client
        logger.info("Registered MCP client server '%s'", client.server_name)

    def get_client(self, server_name: str) -> MCPClient | None:
        """Retrieve client by server name."""
        return self._clients.get(server_name)

    def list_all_tools(self) -> List[MCPToolDefinition]:
        """Enumerate all available MCP tools across all registered clients."""
        all_tools: List[MCPToolDefinition] = []
        for client in self._clients.values():
            all_tools.extend(client.list_tools())
        return all_tools

    async def call_tool(
        self,
        tool_name: str,
        arguments: dict,
        server_name: str | None = None,
    ) -> MCPToolResult:
        """Route and execute a tool call across registered MCP servers."""
        if server_name:
            client = self._clients.get(server_name)
            if not client:
                return MCPToolResult(
                    tool_name=tool_name,
                    success=False,
                    content="",
                    error=f"MCP server '{server_name}' not found.",
                )
            return await client.call_tool(tool_name, arguments)

        # Search across all clients for matching tool
        for client in self._clients.values():
            if client.get_tool(tool_name) is not None:
                return await client.call_tool(tool_name, arguments)

        return MCPToolResult(
            tool_name=tool_name,
            success=False,
            content="",
            error=f"MCP tool '{tool_name}' not found on any registered server.",
        )


_global_registry: MCPToolRegistry | None = None


def get_mcp_registry() -> MCPToolRegistry:
    """Access singleton MCP tool registry."""
    global _global_registry
    if _global_registry is None:
        _global_registry = MCPToolRegistry()
    return _global_registry

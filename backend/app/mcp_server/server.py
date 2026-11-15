import argparse
import asyncio
import logging

from mcp.server.mcpserver import MCPServer

from app.mcp_server.tools import (
    execute_get_report,
    execute_search_my_documents,
    execute_start_research,
)

logger = logging.getLogger("researchpilot.mcp_server")


def create_mcp_server() -> MCPServer:
    """Create and configure the ResearchPilot AI Model Context Protocol (MCP) server."""
    server = MCPServer(
        name="researchpilot",
        instructions=(
            "ResearchPilot AI MCP Server provides autonomous, evidence-grounded scientific "
            "research workflows, hybrid retrieval across private document libraries, and "
            "synthesized report extraction with strict adversarial citation grounding."
        ),
        version="0.1.0",
    )

    @server.tool(
        description=(
            "Initiate an autonomous multi-agent research workflow on a specified scientific or "
            "technical topic. Returns session_id for progress streaming and report retrieval. "
            "Requires valid user authentication token."
        )
    )
    async def start_research(
        query: str,
        token: str,
        approval_required: bool = False,
        max_iterations: int = 2,
    ) -> str:
        """Start a new research investigation session."""
        return await execute_start_research(
            query=query,
            token=token,
            approval_required=approval_required,
            max_iterations=max_iterations,
        )

    @server.tool(
        description=(
            "Retrieve complete markdown synthesis report, citations, and verified sources "
            "for a given research session. Requires valid user authentication token and "
            "enforces strict tenant isolation."
        )
    )
    async def get_report(session_id: str, token: str) -> str:
        """Fetch compiled research dossier and sources by session UUID."""
        return await execute_get_report(session_id=session_id, token=token)

    @server.tool(
        description=(
            "Execute a hybrid search (pgvector semantic similarity fused with PostgreSQL tsvector "
            "keyword search via Reciprocal Rank Fusion) across the authenticated user's private "
            "indexed documents. Requires valid user authentication token."
        )
    )
    async def search_my_documents(
        query: str,
        token: str,
        limit: int = 5,
    ) -> str:
        """Search authenticated user's document knowledge base."""
        return await execute_search_my_documents(
            query=query,
            token=token,
            limit=limit,
        )

    return server


def main():
    """CLI entrypoint for running the ResearchPilot MCP server."""
    parser = argparse.ArgumentParser(description="ResearchPilot AI MCP Server")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse"],
        default="stdio",
        help="Transport protocol (stdio for CLI/IDE or sse for network)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host for SSE transport",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8001,
        help="Port for SSE transport",
    )
    args = parser.parse_args()

    server = create_mcp_server()

    if args.transport == "stdio":
        asyncio.run(server.run_stdio_async())
    else:
        # Run SSE transport
        asyncio.run(server.run_sse_async(host=args.host, port=args.port))


if __name__ == "__main__":
    main()

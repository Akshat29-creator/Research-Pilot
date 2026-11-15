# ADR-006: Model Context Protocol (MCP) Server Architecture

## Context and Problem Statement
External developer environments and autonomous coding agents (Claude Desktop, Cursor, Antigravity, VS Code Copilot) need a standardized, protocol-level mechanism to interact with ResearchPilot AI:
- Triggering complex multi-agent research jobs without manually driving web interfaces.
- Inspecting completed dossiers, executive summaries, and reviewer grounding scores.
- Executing hybrid RAG queries against privately indexed research literature.

How should ResearchPilot AI expose its capabilities while maintaining strict hardware isolation and token-scoped security?

## Considered Options
1. **Custom REST API endpoints only**: Require custom plugins or brittle curl wrappers for each IDE.
2. **OpenAI Assistant API emulation**: Complex stateful thread management that does not fit external agent ecosystems.
3. **Model Context Protocol (MCP 2.3.0) via `stdio` and `sse`**: Standard JSON-RPC 2.0 tool specification natively adopted by leading developer tools.

## Decision Outcome
Chosen option: **Model Context Protocol (MCP 2.3.0) with stdio and SSE transports**.

### Rationale
- Supported natively by Claude Desktop, Cursor, and Antigravity.
- Stdio transport provides zero-overhead inter-process communication without exposing network ports or TLS complications.
- SSE transport enables distributed agent swarms to stream tools remotely.
- All research dispatches enforce the global `asyncio.Semaphore(1)` inference lock on the host GPU.

## Consequences
### Positive
- One-click integration in `claude_desktop_config.json` or `.cursor/mcp.json`.
- Typed Pydantic schemas for all tool arguments (`start_research`, `get_report`, `search_my_documents`).
- Authenticated via JWT token validation tied to local researcher accounts.

### Negative / Trade-offs
- Requires maintaining dual transport entry points (`stdio` for local, `sse` for network).
- Client agents must adhere to JSON-RPC 2.0 error response structures.

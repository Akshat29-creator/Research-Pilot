---
name: mcp-server
description: Standards and implementation patterns for exposing ResearchPilot AI capabilities through a Model Context Protocol (MCP) server with authentication, input validation, permissions, and tool schemas.
---

# Model Context Protocol (MCP) Server Skill

## When to Use
Use when implementing or updating the ResearchPilot MCP server, defining tool schemas, managing client authentication, enforcing authorization boundaries, or testing MCP client-server communications.

## Exposed Tools
ResearchPilot AI exposes three core MCP tools:
1. `start_research`: Initiates a new background multi-agent research workflow given a query and configuration parameters.
2. `get_report`: Retrieves the complete markdown report, metadata, and citation list for a given research session or report ID.
3. `search_my_documents`: Queries the authenticated user's private pgvector document store using semantic or hybrid search.

## Step-by-Step Procedure

### 1. Server Protocol Setup (`app/integrations/mcp_server/`)
- Implement the MCP server using standard STDIO or SSE transport.
- Maintain protocol compliance with the Model Context Protocol specification.

### 2. Authentication & Tenant Isolation
- Require an API token / Bearer secret on connection or tool invocation.
- Resolve the token to an authenticated `user_id`.
- Enforce strict tenancy: `search_my_documents` and `get_report` must only return entities owned by the authenticated user.

### 3. Tool Schemas & Input Validation
- Define tool inputs using strict Pydantic models / JSONSchema:
  ```python
  class StartResearchInput(BaseModel):
      query: str = Field(..., min_length=5, max_length=1000, description="The research question to investigate")
      max_sources: int = Field(5, ge=1, le=15, description="Maximum number of external sources to analyze")
      enable_web_search: bool = Field(True, description="Whether to perform web search")
  ```
- Reject invalid arguments with standard MCP error codes.

### 4. Safety & Rate Limiting
- Apply per-user rate limits to prevent DoS attacks through MCP automation.
- Never expose sensitive system configurations, API keys, or database connection strings via tool output.
- Log all MCP tool invocations with timestamp, `user_id`, and tool name.

## Verification Checklist
- [ ] Tools adhere to the MCP schema specification.
- [ ] Authentication required for all tool invocations.
- [ ] User ownership enforced on all retrieved data.
- [ ] Input parameters strictly validated against schemas.
- [ ] Demonstrated integration test with an external MCP client.

## Common Mistakes to Avoid
- **Unauthenticated MCP Endpoints**: Allowing arbitrary clients to invoke research pipelines without credentials.
- **Cross-Tenant Data Exposure**: Permitting an MCP client to retrieve reports belonging to other users.
- **Unbounded Inputs**: Allowing unbounded text lengths in `query` or unlimited source limits, causing server exhaustion.
- **Leaking Secrets in Tool Descriptions or Error Traces**: Outputting raw traceback details containing environment credentials.

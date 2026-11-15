# Model Context Protocol (MCP) Server

## 1. Overview

ResearchPilot AI exposes its core multi-agent research capabilities, knowledge retrieval engine, and synthesis artifacts through a standards-compliant **Model Context Protocol (MCP 2.3.0)** server.

This allows external AI desktop environments (Claude Desktop, Cursor, Antigravity, VS Code Copilot) and external agents to autonomously dispatch deep research investigations, inspect ongoing pipeline states, retrieve compiled dossiers, and perform hybrid RAG queries against local indexed literature.

---

## 2. Server Architecture

```mermaid
flowchart LR
    subgraph Host["Host IDE / Agent Workspace"]
        Client["MCP Client\n(Claude / Cursor / Antigravity)"]
    end

    subgraph ResearchPilot["ResearchPilot MCP Server (mcp 2.3.0)"]
        Transport["Transport Layer\n(stdio / sse)"]
        Auth["Auth & Security Guard\n(JWT Verification)"]
        Tools["Tool Registry\n(@server.tool())"]
    end

    subgraph CoreBackend["ResearchPilot Core Engine"]
        FastAPI["FastAPI / Database Session"]
        PG["PostgreSQL 16 + pgvector"]
        LangGraph["LangGraph Multi-Agent Engine"]
    end

    Client <-->|JSON-RPC 2.0| Transport
    Transport --> Auth
    Auth --> Tools
    Tools --> FastAPI
    FastAPI --> PG
    FastAPI --> LangGraph
```

### Key Technical Specifications
- **SDK**: `mcp 2.3.0` (`mcp.server.mcpserver.MCPServer`)
- **Transports**:
  - `stdio`: High-efficiency standard I/O pipes for local desktop agents without network listening overhead.
  - `sse`: HTTP Server-Sent Events transport for distributed or networked agent workflows.
- **Protocol**: JSON-RPC 2.0 specification with typed tool inputs and structured output payloads.
- **Hardware Isolation**: All operations dispatching research jobs respect the global `asyncio.Semaphore(1)` inference lock on the host NVIDIA GeForce RTX 5060 GPU.

---

## 3. Tool Specifications & Schemas

The MCP server registers three primary high-leverage tools:

### Tool 1: `start_research`
Dispatches a full multi-agent research workflow across the 5-node LangGraph pipeline.

- **Parameters**:
  - `query` (`string`, required): Research inquiry, hypothesis, or technical question to investigate.
  - `approval_required` (`boolean`, optional, default: `true`): Whether the pipeline must pause for human-in-the-loop review at the Analyst stage before report generation.
- **Return Value**:
  - `session_id` (`string`): Unique UUID for the launched research session.
  - `status` (`string`): Initial session state (`"created"` or `"running"`).
  - `message` (`string`): Confirmation of job queuing and GPU lock reservation.

### Tool 2: `get_report`
Retrieves the completed, evidence-grounded research report for an existing session.

- **Parameters**:
  - `session_id` (`string`, required): The UUID of the research session.
- **Return Value**:
  - `session_id` (`string`): Target session UUID.
  - `title` (`string`): Research dossier title.
  - `markdown_content` (`string`): Complete, formatted Markdown report with section headings, empirical tables, and IEEE-style citation markers `[1]`, `[2]`.
  - `grounding_score` (`float`): Adversarial reviewer grounding verification score (0.0 to 1.0).
  - `created_at` (`string`): ISO 8601 generation timestamp.

### Tool 3: `search_my_documents`
Performs hybrid full-text (PostgreSQL `tsvector`) and dense vector similarity (768-d `nomic-embed-text` cosine distance) retrieval over private indexed research papers and PDFs.

- **Parameters**:
  - `query` (`string`, required): Search string or semantic question.
  - `limit` (`integer`, optional, default: `5`): Maximum number of ranked chunks to return (1-20).
- **Return Value**:
  - Array of matching chunks with document title, chunk text, similarity score, and source metadata.

---

## 4. Client Integration Guides

### Integration A: Claude Desktop (`claude_desktop_config.json`)

On Windows, open `%APPDATA%\Claude\claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "researchpilot": {
      "command": "d:\\research pilot\\backend\\.venv\\Scripts\\python.exe",
      "args": [
        "-m",
        "app.mcp_server.server",
        "--transport",
        "stdio"
      ],
      "env": {
        "PYTHONPATH": "d:\\research pilot\\backend",
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/researchpilot",
        "JWT_SECRET_KEY": "researchpilot-dev-secret-key-change-in-production-min-32-chars",
        "RESEARCHPILOT_MCP_TOKEN": "<YOUR_LOCAL_ACCESS_TOKEN>"
      }
    }
  }
}
```

### Integration B: Cursor IDE (`.cursor/mcp.json`)

Inside your Cursor workspace, add:

```json
{
  "mcpServers": {
    "researchpilot": {
      "command": "python",
      "args": [
        "-m",
        "app.mcp_server.server",
        "--transport",
        "stdio"
      ],
      "env": {
        "PYTHONPATH": "${workspaceFolder}/backend",
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/researchpilot"
      }
    }
  }
}
```

---

## 5. Verification & Testing

The MCP server is comprehensively covered by unit and live integration suites:
- **Unit Suite** (`backend/tests/unit/test_mcp_server.py`): 10 tests covering tool registration, input validation, authentication guard, and payload serialization.
- **Live Integration Suite** (`backend/tests/integration/test_mcp_server_live.py`): 3 live tests verifying stdio JSON-RPC handshake, live database session creation, and error handling.

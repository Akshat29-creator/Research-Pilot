# Advanced Agent Capabilities & Model Context Protocol (MCP)

This document outlines the architecture, security guarantees, and execution semantics of **ResearchPilot AI's** Phase 6 capabilities:
1. **Model Context Protocol (MCP) Client** for sandboxed, validated tool invocation.
2. **Human-in-the-Loop (HITL)** approval gates and workflow interrupts.
3. **PostgreSQL Checkpoint Persistence & Crash Recovery** via LangGraph `AsyncPostgresSaver`.

---

## 1. Model Context Protocol (MCP) Client

ResearchPilot AI integrates external tools and system APIs using the **Model Context Protocol (MCP)** specification.

### Architectural Diagram
```
+-------------------------------------------------------+
|                 MCPToolRegistry                       |
|   - Maps tool names to registered MCPClient instances |
|   - Aggregates tool manifests across all servers      |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|                     MCPClient                         |
|   1. Schema Validation (types, required properties)   |
|   2. Timeout Enforcement (15s non-blocking bound)     |
|   3. Sandboxed Async Execution                        |
|   4. Prompt Injection Defense (ChatML defanging)      |
+-------------------------------------------------------+
```

### Core Security & Hardening Features
- **Schema Validation**: Every tool call validates incoming parameters against the tool's JSON schema definitions (`input_schema`). Missing required arguments or type mismatches are rejected immediately before invocation.
- **Execution Timeout**: Calls are bounded by `asyncio.wait_for(..., timeout=timeout_seconds)` (default 15.0s), preventing hung child processes or external network blocks from stalling the agent.
- **Prompt Injection Defense**: All untrusted text output returned by MCP tools is processed through `sanitize_untrusted_text()`. Control tokens such as `<|im_start|>`, `<|im_end|>`, and `system:` prefixes are neutralized with safe tokens (e.g. `[CHATML_START_DEFANGED]`), preventing tool outputs from hijacking model context.

### Code Structure
- `backend/app/integrations/mcp/models.py`: Pydantic v2 schemas (`MCPToolDefinition`, `MCPToolParameter`, `MCPToolCall`, `MCPToolResult`).
- `backend/app/integrations/mcp/client.py`: Async client implementation with validation, timeout, and defense wrappers.
- `backend/app/integrations/mcp/registry.py`: Singleton `MCPToolRegistry` managing registered tool providers.

---

## 2. Human-in-the-Loop (HITL) Approvals & Interrupts

Autonomous agents require human oversight on critical decisions (such as high-impact plan validation or destructive operations).

### Approval State Machine
```
                       +---------------+
                       |  Orchestrator |
                       +---------------+
                               |
                               v
                     [gate_approval: plan]
                               |
                   approval_required == True?
                    /                      \
                 (No)                      (Yes)
                  |                          |
                  |                +--------------------+
                  |                | LangGraph interrupt|
                  |                | (Saves Checkpoint) |
                  |                +--------------------+
                  |                          |
                  |             Wait for User Decision via API
                  |             (Command(resume={...}))
                  |                          |
                  |                +--------------------+
                  |                |   Resumed State    |
                  |                +--------------------+
                  |                          |
                  +------------+-------------+
                               |
                               v
                    route_after_orchestrator
                     /                    \
              (APPROVED)               (REJECTED)
                  /                          \
                 v                            v
          [Researcher Node]                 [END]
```

### Key Components
- `gate_approval(step_name, state, payload)`: Calls LangGraph's native `interrupt()` when `approval_required=True` in workflow state. Execution suspends and state is flushed to persistent storage.
- `Approval` Database Model (`backend/app/models/approval.py`): Persists human review requests in PostgreSQL with session ID, step name, structured payload, and audit timestamps.
- `route_after_orchestrator(state)`: Evaluates approval status. If rejected, execution routes cleanly to `END` without executing subsequent research or synthesis nodes.
- `resume_research_workflow(thread_id, resume_value, checkpointer)`: Injects `Command(resume=...)` into the compiled workflow graph, resuming from the exact point of interruption.

---

## 3. PostgreSQL Checkpoint Persistence & Crash Recovery

To ensure fault tolerance across long-running scientific research sessions, ResearchPilot AI leverages PostgreSQL-backed persistence via `langgraph-checkpoint-postgres`.

### Storage Architecture
The PostgreSQL database (`researchpilot-postgres`) maintains dedicated checkpoint tables:
1. `checkpoints`: Thread ID, checkpoint ID, timestamp, and serialized state graphs.
2. `checkpoint_blobs`: Binary serialized channel values and state variables.
3. `checkpoint_writes`: Intermediate write logs between state transitions.
4. `checkpoint_migrations`: Schema version tracking for checkpointer evolution.

### Crash Recovery Guarantees
- **Zero In-Memory Volatility**: Checkpoints are committed to PostgreSQL at every state transition boundary and interrupt gate.
- **Worker Process Recovery**: If a worker node crashes or restarts while waiting for human input, another worker can resume the thread immediately by querying `thread_id` from PostgreSQL.
- **Hardware Zero-Cost During Pauses**: When a workflow is suspended at an interrupt, no active threads, event loop tasks, or GPU VRAM allocations remain open. Resources are completely freed for other active research queries.

### Integration Testing Verification
Verified via live PostgreSQL integration suite `backend/tests/integration/test_checkpointer_recovery.py`:
- `test_postgres_checkpointer_pause_and_resume`: Verified pausing at orchestrator interrupt, writing checkpoint to PostgreSQL `checkpoints` table, and resuming to full report generation.
- `test_postgres_checkpointer_reject_and_halt`: Verified rejecting research plan at interrupt routes immediately to `END` with status `REJECTED`.

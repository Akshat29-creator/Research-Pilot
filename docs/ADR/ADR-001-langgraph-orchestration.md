# ADR-001: Selection of LangGraph for Multi-Agent Orchestration

## Status
Accepted

## Context & Problem Statement
ResearchPilot AI requires an agent orchestration framework to manage a sequential pipeline of specialized agents (Orchestrator -> Research -> Analysis -> Writer -> Reviewer) that supports:
1. Cyclical review loops (Writer drafts -> Reviewer evaluates -> Writer revises if needed).
2. Strict bounding of cycles to prevent infinite loops.
3. Durable persistence to survive server crashes or restarts.
4. Human-in-the-loop pauses (e.g. user approval of sources or draft reports).
5. Strong type safety for shared agent state.

## Considered Options
1. **LangGraph (Selected)**
2. **CrewAI**
3. **AutoGen (Microsoft)**
4. **Custom In-House Async State Machine**

## Decision Outcome
Chosen option: **LangGraph**, because:
- **StateGraph Model**: Formally defines nodes and conditional routing edges with a shared `TypedDict` / Pydantic state dictionary.
- **Durable Checkpointing**: Native integration with PostgreSQL (`AsyncPostgresSaver`) allows saving execution state after every node and resuming seamlessly across crashes.
- **Human-in-the-Loop Primitives**: First-class support for `interrupt()` and resume patterns.
- **Loop Bounding**: Native support for edge conditionals, allowing hard caps on review iterations (e.g. max 3 iterations).

## Consequences
- **Positive**:
  - Predictable execution flows without chaotic multi-agent broadcast storms.
  - Zero loss of agent progress on server interruption.
  - Easy visualization of agent execution paths.
- **Negative / Trade-offs**:
  - Learning curve for LangGraph state mutation rules (state updates must return dict deltas rather than mutating objects in-place).
  - Checkpoint database schema must be initialized and maintained.

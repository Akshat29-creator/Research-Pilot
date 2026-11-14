import logging
from typing import Any, AsyncIterator, Dict, Tuple

from langgraph.checkpoint.base import BaseCheckpointSaver

from app.workflows.builder import compile_research_workflow
from app.workflows.state import ResearchWorkflowState, create_initial_state

logger = logging.getLogger("researchpilot.workflows.runner")


async def run_research_workflow(
    query: str,
    session_id: str | None = None,
    user_id: str | None = None,
    max_iterations: int = 3,
    checkpointer: BaseCheckpointSaver | None = None,
) -> ResearchWorkflowState:
    """Execute complete multi-agent research pipeline to completion."""
    initial_state = create_initial_state(
        query=query,
        session_id=session_id,
        user_id=user_id,
        max_iterations=max_iterations,
    )
    thread_id = initial_state["session_id"]
    workflow = compile_research_workflow(checkpointer=checkpointer)

    config: Dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    logger.info("Executing research workflow for thread_id=%s, query='%s'", thread_id, query)

    final_state = await workflow.ainvoke(initial_state, config=config)
    return final_state


async def stream_research_workflow(
    query: str,
    session_id: str | None = None,
    user_id: str | None = None,
    max_iterations: int = 3,
    checkpointer: BaseCheckpointSaver | None = None,
) -> AsyncIterator[Tuple[str, Dict[str, Any]]]:
    """Stream node execution step events for real-time SSE updates."""
    initial_state = create_initial_state(
        query=query,
        session_id=session_id,
        user_id=user_id,
        max_iterations=max_iterations,
    )
    thread_id = initial_state["session_id"]
    workflow = compile_research_workflow(checkpointer=checkpointer)

    config: Dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    logger.info("Streaming research workflow steps for thread_id=%s", thread_id)

    async for event in workflow.astream(initial_state, config=config, stream_mode="updates"):
        for node_name, node_update in event.items():
            yield (node_name, node_update)

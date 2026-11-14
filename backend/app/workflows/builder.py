import logging
from typing import Any

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.workflows.nodes import (
    analyst_node,
    final_report_node,
    orchestrator_node,
    researcher_node,
    reviewer_node,
    writer_node,
)
from app.workflows.router import route_after_orchestrator, route_after_review
from app.workflows.state import ResearchWorkflowState

logger = logging.getLogger("researchpilot.workflows.builder")


def build_research_graph() -> StateGraph:
    """Construct the raw StateGraph for ResearchPilot AI multi-agent pipeline."""
    graph = StateGraph(ResearchWorkflowState)

    # 1. Add all 6 specialized agent nodes
    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node("researcher", researcher_node)
    graph.add_node("analyst", analyst_node)
    graph.add_node("writer", writer_node)
    graph.add_node("reviewer", reviewer_node)
    graph.add_node("final_report", final_report_node)

    # 2. Add sequential linear edges & human-in-the-loop plan gate
    graph.add_edge(START, "orchestrator")
    graph.add_conditional_edges(
        "orchestrator",
        route_after_orchestrator,
        {
            "researcher": "researcher",
            "end": END,
        },
    )
    graph.add_edge("researcher", "analyst")
    graph.add_edge("analyst", "writer")
    graph.add_edge("writer", "reviewer")

    # 3. Add bounded adversarial review feedback loop
    graph.add_conditional_edges(
        "reviewer",
        route_after_review,
        {
            "writer": "writer",
            "final_report": "final_report",
        },
    )

    # 4. Final terminal edge
    graph.add_edge("final_report", END)

    return graph


def compile_research_workflow(checkpointer: BaseCheckpointSaver | None = None) -> Any:
    """Compile the ResearchPilot AI StateGraph with optional persistence checkpointer."""
    graph = build_research_graph()
    active_checkpointer = checkpointer if checkpointer is not None else MemorySaver()
    compiled = graph.compile(checkpointer=active_checkpointer)
    logger.info(
        "Compiled ResearchPilot AI StateGraph with checkpointer=%s",
        type(active_checkpointer).__name__,
    )
    return compiled

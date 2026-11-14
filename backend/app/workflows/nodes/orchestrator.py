import logging
import time
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.integrations.llm.factory import get_llm_provider
from app.workflows.interrupts import gate_approval
from app.workflows.state import ResearchWorkflowState

logger = logging.getLogger("researchpilot.workflows.orchestrator")


class OrchestratorPlanSchema(BaseModel):
    """Pydantic schema for structured research query decomposition."""

    plan_steps: List[str] = Field(description="Step-by-step investigation methodology.")
    sub_queries: List[str] = Field(description="2 to 3 targeted search queries.")


async def orchestrator_node(state: ResearchWorkflowState) -> Dict[str, Any]:
    """Orchestrator node: analyzes topic and generates decomposition plan and search queries."""
    start_time = time.perf_counter()
    query = state.get("query", "").strip()

    logger.info("Orchestrator node executing for query: '%s'", query)

    # Deterministic baseline queries in case of offline/fallback
    fallback_sub_queries = [query]
    if " vs " in query.lower() or " versus " in query.lower():
        fallback_sub_queries.append(f"{query} benchmark performance comparison")
    else:
        fallback_sub_queries.append(f"{query} technical architecture overview")

    fallback_plan = [
        {"step": 1, "description": "Decompose query into technical domains."},
        {"step": 2, "description": "Gather empirical evidence across academic and web sources."},
        {"step": 3, "description": "Synthesize verified findings with strict citation grounding."},
    ]

    llm = get_llm_provider()
    system_prompt = (
        "You are the ResearchPilot AI Chief Orchestrator.\n"
        "Decompose the user's research topic into a 3-step investigation plan "
        "and 2-3 focused search queries."
    )
    user_prompt = (
        f"RESEARCH TOPIC:\n{query}\n\n"
        "Formulate a rigorous research plan and targeted search queries."
    )

    try:
        plan_result = await llm.generate_structured(
            prompt=user_prompt,
            response_model=OrchestratorPlanSchema,
            system=system_prompt,
        )
        plan_steps = [
            {"step": i + 1, "description": s} for i, s in enumerate(plan_result.plan_steps)
        ]
        sub_queries = plan_result.sub_queries if plan_result.sub_queries else fallback_sub_queries
    except Exception as e:
        logger.warning("LLM planning fallback due to: %s", str(e))
        plan_steps = fallback_plan
        sub_queries = fallback_sub_queries

    elapsed = (time.perf_counter() - start_time) * 1000
    timings = dict(state.get("timings", {}))
    timings["orchestrator"] = elapsed

    # Check if human-in-the-loop approval gate is active
    gate_update = gate_approval(
        step_name="plan_approval",
        state=state,
        payload={"plan": plan_steps, "sub_queries": sub_queries},
    )

    new_status = gate_update.get("status", "PLANNED")
    errors = list(state.get("errors", []))
    if "errors" in gate_update:
        errors.extend(gate_update["errors"])

    return {
        "plan": plan_steps,
        "sub_queries": sub_queries,
        "status": new_status,
        "errors": errors,
        "timings": timings,
    }

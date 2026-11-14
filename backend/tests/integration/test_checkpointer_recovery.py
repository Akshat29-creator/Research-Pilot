import asyncio
import sys
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import text

from app.database.session import async_session_factory, engine
from app.integrations.search.base import SearchResult
from app.workflows.builder import compile_research_workflow
from app.workflows.checkpointer import get_async_postgres_checkpointer
from app.workflows.runner import resume_research_workflow
from app.workflows.state import create_initial_state


@pytest.fixture(autouse=True)
def setup_windows_event_loop_policy():
    """Ensure WindowsSelectorEventLoopPolicy is active for psycopg async on Windows."""
    if sys.platform == "win32":
        try:
            current_policy = asyncio.get_event_loop_policy()
            if not isinstance(current_policy, asyncio.WindowsSelectorEventLoopPolicy):
                asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        except Exception:
            pass


@pytest.fixture(autouse=True)
async def cleanup_db_engine():
    """Ensure database connection pool is disposed cleanly after tests."""
    yield
    await engine.dispose()


@pytest.fixture
def mock_evidence_search():
    """Mock search and fetch to keep workflow test execution isolated and deterministic."""
    mock_results = [
        SearchResult(
            title="State Checkpointing in Distributed Agent Workflows",
            url="https://arxiv.org/abs/2401.12345",
            snippet="Fault tolerance, checkpoint persistence, and resume semantics in LangGraph.",
            domain="arxiv.org",
            engine="searxng",
        )
    ]
    with patch("app.workflows.nodes.researcher.get_search_provider") as mock_get_sp:
        mock_sp = AsyncMock()
        mock_sp.search.return_value = mock_results
        mock_get_sp.return_value = mock_sp
        with patch(
            "app.workflows.nodes.researcher.safe_fetch_url",
            new_callable=AsyncMock,
            return_value="<html><body><p>Checkpoint persistence in PostgreSQL.</p></body></html>",
        ):
            yield


@pytest.mark.asyncio
async def test_postgres_checkpointer_pause_and_resume(mock_evidence_search):
    """Verify workflow halts at approval gate, persists in Postgres, and resumes to completion."""
    thread_id = str(uuid.uuid4())

    async with get_async_postgres_checkpointer() as checkpointer:
        workflow = compile_research_workflow(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": thread_id}}

        initial_state = create_initial_state(
            query="Distributed Checkpointing in LangGraph",
            session_id=thread_id,
            approval_required=True,
            max_iterations=1,
        )

        # 1. Execute workflow until the approval interrupt
        await workflow.ainvoke(initial_state, config=config)

        # 2. Inspect persisted state at interrupt checkpoint
        current_state = await workflow.aget_state(config)
        assert current_state.next == ("orchestrator",)
        assert len(current_state.tasks) > 0

        interrupt_tasks = [t for t in current_state.tasks if t.interrupts]
        assert len(interrupt_tasks) == 1
        interrupt_val = interrupt_tasks[0].interrupts[0].value
        assert interrupt_val["step_name"] == "plan_approval"
        assert interrupt_val["session_id"] == thread_id
        assert "plan" in interrupt_val["payload"]

        # 3. Verify PostgreSQL checkpoints table actually holds checkpoint data
        async with async_session_factory() as session:
            res = await session.execute(
                text("SELECT count(*) FROM checkpoints WHERE thread_id = :thread_id"),
                {"thread_id": thread_id},
            )
            count = res.scalar()
            assert count is not None and count > 0

        # 4. Resume the workflow with approval
        resumed_state = await resume_research_workflow(
            thread_id=thread_id,
            resume_value={"approved": True, "feedback": "Approved by integration test"},
            checkpointer=checkpointer,
        )

        assert resumed_state["status"] in ("COMPLETED", "NEEDS_HUMAN_REVIEW")
        assert resumed_state["draft_report"] is not None
        assert resumed_state["final_report_markdown"] is not None


@pytest.mark.asyncio
async def test_postgres_checkpointer_reject_and_halt():
    """Verify rejecting at approval gate routes to END and halts with status REJECTED."""
    thread_id = str(uuid.uuid4())

    async with get_async_postgres_checkpointer() as checkpointer:
        workflow = compile_research_workflow(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": thread_id}}

        initial_state = create_initial_state(
            query="Harmful or out-of-scope query",
            session_id=thread_id,
            approval_required=True,
            max_iterations=1,
        )

        # 1. Execute until interrupt
        await workflow.ainvoke(initial_state, config=config)

        current_state = await workflow.aget_state(config)
        assert current_state.next == ("orchestrator",)

        # 2. Resume with rejection
        resumed_state = await resume_research_workflow(
            thread_id=thread_id,
            resume_value={"approved": False, "feedback": "Rejected: off-topic"},
            checkpointer=checkpointer,
        )

        assert resumed_state["status"] == "REJECTED"
        assert any("Rejected: off-topic" in err for err in resumed_state.get("errors", []))
        # Ensure it halted at orchestrator -> END, without researcher or writer executing
        assert resumed_state.get("draft_report") is None
        assert resumed_state.get("final_report_markdown") is None

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.approval import Approval
from app.workflows.interrupts import (
    create_approval_record,
    gate_approval,
    get_pending_approvals,
    resolve_approval_record,
)
from app.workflows.router import route_after_orchestrator
from app.workflows.state import create_initial_state


def test_gate_approval_not_required():
    state = create_initial_state(query="test query", approval_required=False)
    result = gate_approval("plan_approval", state, {"plan": ["step 1"]})
    assert result == {}


def test_gate_approval_approved(monkeypatch):
    mock_interrupt = MagicMock(return_value={"approved": True, "feedback": "Looks great"})
    monkeypatch.setattr("app.workflows.interrupts.interrupt", mock_interrupt)

    state = create_initial_state(query="test query", approval_required=True)
    result = gate_approval("plan_approval", state, {"plan": ["step 1"]})

    mock_interrupt.assert_called_once()
    assert result == {"status": "IN_PROGRESS"}


def test_gate_approval_rejected(monkeypatch):
    mock_interrupt = MagicMock(return_value={"approved": False, "feedback": "Narrow scope to Rust"})
    monkeypatch.setattr("app.workflows.interrupts.interrupt", mock_interrupt)

    state = create_initial_state(query="test query", approval_required=True)
    result = gate_approval("plan_approval", state, {"plan": ["step 1"]})

    mock_interrupt.assert_called_once()
    assert result["status"] == "REJECTED"
    assert any("Narrow scope to Rust" in err for err in result["errors"])


def test_route_after_orchestrator():
    # Rejected state routes to 'end'
    rejected_state = create_initial_state(query="test")
    rejected_state["status"] = "REJECTED"
    assert route_after_orchestrator(rejected_state) == "end"

    # Normal / in-progress state routes to 'researcher'
    in_progress_state = create_initial_state(query="test")
    in_progress_state["status"] = "IN_PROGRESS"
    assert route_after_orchestrator(in_progress_state) == "researcher"

    planned_state = create_initial_state(query="test")
    planned_state["status"] = "PLANNED"
    assert route_after_orchestrator(planned_state) == "researcher"


@pytest.mark.asyncio
async def test_create_approval_record():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    session_id = uuid.uuid4()
    payload = {"plan": ["Step 1", "Step 2"]}

    approval = await create_approval_record(
        db=mock_session,
        session_id=session_id,
        step_name="plan_approval",
        payload=payload,
    )

    assert approval.session_id == session_id
    assert approval.step_name == "plan_approval"
    assert approval.payload == payload
    assert approval.status == "PENDING"
    mock_session.add.assert_called_once_with(approval)
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_resolve_approval_record_found():
    mock_session = AsyncMock()
    approval_id = uuid.uuid4()
    existing_approval = Approval(
        id=approval_id,
        session_id=uuid.uuid4(),
        step_name="plan_approval",
        payload={"step": 1},
        status="PENDING",
        created_at=datetime.now(UTC),
    )

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_approval
    mock_session.execute.return_value = mock_result

    resolved = await resolve_approval_record(
        db=mock_session,
        approval_id=approval_id,
        approved=True,
        feedback="Approved by test user",
    )

    assert resolved is not None
    assert resolved.status == "APPROVED"
    assert resolved.user_feedback == "Approved by test user"
    assert resolved.responded_at is not None
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_resolve_approval_record_not_found():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    resolved = await resolve_approval_record(
        db=mock_session,
        approval_id=uuid.uuid4(),
        approved=False,
    )

    assert resolved is None
    mock_session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_pending_approvals():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    sample_records = [
        Approval(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            step_name="plan_approval",
            payload={},
            status="PENDING",
        )
    ]
    mock_result.scalars.return_value.all.return_value = sample_records
    mock_session.execute.return_value = mock_result

    records = await get_pending_approvals(db=mock_session)
    assert len(records) == 1
    assert records[0].status == "PENDING"
    mock_session.execute.assert_awaited_once()

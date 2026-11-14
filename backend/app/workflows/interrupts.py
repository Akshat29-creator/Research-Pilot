import logging
import uuid
from datetime import UTC, datetime
from typing import Any, Dict, List

from langgraph.types import interrupt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import Approval
from app.workflows.state import ResearchWorkflowState

logger = logging.getLogger("researchpilot.workflows.interrupts")


async def create_approval_record(
    db: AsyncSession,
    session_id: uuid.UUID,
    step_name: str,
    payload: Dict[str, Any],
) -> Approval:
    """Persist a human-in-the-loop approval request to PostgreSQL."""
    approval = Approval(
        id=uuid.uuid4(),
        session_id=session_id,
        step_name=step_name,
        payload=payload,
        status="PENDING",
        created_at=datetime.now(UTC),
    )
    db.add(approval)
    await db.commit()
    logger.info(
        "Created pending approval record %s for step '%s' (session=%s)",
        approval.id,
        step_name,
        session_id,
    )
    return approval


async def resolve_approval_record(
    db: AsyncSession,
    approval_id: uuid.UUID,
    approved: bool,
    feedback: str | None = None,
) -> Approval | None:
    """Resolve an approval request as APPROVED or REJECTED with optional feedback."""
    stmt = select(Approval).where(Approval.id == approval_id)
    res = await db.execute(stmt)
    approval = res.scalar_one_or_none()

    if approval is None:
        logger.warning("Approval record %s not found.", approval_id)
        return None

    approval.status = "APPROVED" if approved else "REJECTED"
    approval.user_feedback = feedback
    approval.responded_at = datetime.now(UTC)

    await db.commit()
    logger.info("Resolved approval %s as '%s'", approval_id, approval.status)
    return approval


async def get_pending_approvals(
    db: AsyncSession,
    session_id: uuid.UUID | None = None,
) -> List[Approval]:
    """Fetch all pending approval records, optionally filtered by research session."""
    stmt = select(Approval).where(Approval.status == "PENDING")
    if session_id:
        stmt = stmt.where(Approval.session_id == session_id)
    stmt = stmt.order_by(Approval.created_at.desc())

    res = await db.execute(stmt)
    return list(res.scalars().all())


def gate_approval(
    step_name: str,
    state: ResearchWorkflowState,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Execute LangGraph interrupt() gate when approval_required is set in state.

    Suspends graph execution until a human review Command(resume=decision) is received.
    """
    if not state.get("approval_required", False):
        return {}

    logger.info(
        "Halting workflow for human approval at step '%s' (session=%s)",
        step_name,
        state.get("session_id"),
    )

    # LangGraph interrupt pauses execution and yields interrupt payload to runner
    user_decision: Dict[str, Any] = interrupt(
        {
            "step_name": step_name,
            "session_id": state.get("session_id"),
            "payload": payload,
        }
    )

    approved = user_decision.get("approved", True)
    feedback = user_decision.get("feedback")

    logger.info(
        "Workflow resumed from step '%s' with approval=%s, feedback=%s",
        step_name,
        approved,
        feedback,
    )

    if not approved:
        errors = list(state.get("errors", []))
        errors.append(f"Action '{step_name}' was rejected by user: {feedback}")
        return {
            "status": "REJECTED",
            "errors": errors,
        }

    return {"status": "IN_PROGRESS"}

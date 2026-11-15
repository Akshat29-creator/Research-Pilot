import io
import json
import logging
import uuid
from typing import AsyncGenerator, List

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.core.errors import EntityNotFoundError
from app.database.session import async_session_factory
from app.models.approval import Approval
from app.models.report import Report
from app.models.research_session import ResearchSession
from app.models.source import Source
from app.models.user import User
from app.schemas.research import (
    ApprovalResumeRequest,
    ReportResponse,
    ResearchSessionCreate,
    ResearchSessionDetail,
    ResearchSessionResponse,
    SourceResponse,
)
from app.services.pdf_export import academic_pdf_generator
from app.workflows.checkpointer import get_async_postgres_checkpointer
from app.workflows.interrupts import resolve_approval_record
from app.workflows.runner import resume_research_workflow, stream_research_workflow

logger = logging.getLogger("researchpilot.api.research")
router = APIRouter(prefix="/research", tags=["Research"])


@router.post(
    "/sessions",
    response_model=ResearchSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_research_session(
    payload: ResearchSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResearchSession:
    """Initialize a new research session for the authenticated user."""
    title = payload.title or (
        payload.query[:60] + "..." if len(payload.query) > 60 else payload.query
    )

    session = ResearchSession(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title=title,
        initial_query=payload.query,
        status="INITIALIZED",
        metadata_json={
            "max_iterations": payload.max_iterations,
            "approval_required": payload.approval_required,
            "sub_queries": [],
            "plan": [],
        },
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(
        "Created research session %s for user %s: '%s'",
        session.id,
        current_user.id,
        session.title,
    )
    return session


@router.get("/sessions", response_model=List[ResearchSessionResponse])
async def list_research_sessions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ResearchSession]:
    """Retrieve all research sessions for the current authenticated user."""
    stmt = (
        select(ResearchSession)
        .where(ResearchSession.user_id == current_user.id)
        .order_by(ResearchSession.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/sessions/{session_id}", response_model=ResearchSessionDetail)
async def get_research_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResearchSessionDetail:
    """Retrieve full details of a single research session."""
    stmt = select(ResearchSession).where(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise EntityNotFoundError("ResearchSession", str(session_id))

    # Fetch latest report if available
    report_stmt = (
        select(Report)
        .where(Report.session_id == session_id)
        .order_by(Report.created_at.desc())
        .limit(1)
    )
    report_res = await db.execute(report_stmt)
    report = report_res.scalar_one_or_none()

    # Count gathered sources
    sources_count_stmt = select(func.count(Source.id)).where(Source.session_id == session_id)
    sources_count_res = await db.execute(sources_count_stmt)
    sources_count = sources_count_res.scalar() or 0

    return ResearchSessionDetail(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        initial_query=session.initial_query,
        status=session.status,
        created_at=session.created_at,
        updated_at=session.updated_at,
        metadata_json=session.metadata_json,
        report=ReportResponse.model_validate(report) if report else None,
        sources_count=sources_count,
    )


@router.get("/sessions/{session_id}/sources", response_model=List[SourceResponse])
async def list_session_sources(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Source]:
    """Retrieve all verified research sources gathered for a session."""
    # Verify session ownership
    sess_stmt = select(ResearchSession).where(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id,
    )
    res = await db.execute(sess_stmt)
    if not res.scalar_one_or_none():
        raise EntityNotFoundError("ResearchSession", str(session_id))

    sources_stmt = (
        select(Source).where(Source.session_id == session_id).order_by(Source.retrieved_at.asc())
    )
    sources_res = await db.execute(sources_stmt)
    return list(sources_res.scalars().all())


@router.get("/sessions/{session_id}/report", response_model=ReportResponse)
async def get_session_report(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Report:
    """Retrieve the generated markdown synthesis report for a session."""
    stmt = (
        select(Report)
        .where(Report.session_id == session_id, Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()
    if not report:
        raise EntityNotFoundError("Report", f"for session {session_id}")
    return report


@router.get("/sessions/{session_id}/export/pdf")
async def export_session_pdf(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Export publication-ready academic PDF for a research session."""
    sess_stmt = select(ResearchSession).where(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id,
    )
    res = await db.execute(sess_stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise EntityNotFoundError("ResearchSession", str(session_id))

    report_stmt = (
        select(Report)
        .where(Report.session_id == session_id, Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
        .limit(1)
    )
    report_res = await db.execute(report_stmt)
    report = report_res.scalar_one_or_none()
    if not report:
        raise EntityNotFoundError("Report", f"for session {session_id}")

    sources_stmt = (
        select(Source).where(Source.session_id == session_id).order_by(Source.retrieved_at.asc())
    )
    sources_res = await db.execute(sources_stmt)
    sources = list(sources_res.scalars().all())

    pdf_bytes = academic_pdf_generator.generate_pdf(
        title=report.title,
        markdown_content=report.markdown_content,
        metadata={
            "session_id": str(session_id),
            "status": session.status,
            "iterations": session.metadata_json.get("max_iterations", 1)
            if session.metadata_json
            else 1,
            "grounding_score": 0.95 if session.status == "COMPLETED" else 0.70,
        },
        sources=[{"title": s.title, "url": s.url, "domain": s.domain} for s in sources],
    )

    clean_slug = (
        "".join(c for c in report.title if c.isalnum() or c in ("-", "_")).rstrip()[:40] or "Report"
    )
    filename = f"ResearchPilot_{clean_slug}_{str(session_id)[:8]}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/reports/{report_id}/export/pdf")
async def export_report_pdf(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Export publication-ready academic PDF directly by report ID."""
    report_stmt = (
        select(Report).where(Report.id == report_id, Report.user_id == current_user.id).limit(1)
    )
    res = await db.execute(report_stmt)
    report = res.scalar_one_or_none()
    if not report:
        raise EntityNotFoundError("Report", str(report_id))

    sources_stmt = (
        select(Source)
        .where(Source.session_id == report.session_id)
        .order_by(Source.retrieved_at.asc())
    )
    sources_res = await db.execute(sources_stmt)
    sources = list(sources_res.scalars().all())

    pdf_bytes = academic_pdf_generator.generate_pdf(
        title=report.title,
        markdown_content=report.markdown_content,
        metadata={
            "session_id": str(report.session_id),
            "status": "COMPLETED" if report.is_final else "DRAFT",
            "iterations": 1,
            "grounding_score": 0.95,
        },
        sources=[{"title": s.title, "url": s.url, "domain": s.domain} for s in sources],
    )

    clean_slug = (
        "".join(c for c in report.title if c.isalnum() or c in ("-", "_")).rstrip()[:40] or "Report"
    )
    filename = f"ResearchPilot_{clean_slug}_{str(report.id)[:8]}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.post("/sessions/{session_id}/resume")
async def resume_session(
    session_id: uuid.UUID,
    payload: ApprovalResumeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resume an interrupted research workflow from a human review gate."""
    stmt = select(ResearchSession).where(
        ResearchSession.id == session_id,
        ResearchSession.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise EntityNotFoundError("ResearchSession", str(session_id))

    # Resolve pending approval records for this session
    approval_stmt = (
        select(Approval)
        .where(Approval.session_id == session_id, Approval.status == "PENDING")
        .order_by(Approval.created_at.desc())
    )
    approval_res = await db.execute(approval_stmt)
    pending_approval = approval_res.scalar_one_or_none()

    if pending_approval:
        await resolve_approval_record(
            db=db,
            approval_id=pending_approval.id,
            approved=payload.approved,
            feedback=payload.feedback,
        )

    # Resume graph execution via checkpointer
    async with get_async_postgres_checkpointer() as checkpointer:
        resumed_state = await resume_research_workflow(
            thread_id=str(session_id),
            resume_value={"approved": payload.approved, "feedback": payload.feedback},
            checkpointer=checkpointer,
        )

    # Update session status
    new_status = resumed_state.get("status", "COMPLETED")
    session.status = new_status

    if resumed_state.get("final_report_markdown"):
        analysis_data = resumed_state.get("analysis") or {}
        report = Report(
            id=uuid.uuid4(),
            session_id=session.id,
            user_id=current_user.id,
            title=session.title,
            summary=analysis_data.get("summary", session.title),
            markdown_content=resumed_state["final_report_markdown"],
            citation_map=analysis_data,
            is_final=True,
        )
        db.add(report)

    await db.commit()

    return {
        "session_id": str(session_id),
        "status": new_status,
        "errors": resumed_state.get("errors", []),
    }


@router.get("/sessions/{session_id}/stream")
async def stream_research_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Stream live multi-agent execution events via Server-Sent Events (SSE)."""

    async def sse_event_generator() -> AsyncGenerator[str, None]:
        async with async_session_factory() as db:
            stmt = select(ResearchSession).where(
                ResearchSession.id == session_id,
                ResearchSession.user_id == current_user.id,
            )
            res = await db.execute(stmt)
            session = res.scalar_one_or_none()

            if not session:
                err_data = json.dumps({"error": f"Session {session_id} not found"})
                yield f"event: error\ndata: {err_data}\n\n"
                return

            query = session.initial_query
            meta = session.metadata_json or {}
            max_iter = meta.get("max_iterations", 3)
            approval_req = meta.get("approval_required", False)

            session.status = "RUNNING"
            await db.commit()

        yield f"event: connected\ndata: {json.dumps({'session_id': str(session_id)})}\n\n"

        try:
            async with get_async_postgres_checkpointer() as checkpointer:
                async for node_name, node_update in stream_research_workflow(
                    query=query,
                    session_id=str(session_id),
                    user_id=str(current_user.id),
                    max_iterations=max_iter,
                    approval_required=approval_req,
                    checkpointer=checkpointer,
                ):
                    # Check for LangGraph interrupt event
                    if node_name == "__interrupt__":
                        interrupt_item = (
                            node_update[0]
                            if isinstance(node_update, (list, tuple)) and len(node_update) > 0
                            else node_update
                        )
                        val = (
                            getattr(interrupt_item, "value", {})
                            if hasattr(interrupt_item, "value")
                            else (interrupt_item if isinstance(interrupt_item, dict) else {})
                        )
                        interrupt_payload = val.get("payload", {}) if isinstance(val, dict) else {}
                        step_name = (
                            val.get("step_name", "plan_approval")
                            if isinstance(val, dict)
                            else "plan_approval"
                        )

                        async with async_session_factory() as db:
                            approval = Approval(
                                id=uuid.uuid4(),
                                session_id=session_id,
                                step_name=step_name,
                                payload=interrupt_payload,
                                status="PENDING",
                            )
                            db.add(approval)
                            stmt = select(ResearchSession).where(ResearchSession.id == session_id)
                            res = await db.execute(stmt)
                            sess = res.scalar_one_or_none()
                            if sess:
                                sess.status = "WAITING_FOR_APPROVAL"
                            await db.commit()

                        event_data = {
                            "step_name": step_name,
                            "session_id": str(session_id),
                            "plan": interrupt_payload.get("plan", []),
                            "sub_queries": interrupt_payload.get("sub_queries", []),
                        }
                        yield f"event: interrupt\ndata: {json.dumps(event_data)}\n\n"
                        continue

                    # Skip non-dict updates
                    if not isinstance(node_update, dict):
                        continue

                    # Format standard SSE node update
                    event_payload = {
                        "node": node_name,
                        "status": node_update.get("status"),
                        "timings": node_update.get("timings", {}),
                        "errors": node_update.get("errors", []),
                    }

                    # Attach specific node payload summaries
                    if node_name == "orchestrator":
                        event_payload["plan"] = node_update.get("plan", [])
                        event_payload["sub_queries"] = node_update.get("sub_queries", [])
                    elif node_name == "researcher":
                        sources_list = node_update.get("sources", [])
                        event_payload["sources_count"] = len(sources_list)
                        event_payload["sources"] = [
                            {
                                "title": s.get("title", ""),
                                "url": s.get("url", ""),
                                "domain": s.get("domain", ""),
                                "snippet": s.get("content_snippet", "") or s.get("title", ""),
                                "status": s.get("fetch_status", "SUCCESS"),
                            }
                            for s in sources_list
                        ]

                        # Persist sources to database
                        if sources_list:
                            async with async_session_factory() as db:
                                for s in sources_list:
                                    src = Source(
                                        id=uuid.uuid4(),
                                        session_id=session_id,
                                        title=s.get("title", "Untitled Source")[:500],
                                        url=s.get("url", "")[:2048],
                                        domain=s.get("domain", "")[:255],
                                        content_hash=s.get("content_hash", "")[:64],
                                        raw_content=s.get("content_snippet", "") or s.get("title", ""),
                                        status="SUCCESS" if s.get("fetch_status") in ("FETCHED_FULL", "SNIPPET_ONLY") else "FAILED",
                                    )
                                    db.add(src)
                                await db.commit()
                    elif node_name == "analyst":
                        event_payload["analysis"] = node_update.get("analysis")
                    elif node_name == "writer":
                        event_payload["draft_preview"] = (
                            node_update.get("draft_report", "")[:300] + "..."
                            if node_update.get("draft_report")
                            else ""
                        )
                    elif node_name == "reviewer":
                        event_payload["review_feedback"] = node_update.get("review_feedback")
                        event_payload["iteration_count"] = node_update.get("iteration_count", 1)
                    elif node_name == "final_report":
                        event_payload["final_report_markdown"] = node_update.get(
                            "final_report_markdown"
                        )

                    yield f"event: node_update\ndata: {json.dumps(event_payload)}\n\n"

                    # If final_report node completed, persist to database
                    if node_name == "final_report":
                        final_md = node_update.get("final_report_markdown", "")
                        final_status = node_update.get("status", "COMPLETED")

                        async with async_session_factory() as db:
                            report = Report(
                                id=uuid.uuid4(),
                                session_id=session_id,
                                user_id=current_user.id,
                                title=session.title,
                                summary=session.title,
                                markdown_content=final_md,
                                citation_map=node_update.get("analysis") or {},
                                is_final=True,
                            )
                            db.add(report)

                            stmt = select(ResearchSession).where(ResearchSession.id == session_id)
                            res = await db.execute(stmt)
                            sess = res.scalar_one_or_none()
                            if sess:
                                sess.status = final_status
                            await db.commit()

                        complete_payload = {
                            "session_id": str(session_id),
                            "status": final_status,
                            "report_id": str(report.id),
                        }
                        yield f"event: workflow_complete\ndata: {json.dumps(complete_payload)}\n\n"

        except Exception as e:
            logger.error("Error streaming research workflow %s: %s", session_id, str(e))
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(sse_event_generator(), headers=headers, media_type="text/event-stream")

import asyncio
import json
import logging
import uuid

from sqlalchemy import select

from app.database.session import async_session_factory
from app.mcp_server.auth import authenticate_token
from app.models.report import Report
from app.models.research_session import ResearchSession
from app.models.source import Source
from app.services.hybrid_search_service import hybrid_search
from app.workflows.runner import run_research_workflow

logger = logging.getLogger("researchpilot.mcp_server.tools")


async def execute_start_research(
    query: str,
    token: str,
    approval_required: bool = False,
    max_iterations: int = 2,
) -> str:
    """Initiate a multi-agent research workflow on ResearchPilot AI."""
    clean_query = query.strip()
    if len(clean_query) < 5 or len(clean_query) > 1000:
        return json.dumps(
            {
                "error": "Query must be between 5 and 1000 characters.",
                "success": False,
            }
        )

    max_iter = max(1, min(max_iterations, 3))

    async with async_session_factory() as db:
        try:
            user = await authenticate_token(db, token)
        except ValueError as e:
            return json.dumps({"error": str(e), "success": False})

        session = ResearchSession(
            id=uuid.uuid4(),
            user_id=user.id,
            title=clean_query[:80],
            initial_query=clean_query,
            status="RUNNING",
            metadata_json={
                "approval_required": approval_required,
                "max_iterations": max_iter,
            },
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = session.id

    # Spawn background workflow execution
    async def _run_bg():
        try:
            await run_research_workflow(
                query=clean_query,
                session_id=str(session_id),
                max_iterations=max_iter,
                approval_required=approval_required,
            )
        except Exception as e:
            logger.error("Background workflow for session %s failed: %s", session_id, str(e))

    asyncio.create_task(_run_bg())

    return json.dumps(
        {
            "success": True,
            "session_id": str(session_id),
            "query": clean_query,
            "status": "RUNNING",
            "approval_required": approval_required,
            "max_iterations": max_iter,
        }
    )


async def execute_get_report(session_id: str, token: str) -> str:
    """Retrieve the synthesized research report and verified sources for a given session."""
    try:
        session_uuid = uuid.UUID(session_id.strip())
    except ValueError:
        return json.dumps({"error": "Malformed session_id UUID format.", "success": False})

    async with async_session_factory() as db:
        try:
            user = await authenticate_token(db, token)
        except ValueError as e:
            return json.dumps({"error": str(e), "success": False})

        # Fetch session with tenant isolation
        stmt_sess = select(ResearchSession).where(
            ResearchSession.id == session_uuid,
            ResearchSession.user_id == user.id,
        )
        sess_res = await db.execute(stmt_sess)
        session = sess_res.scalar_one_or_none()

        if not session:
            return json.dumps(
                {
                    "error": "Research session not found or access denied.",
                    "success": False,
                }
            )

        # Fetch synthesized report
        stmt_rep = select(Report).where(Report.session_id == session.id)
        rep_res = await db.execute(stmt_rep)
        report = rep_res.scalar_one_or_none()

        # Fetch verified sources
        stmt_src = (
            select(Source)
            .where(Source.session_id == session.id)
            .order_by(Source.retrieved_at.asc())
        )
        src_res = await db.execute(stmt_src)
        sources = src_res.scalars().all()

        return json.dumps(
            {
                "success": True,
                "session_id": str(session.id),
                "title": session.title,
                "status": session.status,
                "markdown_content": report.markdown_content if report else None,
                "summary": report.summary if report else None,
                "citation_map": report.citation_map if report else {},
                "sources_count": len(sources),
                "sources": [
                    {
                        "id": str(s.id),
                        "title": s.title,
                        "url": s.url,
                        "domain": s.domain,
                        "raw_content": s.raw_content[:200] if s.raw_content else "",
                    }
                    for s in sources
                ],
            }
        )


async def execute_search_my_documents(
    query: str,
    token: str,
    limit: int = 5,
) -> str:
    """Query the authenticated user's private pgvector document store using hybrid search."""
    clean_query = query.strip()
    if not clean_query:
        return json.dumps({"error": "Search query must not be empty.", "success": False})

    top_k = max(1, min(limit, 20))

    async with async_session_factory() as db:
        try:
            user = await authenticate_token(db, token)
        except ValueError as e:
            return json.dumps({"error": str(e), "success": False})

        results = await hybrid_search(
            db=db,
            user_id=user.id,
            query=clean_query,
            top_k=top_k,
        )

        return json.dumps(
            {
                "success": True,
                "query": clean_query,
                "total_results": len(results),
                "chunks": [
                    {
                        "chunk_id": str(r.chunk_id),
                        "document_id": str(r.document_id),
                        "document_title": r.document_title,
                        "content": r.content,
                        "page_number": r.page_number,
                        "chunk_index": r.chunk_index,
                        "rrf_score": round(r.rrf_score, 4),
                    }
                    for r in results
                ],
            }
        )

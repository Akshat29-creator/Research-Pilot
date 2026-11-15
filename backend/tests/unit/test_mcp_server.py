import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.mcp_server.server import create_mcp_server
from app.mcp_server.tools import (
    execute_get_report,
    execute_search_my_documents,
    execute_start_research,
)
from app.models.user import User
from app.services.hybrid_search_service import HybridChunkResult


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="researcher@pilot.ai",
        hashed_password="hash",
        is_active=True,
    )


@pytest.mark.asyncio
async def test_mcp_server_initialization_tools():
    """Verify that create_mcp_server registers all required ResearchPilot AI tools."""
    server = create_mcp_server()
    tools = await server.list_tools()
    tool_names = [t.name for t in tools]

    assert "start_research" in tool_names
    assert "get_report" in tool_names
    assert "search_my_documents" in tool_names


@pytest.mark.asyncio
async def test_start_research_query_bounds():
    """Verify query length validation (5 to 1000 characters)."""
    # Too short
    res_short = await execute_start_research(query="hi", token="tok")
    data = json.loads(res_short)
    assert data["success"] is False
    assert "between 5 and 1000" in data["error"]

    # Too long
    res_long = await execute_start_research(query="x" * 1001, token="tok")
    data = json.loads(res_long)
    assert data["success"] is False
    assert "between 5 and 1000" in data["error"]


@pytest.mark.asyncio
async def test_start_research_invalid_token():
    """Verify start_research fails cleanly when token cannot be verified."""
    with patch("app.mcp_server.tools.authenticate_token", side_effect=ValueError("Invalid token")):
        res = await execute_start_research(
            query="Deep learning architectures for genomics",
            token="invalid-token",
        )
        data = json.loads(res)
        assert data["success"] is False
        assert "Invalid token" in data["error"]


@pytest.mark.asyncio
async def test_start_research_success(mock_user):
    """Verify start_research creates session and spawns background workflow."""
    with (
        patch("app.mcp_server.tools.authenticate_token", return_value=mock_user),
        patch("app.mcp_server.tools.async_session_factory") as mock_asf,
        patch("app.mcp_server.tools.run_research_workflow", new_callable=AsyncMock),
    ):
        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_asf.return_value.__aenter__.return_value = mock_db

        res = await execute_start_research(
            query="PostgreSQL 16 pgvector memory optimizations",
            token="valid-token",
            approval_required=False,
            max_iterations=2,
        )
        data = json.loads(res)
        assert data["success"] is True
        assert data["status"] == "RUNNING"
        assert "session_id" in data
        assert data["query"] == "PostgreSQL 16 pgvector memory optimizations"


@pytest.mark.asyncio
async def test_get_report_malformed_uuid():
    """Verify get_report handles malformed UUID string gracefully."""
    res = await execute_get_report(session_id="not-a-uuid", token="tok")
    data = json.loads(res)
    assert data["success"] is False
    assert "Malformed session_id" in data["error"]


@pytest.mark.asyncio
async def test_get_report_unauthorized_or_not_found(mock_user):
    """Verify get_report enforces tenant isolation when session is missing or unauthorized."""
    with (
        patch("app.mcp_server.tools.authenticate_token", return_value=mock_user),
        patch("app.mcp_server.tools.async_session_factory") as mock_asf,
    ):
        mock_db = AsyncMock()
        mock_exec = MagicMock()
        mock_exec.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_exec)
        mock_asf.return_value.__aenter__.return_value = mock_db

        session_id = str(uuid.uuid4())
        res = await execute_get_report(session_id=session_id, token="tok")
        data = json.loads(res)
        assert data["success"] is False
        assert "not found or access denied" in data["error"]


@pytest.mark.asyncio
async def test_get_report_success(mock_user):
    """Verify get_report returns synthesis markdown and sources list for owned session."""
    session_id = uuid.uuid4()
    mock_session = MagicMock()
    mock_session.id = session_id
    mock_session.title = "Evaluation of HNSW vs IVFFlat"
    mock_session.status = "COMPLETED"

    mock_report = MagicMock()
    mock_report.markdown_content = "# Research Synthesis\n\nVerified findings."
    mock_report.summary = "Verified findings on pgvector."
    mock_report.citation_map = {"source_1": "arxiv.org"}

    mock_source = MagicMock()
    mock_source.id = uuid.uuid4()
    mock_source.title = "pgvector Benchmarks"
    mock_source.url = "https://arxiv.org/abs/2401.0001"
    mock_source.domain = "arxiv.org"
    mock_source.raw_content = "Empirical evaluation on PostgreSQL 16."

    with (
        patch("app.mcp_server.tools.authenticate_token", return_value=mock_user),
        patch("app.mcp_server.tools.async_session_factory") as mock_asf,
    ):
        mock_db = AsyncMock()
        exec1 = MagicMock()
        exec1.scalar_one_or_none.return_value = mock_session
        exec2 = MagicMock()
        exec2.scalar_one_or_none.return_value = mock_report
        exec3 = MagicMock()
        exec3.scalars.return_value.all.return_value = [mock_source]

        mock_db.execute = AsyncMock(side_effect=[exec1, exec2, exec3])
        mock_asf.return_value.__aenter__.return_value = mock_db

        res = await execute_get_report(session_id=str(session_id), token="valid-tok")
        data = json.loads(res)
        assert data["success"] is True
        assert data["title"] == "Evaluation of HNSW vs IVFFlat"
        assert data["markdown_content"] == "# Research Synthesis\n\nVerified findings."
        assert data["summary"] == "Verified findings on pgvector."
        assert data["sources_count"] == 1
        assert data["sources"][0]["domain"] == "arxiv.org"


@pytest.mark.asyncio
async def test_search_my_documents_empty_query():
    """Verify search_my_documents rejects empty queries."""
    res = await execute_search_my_documents(query="   ", token="tok")
    data = json.loads(res)
    assert data["success"] is False
    assert "must not be empty" in data["error"]


@pytest.mark.asyncio
async def test_search_my_documents_success(mock_user):
    """Verify search_my_documents calls hybrid_search and formats results."""
    mock_results = [
        HybridChunkResult(
            chunk_id=uuid.uuid4(),
            document_id=uuid.uuid4(),
            document_title="Attention Is All You Need",
            content="The Transformer architecture is based on self-attention.",
            page_number=1,
            chunk_index=0,
            vector_rank=1,
            text_rank=1,
            vector_similarity=0.92,
            text_rank_score=0.88,
            rrf_score=0.0328,
        )
    ]

    with (
        patch("app.mcp_server.tools.authenticate_token", return_value=mock_user),
        patch("app.mcp_server.tools.async_session_factory") as mock_asf,
        patch(
            "app.mcp_server.tools.hybrid_search", new_callable=AsyncMock, return_value=mock_results
        ),
    ):
        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_asf.return_value.__aenter__.return_value = mock_db

        res = await execute_search_my_documents(query="transformer self-attention", token="tok")
        data = json.loads(res)
        assert data["success"] is True
        assert data["total_results"] == 1
        assert data["chunks"][0]["document_title"] == "Attention Is All You Need"
        assert data["chunks"][0]["rrf_score"] == 0.0328


@pytest.mark.asyncio
async def test_mcp_server_call_tool_dispatch():
    """Verify dispatching tool calls through MCPServer.call_tool()."""
    server = create_mcp_server()
    with patch(
        "app.mcp_server.server.execute_search_my_documents",
        new_callable=AsyncMock,
        return_value=json.dumps({"success": True, "total_results": 0, "chunks": []}),
    ):
        res = await server.call_tool(
            "search_my_documents",
            {"query": "quantum computing", "token": "test-tok"},
        )
        assert not res.is_error
        assert len(res.content) > 0
        parsed = json.loads(res.content[0].text)
        assert parsed["success"] is True

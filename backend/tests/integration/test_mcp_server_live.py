import json
import uuid
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.mcp_server.server import create_mcp_server
from app.mcp_server.tools import (
    execute_get_report,
    execute_search_my_documents,
    execute_start_research,
)
from app.models.user import User


@pytest_asyncio.fixture(scope="function")
async def live_test_user(db_session: AsyncSession):
    """Create a live test user in isolated test database and patch MCP session factory."""
    email = f"mcp_user_{uuid.uuid4().hex[:8]}@pilot.ai"
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=email,
        hashed_password="hashed_pw_test",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    token = create_access_token({"sub": str(user_id)})

    @asynccontextmanager
    async def session_factory_override():
        yield db_session

    with patch("app.mcp_server.tools.async_session_factory", side_effect=session_factory_override):
        yield user, token


@pytest.mark.asyncio
async def test_live_mcp_start_research_and_get_report(live_test_user):
    """Verify live start_research creates session in database and get_report fetches it."""
    user, token = live_test_user

    # 1. Start research via MCP tool with mocked background execution
    with patch("app.mcp_server.tools.run_research_workflow", new_callable=AsyncMock):
        start_res = await execute_start_research(
            query="Live MCP Test: Evaluating retrieval pipelines in LangGraph",
            token=token,
            approval_required=False,
            max_iterations=1,
        )
        data = json.loads(start_res)
        assert data["success"] is True
        session_id = data["session_id"]
        assert data["status"] == "RUNNING"

    # 2. Retrieve report for the created session
    get_res = await execute_get_report(session_id=session_id, token=token)
    report_data = json.loads(get_res)
    assert report_data["success"] is True
    assert report_data["session_id"] == session_id
    assert report_data["title"] == "Live MCP Test: Evaluating retrieval pipelines in LangGraph"


@pytest.mark.asyncio
async def test_live_mcp_search_documents(live_test_user):
    """Verify live search_my_documents executes hybrid search for authenticated user."""
    user, token = live_test_user

    with patch("app.mcp_server.tools.hybrid_search", new_callable=AsyncMock, return_value=[]):
        search_res = await execute_search_my_documents(
            query="Vector indexing benchmarks",
            token=token,
            limit=3,
        )
        data = json.loads(search_res)
        assert data["success"] is True
        assert data["query"] == "Vector indexing benchmarks"
        assert "chunks" in data
        assert isinstance(data["chunks"], list)


@pytest.mark.asyncio
async def test_live_mcp_server_tool_dispatch(live_test_user):
    """Verify end-to-end tool dispatch through MCPServer instance with real JWT token."""
    user, token = live_test_user
    server = create_mcp_server()

    with patch("app.mcp_server.tools.hybrid_search", new_callable=AsyncMock, return_value=[]):
        res = await server.call_tool(
            "search_my_documents",
            {"query": "Empirical evaluation of agents", "token": token, "limit": 2},
        )
        assert not res.is_error
        assert len(res.content) > 0
        parsed = json.loads(res.content[0].text)
        assert parsed["success"] is True
        assert "chunks" in parsed

import asyncio
import logging
import sys
from contextlib import asynccontextmanager, contextmanager
from typing import AsyncIterator, Iterator
from urllib.parse import urlparse, urlunparse

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.core.config import settings

logger = logging.getLogger("researchpilot.workflows.checkpointer")


def get_postgres_conn_string() -> str:
    """Derive standard psycopg-compatible PostgreSQL connection URI from application settings."""
    url = settings.DATABASE_URL
    parsed = urlparse(url)

    # Standardize scheme: replace asyncpg driver with standard postgresql
    if parsed.scheme in ("postgresql+asyncpg", "postgres+asyncpg"):
        scheme = "postgresql"
    else:
        scheme = parsed.scheme

    return urlunparse(parsed._replace(scheme=scheme))


@contextmanager
def get_postgres_checkpointer() -> Iterator[PostgresSaver]:
    """Context manager supplying a configured, setup-verified synchronous PostgresSaver."""
    conn_str = get_postgres_conn_string()
    logger.info("Connecting to PostgreSQL checkpointer at %s", conn_str.split("@")[-1])

    with PostgresSaver.from_conn_string(conn_str) as checkpointer:
        checkpointer.setup()
        yield checkpointer


@asynccontextmanager
async def get_async_postgres_checkpointer() -> AsyncIterator[AsyncPostgresSaver]:
    """Async context manager supplying a configured, setup-verified AsyncPostgresSaver."""
    if sys.platform == "win32":
        try:
            current_policy = asyncio.get_event_loop_policy()
            if not isinstance(current_policy, asyncio.WindowsSelectorEventLoopPolicy):
                asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        except Exception as e:
            logger.debug("Failed setting WindowsSelectorEventLoopPolicy: %s", e)

    conn_str = get_postgres_conn_string()
    logger.info("Connecting to async PostgreSQL checkpointer at %s", conn_str.split("@")[-1])

    async with AsyncPostgresSaver.from_conn_string(conn_str) as checkpointer:
        await checkpointer.setup()
        yield checkpointer


def get_checkpointer(use_postgres: bool = False) -> BaseCheckpointSaver:
    """Retrieve checkpointer instance.

    Defaults to MemorySaver for fast unit tests. When PostgreSQL checkpointer is
    desired outside context managers, initializes a standalone checkpointer.
    """
    return MemorySaver()

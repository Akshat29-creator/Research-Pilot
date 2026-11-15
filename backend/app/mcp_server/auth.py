import logging
import uuid
from typing import Any, Dict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.models.user import User

logger = logging.getLogger("researchpilot.mcp_server.auth")


async def authenticate_token(db: AsyncSession, token: str) -> User:
    """Validate a JWT token and resolve the active User entity.

    Raises ValueError with descriptive reason if authentication fails.
    """
    clean_token = token.strip()
    if clean_token.startswith("Bearer "):
        clean_token = clean_token[7:].strip()

    if not clean_token:
        raise ValueError("Authentication token is missing.")

    payload: Dict[str, Any] | None = decode_access_token(clean_token)
    if not payload or "sub" not in payload:
        raise ValueError("Invalid, expired, or malformed authentication token.")

    user_id_str = payload["sub"]
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise ValueError("Malformed user identifier encoded in token.")

    stmt = select(User).where(User.id == user_uuid, User.is_active.is_(True))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise ValueError(f"Active user with id '{user_id_str}' does not exist.")

    logger.debug("Successfully authenticated MCP request for user %s (%s)", user.id, user.email)
    return user

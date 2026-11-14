import uuid
from typing import AsyncGenerator

from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AuthenticationError, EntityNotFoundError
from app.core.security import decode_access_token
from app.database.session import get_db_session
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    raw_token = auth.credentials if auth and auth.credentials else token
    if not raw_token:
        raise AuthenticationError("Authentication token is missing.")

    payload = decode_access_token(raw_token)
    if not payload or "sub" not in payload:
        raise AuthenticationError("Invalid or expired authentication token.")

    user_id_str = payload["sub"]
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise AuthenticationError("Malformed user identifier in token.")

    stmt = select(User).where(User.id == user_uuid, User.is_active.is_(True))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise EntityNotFoundError("User", user_id_str)

    return user

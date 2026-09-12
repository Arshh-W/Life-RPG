from datetime import datetime, timezone
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database import get_db
from app.models.session import UserSession
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing access token")
    if credentials is None:
        raise unauthorized
    claims = decode_access_token(credentials.credentials)
    if claims is None:
        raise unauthorized
    subject, session_id = claims
    try:
        user_id = UUID(subject)
        session_uuid = UUID(session_id)
    except ValueError as error:
        raise unauthorized from error
    session = await db.scalar(select(UserSession).where(UserSession.id == session_uuid, UserSession.user_id == user_id, UserSession.revoked_at.is_(None), UserSession.expires_at > datetime.now(timezone.utc)))
    user = await db.scalar(select(User).where(User.id == user_id)) if session else None
    if user is None:
        raise unauthorized
    return user
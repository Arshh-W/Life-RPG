from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password, hash_refresh_token, verify_password
from app.database import get_db
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserRead

router = APIRouter()


async def issue_session(user: User, db: AsyncSession) -> TokenResponse:
    refresh_token = create_refresh_token()
    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return TokenResponse(access_token=create_access_token(str(user.id), str(session.id)), refresh_token=refresh_token, user=user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing_user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    user = User(email=payload.email.lower(), display_name=payload.display_name.strip(), password_hash=hash_password(payload.password))
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists") from error
    await db.refresh(user)
    return await issue_session(user, db)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect")
    return await issue_session(user, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    session = await db.scalar(select(UserSession).where(UserSession.refresh_token_hash == hash_refresh_token(payload.refresh_token), UserSession.revoked_at.is_(None)))
    if session is None or session.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is invalid or expired")
    user = await db.scalar(select(User).where(User.id == session.user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is invalid")
    session.revoked_at = datetime.now(timezone.utc)
    return await issue_session(user, db)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> None:
    session = await db.scalar(select(UserSession).where(UserSession.user_id == current_user.id, UserSession.refresh_token_hash == hash_refresh_token(payload.refresh_token), UserSession.revoked_at.is_(None)))
    if session is not None:
        session.revoked_at = datetime.now(timezone.utc)
        await db.commit()


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
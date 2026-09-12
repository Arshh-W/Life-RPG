from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, pool_pre_ping=True)
session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def upgrade_legacy_schema() -> None:
    """Add Phase 2 columns when developing against a database from Phase 1."""
    columns = {
        "intelligence": "INTEGER NOT NULL DEFAULT 1",
        "strength": "INTEGER NOT NULL DEFAULT 1",
        "emotional_intelligence": "INTEGER NOT NULL DEFAULT 1",
        "coins": "INTEGER NOT NULL DEFAULT 0",
        "streak_count": "INTEGER NOT NULL DEFAULT 0",
        "last_activity_date": "DATE",
    }
    async with engine.begin() as connection:
        for column, definition in columns.items():
            await connection.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column} {definition}"))
from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255))
    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    discipline: Mapped[int] = mapped_column(Integer, default=1)
    health: Mapped[int] = mapped_column(Integer, default=100)
    intelligence: Mapped[int] = mapped_column(Integer, default=1)
    strength: Mapped[int] = mapped_column(Integer, default=1)
    emotional_intelligence: Mapped[int] = mapped_column(Integer, default=1)
    coins: Mapped[int] = mapped_column(Integer, default=0)
    streak_count: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
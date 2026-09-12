from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.task import TaskCategory


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    category: TaskCategory
    is_mandatory: bool = False

    @field_validator("title")
    @classmethod
    def title_must_contain_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Quest title cannot be blank")
        return value


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    category: TaskCategory | None = None
    is_mandatory: bool | None = None

    @field_validator("title")
    @classmethod
    def title_must_contain_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Quest title cannot be blank")
        return value


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    category: TaskCategory
    xp_reward: int
    is_mandatory: bool
    verification_required: bool
    verification_status: str
    is_completed: bool
    completed_at: datetime | None
    created_at: datetime
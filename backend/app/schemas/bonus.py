from pydantic import BaseModel, Field

from app.models.task import TaskCategory


class BonusQuestRequest(BaseModel):
    interests: str = Field(default="", max_length=500)


class BonusQuestRead(BaseModel):
    title: str
    description: str
    category: TaskCategory
    xp_reward: int
    coin_reward: int
    rationale: str
    generated_by: str
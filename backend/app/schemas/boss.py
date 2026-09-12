from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BossChallengeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str
    hp_total: int
    hp_remaining: int
    xp_reward: int
    coin_reward: int
    hp_penalty: int
    expires_at: datetime
    status: str

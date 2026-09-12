from pydantic import BaseModel


class CategoryRead(BaseModel):
    key: str
    label: str
    attribute: str
    xp_reward: int
    coin_reward: int
    description: str


class ProgressionRead(BaseModel):
    level: int
    xp: int
    level_start_xp: int
    next_level_xp: int
    level_progress: float
    coins: int
    streak_count: int
    last_activity_date: str | None
    attributes: dict[str, int]


class ShopItemRead(BaseModel):
    id: str
    slug: str
    name: str
    description: str
    cost: int
    rarity: str
    owned_quantity: int = 0


class PurchaseRead(BaseModel):
    item: ShopItemRead
    coins_remaining: int
from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.progression import CategoryRead, ProgressionRead
from app.services.progression import CATEGORY_RULES, progression_snapshot

router = APIRouter()


@router.get("/categories", response_model=list[CategoryRead])
async def list_categories(_: User = Depends(get_current_user)) -> list[CategoryRead]:
    return [CategoryRead(**rule.__dict__) for rule in CATEGORY_RULES.values()]


@router.get("/profile", response_model=ProgressionRead)
async def progression_profile(current_user: User = Depends(get_current_user)) -> ProgressionRead:
    snapshot = progression_snapshot(current_user.xp)
    return ProgressionRead(
        **snapshot,
        coins=current_user.coins,
        streak_count=current_user.streak_count,
        last_activity_date=current_user.last_activity_date.isoformat() if current_user.last_activity_date else None,
        attributes={
            "intelligence": current_user.intelligence,
            "strength": current_user.strength,
            "emotional_intelligence": current_user.emotional_intelligence,
            "discipline": current_user.discipline,
            "health": current_user.health,
        },
    )
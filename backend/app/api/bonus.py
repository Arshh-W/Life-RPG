import json
import re

import httpx
from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.database import get_db
from app.models.task import TaskCategory
from app.models.user import User
from app.schemas.bonus import BonusQuestRead, BonusQuestRequest
from app.services.progression import CATEGORY_RULES
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def fallback_quest(user: User, interests: str) -> BonusQuestRead:
    interest = next((word.strip() for word in re.split(r",|\band\b", interests) if word.strip()), "your craft")
    if user.intelligence <= user.strength and user.intelligence <= user.emotional_intelligence:
        category = TaskCategory.intelligence
        title = f"Decode one idea from {interest}"
        description = f"Spend 20 focused minutes learning or explaining one useful idea connected to {interest}."
    elif user.strength <= user.emotional_intelligence:
        category = TaskCategory.physicality
        title = f"Move like an adventurer: {interest} reset"
        description = f"Take a 15 minute movement break and use {interest} as your destination or theme."
    else:
        category = TaskCategory.social
        title = f"Share the spark of {interest}"
        description = f"Send one thoughtful message or contribution inspired by {interest} to strengthen a real connection."
    rule = CATEGORY_RULES[category.value]
    return BonusQuestRead(title=title, description=description, category=category, xp_reward=rule.xp_reward, coin_reward=rule.coin_reward, rationale="This quest balances your current focus tree with an interest you chose.", generated_by="realm fallback")


async def gateway_quest(user: User, interests: str) -> BonusQuestRead | None:
    if not settings.ai_gateway_base_url or not settings.ai_gateway_token:
        return None
    prompt = f"""Create one concise real-world bonus quest for a life RPG player.
Player profile: level {user.level}, intelligence {user.intelligence}, strength {user.strength}, emotional intelligence {user.emotional_intelligence}, discipline {user.discipline}, health {user.health}.
Player interests: {interests or 'not provided'}.
Return JSON only with title, description, category, and rationale. Category must be intelligence, physicality, or social. The quest must be achievable in under 30 minutes, specific, positive, and not repeat a generic chore."""
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(
                f"{settings.ai_gateway_base_url.rstrip('/')}/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.ai_gateway_token}"},
                json={"model": settings.ai_gateway_model, "temperature": 0.8, "messages": [{"role": "user", "content": prompt}]},
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            content = re.sub(r"^```json\s*|\s*```$", "", content.strip())
            data = json.loads(content)
            category = TaskCategory(data["category"])
            rule = CATEGORY_RULES[category.value]
            return BonusQuestRead(title=data["title"], description=data["description"], category=category, xp_reward=rule.xp_reward, coin_reward=rule.coin_reward, rationale=data["rationale"], generated_by=settings.ai_gateway_model)
    except (httpx.HTTPError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None


@router.post("/generate", response_model=BonusQuestRead)
async def generate_bonus_quest(payload: BonusQuestRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> BonusQuestRead:
    interests = payload.interests.strip() or current_user.interests.strip()
    if payload.interests.strip() and payload.interests.strip() != current_user.interests:
        current_user.interests = payload.interests.strip()
        await db.commit()
    return await gateway_quest(current_user, interests) or fallback_quest(current_user, interests)
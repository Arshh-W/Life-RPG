import json
import re
from typing import Literal

from fastapi import APIRouter, Depends
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.database import get_db
from app.models.task import TaskCategory
from app.models.user import User
from app.schemas.bonus import BonusQuestRead, BonusQuestRequest
from app.services.progression import CATEGORY_RULES

router = APIRouter()


# Schema enforced directly at the model output layer
class GeneratedQuestSchema(BaseModel):
    title: str = Field(description="Actionable title for the quest")
    description: str = Field(description="Concise instructions achievable under 30 minutes")
    category: Literal["intelligence", "physicality", "social"]
    rationale: str = Field(description="Explanation connecting the quest to user stats/goals")


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
    return BonusQuestRead(
        title=title,
        description=description,
        category=category,
        xp_reward=rule.xp_reward,
        coin_reward=rule.coin_reward,
        rationale="This quest balances your current focus tree with an interest you chose.",
        generated_by="realm fallback",
    )


async def gemini_quest(user: User, interests: str) -> BonusQuestRead | None:
    api_key = getattr(settings, "gemini_api_key", None)
    if not api_key:
        return None

    client = genai.Client(api_key=api_key)

    prompt = f"""You are the Arcane Oracle of a gritty RPG system.
Create one tailored, high-impact real-world quest for this hunter:
- Profession/Craft: {getattr(user, 'profession', 'Novice')}
- Ultimate Ambition: {getattr(user, 'grand_goal', 'Ascension')}
- Primary Interests: {interests or 'general mastery'}
- Current Stats: Level {user.level}, INT {user.intelligence}, PHY {user.strength}, EQ {user.emotional_intelligence}, DIS {user.discipline}, HP {user.health}/100.

Requirements:
1. Target their lowest attribute to force balanced growth, or build directly on their craft.
2. Must be achievable in under 30 minutes in the real world.
3. Must sound like an urgent system directive, not a dull everyday chore."""

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeneratedQuestSchema,
                temperature=0.7,
            ),
        )

        if not response.text:
            return None

        data = json.loads(response.text)
        category = TaskCategory(data["category"])
        rule = CATEGORY_RULES[category.value]

        return BonusQuestRead(
            title=data["title"],
            description=data["description"],
            category=category,
            xp_reward=rule.xp_reward,
            coin_reward=rule.coin_reward,
            rationale=data["rationale"],
            generated_by="Gemini 2.5 Flash",
        )
    except Exception as exc:
        print(f"[Oracle Warning] Gemini API call failed: {exc}")
        return None


@router.post("/generate", response_model=BonusQuestRead)
async def generate_bonus_quest(
    payload: BonusQuestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BonusQuestRead:
    interests = payload.interests.strip() or current_user.interests.strip()
    if payload.interests.strip() and payload.interests.strip() != current_user.interests:
        current_user.interests = payload.interests.strip()
        await db.commit()

    return await gemini_quest(current_user, interests) or fallback_quest(current_user, interests)
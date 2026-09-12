import random
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.activity import ActivityLog
from app.models.boss import BossChallenge
from app.models.user import User
from app.schemas.boss import BossChallengeRead
from app.services.progression import level_for_xp

router = APIRouter()

async def expire_challenge(challenge: BossChallenge, user: User, db: AsyncSession) -> None:
    if challenge.status == "active" and challenge.expires_at <= datetime.now(timezone.utc):
        challenge.status = "expired"
        if not challenge.penalty_applied:
            # Mitigation from Physicality (PHY)
            armor_mitigation = user.strength * 2
            actual_damage = max(1, challenge.hp_penalty - armor_mitigation)
            user.health = max(0, user.health - actual_damage)
            challenge.penalty_applied = True
        await db.commit()

@router.get("/active", response_model=BossChallengeRead | None)
async def active_boss(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> BossChallenge | None:
    challenge = await db.scalar(select(BossChallenge).where(BossChallenge.user_id == current_user.id, BossChallenge.status == "active").order_by(BossChallenge.expires_at))
    
    if challenge is None:
        # Dynamic Boss generation based on user's highest stat
        titles = ["The Procrastination Demon", "The Fog of Burnout", "The Comfort Zone Titan"]
        selected_title = random.choice(titles)
        
        challenge = BossChallenge(
            user_id=current_user.id, 
            title=selected_title, 
            description="Complete a high-tier quest before the realm fractures further.", 
            hp_total=150 + (current_user.level * 10), 
            hp_remaining=150 + (current_user.level * 10), 
            xp_reward=250 + (current_user.level * 20), 
            coin_reward=75, 
            hp_penalty=30, 
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15)
        )
        db.add(challenge)
        await db.commit()
        await db.refresh(challenge)
        
    await expire_challenge(challenge, current_user, db)
    return challenge if challenge.status == "active" else None

@router.post("/{challenge_id}/complete", response_model=BossChallengeRead)
async def complete_boss(challenge_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> BossChallenge:
    challenge = await db.scalar(select(BossChallenge).where(BossChallenge.id == challenge_id, BossChallenge.user_id == current_user.id).with_for_update())
    
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Boss challenge not found")
        
    await expire_challenge(challenge, current_user, db)
    if challenge.status != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This boss challenge has expired")
        
    challenge.status = "completed"
    challenge.completed_at = datetime.now(timezone.utc)
    
    # Calculate final XP with DIS modifier
    import math
    dis_bonus = math.log10(current_user.streak_count + 1) * (current_user.discipline * 0.05)
    final_xp = int(challenge.xp_reward * (1.0 + dis_bonus))
    
    current_user.xp += final_xp
    
    # Boss Kill Economy Burst (30% chance for a massive coin drop to afford Vault Passives)
    if random.random() < 0.30:
        current_user.coins += (challenge.coin_reward * 3) 
    else:
        current_user.coins += challenge.coin_reward
        
    current_user.level = level_for_xp(current_user.xp)
    db.add(ActivityLog(user_id=current_user.id, task_id=None, event_type="boss_completed", xp_delta=final_xp))
    await db.commit()
    await db.refresh(challenge)
    
    return challenge
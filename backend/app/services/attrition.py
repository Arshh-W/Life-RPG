from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from app.database import session_factory # <-- FIXED IMPORT
from app.models.task import Task
from app.models.user import User

async def process_daily_attrition(user_id: UUID):
    """
    Background task: Scans for missed Daily Trinity quests and applies HP damage.
    High PHY (strength) acts as armor against the penalty.
    """
    async with session_factory() as db: # <-- FIXED USAGE
        user = await db.scalar(select(User).where(User.id == user_id))
        if not user or not user.last_activity_date:
            return

        today = datetime.now(timezone.utc).date()
        days_missed = (today - user.last_activity_date).days

        # If they are already synced for today, exit early
        if days_missed <= 0:
            return 

        # Fetch mandatory quests that were left incomplete
        incomplete_mandatory = await db.scalars(
            select(Task).where(
                Task.user_id == user.id,
                Task.is_mandatory == True,
                Task.is_completed == False
            )
        )
        missed_tasks = list(incomplete_mandatory)
        missed_count = len(missed_tasks)

        if missed_count > 0:
            # Base logic: 15 damage per missed task, multiplied by days ignored
            base_damage = 15 * missed_count * days_missed
            
            # PHY Mitigation: Strength acts as a flat armor buffer
            mitigation = user.strength * 2
            
            # The player must always take at least 1 damage for failing
            final_damage = max(1, base_damage - mitigation) 

            user.health = max(0, user.health - final_damage)
            user.streak_count = 0 # The streak is broken
            user.discipline = max(1, user.discipline - 1) # Optional: slight DIS penalty

            # Clean up the old tasks so they don't carry over into the new day
            for task in missed_tasks:
                await db.delete(task) 
                
        user.last_activity_date = today
        await db.commit()
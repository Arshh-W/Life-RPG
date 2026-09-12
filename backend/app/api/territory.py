from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User

router = APIRouter()

@router.get("/overworld-status")
async def get_overworld_status(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Determine zone alignment based on highest attribute
    stats = {
        "Silicon Citadel": current_user.intelligence,
        "Iron Bastion": current_user.strength,
        "Weirwood Archives": current_user.emotional_intelligence
    }
    primary_zone = max(stats, key=stats.get)
    
    # Calculate global rank or check if user is top in an attribute
    top_int_user = await db.scalar(select(User).order_by(User.intelligence.desc()).limit(1))
    is_minister = top_int_user and top_int_user.id == current_user.id
    
    # Total realm restoration percentage based on collective stats or user level
    restoration_percentage = min(100, (current_user.level * 5) + (current_user.discipline * 2))

    return {
        "primary_zone": primary_zone,
        "title": "Minister of the Citadel" if is_minister and primary_zone == "Silicon Citadel" else "Realm Explorer",
        "restoration_percentage": restoration_percentage,
        "cluster_status": {
            "Silicon Citadel": "Restoring" if current_user.intelligence >= 10 else "Shattered",
            "Iron Bastion": "Restoring" if current_user.strength >= 10 else "Shattered",
            "Weirwood Archives": "Restoring" if current_user.emotional_intelligence >= 10 else "Shattered"
        }
    }
from datetime import datetime, timedelta, timezone
from uuid import UUID

from hashlib import sha256

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.activity import ActivityLog
from app.models.task import Task, TaskCategory
from app.models.user import User
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.progression import CATEGORY_RULES, level_for_xp

router = APIRouter()

async def owned_task(task_id: UUID, user: User, db: AsyncSession) -> Task:
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest not found")
    return task


@router.get("", response_model=list[TaskRead])
async def list_tasks(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[Task]:
    result = await db.scalars(select(Task).where(Task.user_id == current_user.id).order_by(Task.created_at.desc()))
    return list(result)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Task:
    # --- ENFORCE DAILY TRINITY LIMIT ---
    if payload.is_mandatory:
        active_mandatory_count = await db.scalar(
            select(func.count()).select_from(Task).where(
                Task.user_id == current_user.id,
                Task.is_mandatory == True,
                Task.is_completed == False
            )
        )
        if active_mandatory_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="The Daily Trinity is full. You cannot have more than 3 active mandatory quests."
            )

    rule = CATEGORY_RULES[payload.category.value]
    verification_required = payload.category == TaskCategory.physicality and payload.is_mandatory
    task = Task(user_id=current_user.id, title=payload.title.strip(), description=payload.description, category=payload.category, xp_reward=rule.xp_reward, is_mandatory=payload.is_mandatory, verification_required=verification_required, verification_status="pending" if verification_required else "not_required")
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(task_id: UUID, payload: TaskUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Task:
    task = await owned_task(task_id, current_user, db)
    updates = payload.model_dump(exclude_unset=True)
    
    # --- ENFORCE DAILY TRINITY LIMIT ON UPDATE ---
    if updates.get("is_mandatory") and not task.is_mandatory:
        active_mandatory_count = await db.scalar(
            select(func.count()).select_from(Task).where(
                Task.user_id == current_user.id,
                Task.is_mandatory == True,
                Task.is_completed == False
            )
        )
        if active_mandatory_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="The Daily Trinity is full. You cannot upgrade this to a mandatory quest."
            )

    if "title" in updates:
        updates["title"] = updates["title"].strip()
    if "category" in updates:
        updates["xp_reward"] = CATEGORY_RULES[updates["category"].value].xp_reward
        updates["verification_required"] = updates["category"] == TaskCategory.physicality and updates.get("is_mandatory", task.is_mandatory)
        updates["verification_status"] = "pending" if updates["verification_required"] else "not_required"
        
    for field, value in updates.items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TaskRead)
async def complete_task(task_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Task:
    task = await owned_task(task_id, current_user, db)
    if task.is_completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Quest is already complete")
    if task.verification_required and task.verification_status != "verified":
        raise HTTPException(status_code=status.HTTP_428_PRECONDITION_REQUIRED, detail="Photo verification is required before this quest can award rewards")
    task.is_completed = True
    task.completed_at = datetime.now(timezone.utc)
    category_key = task.category.value if isinstance(task.category, TaskCategory) else task.category
    rule = CATEGORY_RULES[category_key]
    current_user.xp += rule.xp_reward
    current_user.coins += rule.coin_reward
    current_user.level = level_for_xp(current_user.xp)
    current_user.discipline += 1 if task.is_mandatory else 0
    attribute = rule.attribute
    setattr(current_user, attribute, getattr(current_user, attribute) + 1)
    today = datetime.now(timezone.utc).date()
    if current_user.last_activity_date != today:
        current_user.streak_count = current_user.streak_count + 1 if current_user.last_activity_date == today - timedelta(days=1) else 1
        current_user.last_activity_date = today
    task.xp_reward = rule.xp_reward
    db.add(ActivityLog(user_id=current_user.id, task_id=task.id, event_type="quest_completed", xp_delta=rule.xp_reward))
    await db.commit()
    await db.refresh(task)
    return task


@router.post("/{task_id}/verify", response_model=TaskRead)
async def verify_task(task_id: UUID, image: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Task:
    task = await owned_task(task_id, current_user, db)
    if not task.verification_required:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This quest does not require verification")
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Verification must be a JPEG, PNG, or WebP image")
    contents = await image.read(5_000_001)
    if len(contents) > 5_000_000:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Verification image must be 5 MB or smaller")
    task.verification_hash = sha256(contents).hexdigest()
    task.verification_status = "verified"
    task.verification_submitted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> None:
    task = await owned_task(task_id, current_user, db)
    await db.delete(task)
    await db.commit()
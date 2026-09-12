from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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
    rule = CATEGORY_RULES[payload.category.value]
    task = Task(user_id=current_user.id, title=payload.title.strip(), description=payload.description, category=payload.category, xp_reward=rule.xp_reward, is_mandatory=payload.is_mandatory)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(task_id: UUID, payload: TaskUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Task:
    task = await owned_task(task_id, current_user, db)
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates:
        updates["title"] = updates["title"].strip()
    if "category" in updates:
        updates["xp_reward"] = CATEGORY_RULES[updates["category"].value].xp_reward
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


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> None:
    task = await owned_task(task_id, current_user, db)
    await db.delete(task)
    await db.commit()
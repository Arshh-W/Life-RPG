from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.economy import InventoryItem, ShopItem
from app.models.user import User
from app.schemas.progression import PurchaseRead, ShopItemRead

router = APIRouter()
SHOP_CATALOG = (
    {"slug": "focus-potion", "name": "Focus potion", "description": "A small ritual for your next deep-work session.", "cost": 45, "rarity": "common"},
    {"slug": "ember-badge", "name": "Ember badge", "description": "A cosmetic mark for showing up when it was hard.", "cost": 90, "rarity": "rare"},
    {"slug": "wayfinder-theme", "name": "Wayfinder theme", "description": "A new visual path for your personal realm.", "cost": 150, "rarity": "epic"},
)


async def ensure_catalog(db: AsyncSession) -> None:
    existing = set(await db.scalars(select(ShopItem.slug)))
    for item in SHOP_CATALOG:
        if item["slug"] not in existing:
            db.add(ShopItem(**item))
    if len(existing) < len(SHOP_CATALOG):
        await db.commit()


def item_read(item: ShopItem, owned_quantity: int = 0) -> ShopItemRead:
    return ShopItemRead(id=str(item.id), slug=item.slug, name=item.name, description=item.description, cost=item.cost, rarity=item.rarity, owned_quantity=owned_quantity)


@router.get("/shop", response_model=list[ShopItemRead])
async def shop(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[ShopItemRead]:
    await ensure_catalog(db)
    items = list(await db.scalars(select(ShopItem).where(ShopItem.is_active).order_by(ShopItem.cost)))
    owned = {item.item_id: item.quantity for item in await db.scalars(select(InventoryItem).where(InventoryItem.user_id == current_user.id))}
    return [item_read(item, owned.get(item.id, 0)) for item in items]


@router.get("/inventory", response_model=list[ShopItemRead])
async def inventory(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[ShopItemRead]:
    rows = await db.execute(select(ShopItem, InventoryItem.quantity).join(InventoryItem).where(InventoryItem.user_id == current_user.id))
    return [item_read(item, quantity) for item, quantity in rows.all()]


@router.post("/items/{item_id}/purchase", response_model=PurchaseRead)
async def purchase(item_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> PurchaseRead:
    item = await db.scalar(select(ShopItem).where(ShopItem.id == item_id, ShopItem.is_active).with_for_update())
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop item not found")
    if current_user.coins < item.cost:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not enough coins for this reward")
    owned = await db.scalar(select(InventoryItem).where(InventoryItem.user_id == current_user.id, InventoryItem.item_id == item.id).with_for_update())
    current_user.coins -= item.cost
    if owned is None:
        owned = InventoryItem(user_id=current_user.id, item_id=item.id, quantity=1)
        db.add(owned)
    else:
        owned.quantity += 1
    await db.commit()
    return PurchaseRead(item=item_read(item, owned.quantity), coins_remaining=current_user.coins)
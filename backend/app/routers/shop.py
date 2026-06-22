from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models import ActivityLog, UserInventoryItem
from security import get_current_user

router = APIRouter(prefix="/api/v1/shop", tags=["shop"])

# ── Catalog (hard-coded) ───────────────────────────────────────────────────────

SHOP_ITEMS = [
    {
        "id": "khung-hoa-mai",
        "name": "Khung avatar Hoa Mai",
        "description": "Khung ảnh đại diện đặc biệt với họa tiết hoa mai vàng rực rỡ",
        "icon": "🌸",
        "price": 80,
        "category": "avatar",
        "rarity": "rare",
    },
    {
        "id": "huy-hieu-phat-co-don",
        "name": "Huy hiệu Phật Cô Đơn",
        "description": "Huy hiệu gắn trên hồ sơ, biểu tượng của những người thăm địa điểm tâm linh nổi tiếng",
        "icon": "🏯",
        "price": 120,
        "category": "badge",
        "rarity": "rare",
    },
    {
        "id": "tam-buu-thiep",
        "name": "Tấm bưu thiếp Bình Lợi",
        "description": "Kỷ vật số mang nét đẹp làng quê Bình Lợi, lưu giữ kỷ niệm chuyến đi",
        "icon": "🏞️",
        "price": 30,
        "category": "collectible",
        "rarity": "common",
    },
    {
        "id": "lo-tinh-dau-tram",
        "name": "Lọ tinh dầu tràm",
        "description": "Đạo cụ ảo — tinh dầu tràm thủ công từ làng nghề Bình Lợi",
        "icon": "🫙",
        "price": 60,
        "category": "prop",
        "rarity": "common",
    },
    {
        "id": "chau-bonsai-mini",
        "name": "Chậu bonsai mini",
        "description": "Đạo cụ ảo — chậu bonsai mai vàng thu nhỏ, biểu tượng nghệ nhân",
        "icon": "🌿",
        "price": 75,
        "category": "prop",
        "rarity": "uncommon",
    },
    {
        "id": "voucher-nhang-10",
        "name": "Voucher giảm 10% workshop nhang",
        "description": "Giảm 10% học phí cho một workshop làm nhang thủ công tại Bình Lợi",
        "icon": "🎟️",
        "price": 200,
        "category": "voucher",
        "rarity": "epic",
    },
    {
        "id": "ve-hoi-dap-xe",
        "name": "Vé tour đạp xe rừng tràm",
        "description": "Vé ảo tham gia tour đạp xe khám phá rừng tràm Lê Minh Xuân xanh mát",
        "icon": "🚲",
        "price": 150,
        "category": "ticket",
        "rarity": "rare",
    },
    {
        "id": "voucher-giam-gia-tour",
        "name": "Voucher giảm 10% Tour",
        "description": "Giảm 10% tổng giá trị khi đặt lịch tour. Dùng 1 voucher mỗi lần đặt.",
        "icon": "🎟️",
        "price": 30000,
        "category": "voucher",
        "rarity": "common",
    },
    {
        "id": "voucher-giam-gia-tour-20",
        "name": "Voucher giảm 20% Tour",
        "description": "Giảm 20% tổng giá trị khi đặt lịch tour. Dùng 1 voucher mỗi lần đặt.",
        "icon": "🎫",
        "price": 60000,
        "category": "voucher",
        "rarity": "uncommon",
    },
    {
        "id": "voucher-giam-gia-tour-50",
        "name": "Voucher giảm 50% Tour",
        "description": "Giảm 50% tổng giá trị khi đặt lịch tour. Dùng 1 voucher mỗi lần đặt.",
        "icon": "💜",
        "price": 145000,
        "category": "voucher",
        "rarity": "epic",
    },
    {
        "id": "hat-hoa-mai",
        "name": "Hạt giống Hoa Mai",
        "description": "Trồng hoa mai vàng tại vườn Bình Lợi. Thu hoạch được 50 vàng, 10% may mắn ra hoa hoàng kim (x1.5)!",
        "icon": "🌸",
        "price": 30,
        "category": "seed",
        "rarity": "common",
    },
    {
        "id": "hat-dua",
        "name": "Hạt giống Dừa",
        "description": "Trồng cây dừa xanh mát. Thu hoạch được 30 vàng, 10% may mắn ra quả hoàng kim (x1.5)!",
        "icon": "🥥",
        "price": 15,
        "category": "seed",
        "rarity": "common",
    },
    {
        "id": "khung-legendary",
        "name": "Khung avatar Huyền Thoại",
        "description": "Khung avatar hiếm nhất — dành cho những nhà thám hiểm đích thực của Bình Lợi",
        "icon": "👑",
        "price": 500,
        "category": "avatar",
        "rarity": "legendary",
    },
]

ITEM_BY_ID = {item["id"]: item for item in SHOP_ITEMS}


# ── Schemas ────────────────────────────────────────────────────────────────────

class ShopItemOut(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    price: int
    category: str
    rarity: str
    image_url: Optional[str] = None


class BuyIn(BaseModel):
    item_id: str


class InventoryItemOut(BaseModel):
    item_id: str
    quantity: int
    acquired_at: datetime
    name: str
    description: str
    icon: str
    category: str
    rarity: str

    model_config = {"from_attributes": True}


class BuyOut(BaseModel):
    gold: int
    item: InventoryItemOut


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/items", response_model=List[ShopItemOut])
async def list_items():
    return SHOP_ITEMS


@router.post("/buy", response_model=BuyOut)
async def buy_item(
    data: BuyIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    catalog = ITEM_BY_ID.get(data.item_id)
    if not catalog:
        raise HTTPException(status_code=404, detail="Vật phẩm không tồn tại")

    if current_user.gold < catalog["price"]:
        raise HTTPException(status_code=400, detail="Không đủ vàng")

    # Upsert: nếu đã có thì tăng quantity
    existing = await db.execute(
        select(UserInventoryItem).where(
            UserInventoryItem.user_id == current_user.id,
            UserInventoryItem.item_id == data.item_id,
        )
    )
    row = existing.scalar_one_or_none()

    current_user.gold -= catalog["price"]

    if row:
        row.quantity += 1
        inv_item = row
    else:
        inv_item = UserInventoryItem(user_id=current_user.id, item_id=data.item_id, quantity=1)
        db.add(inv_item)

    log = ActivityLog(
        user_id=current_user.id,
        user_name=current_user.name,
        user_email=current_user.email,
        action="shop_buy",
        detail=f"Mua vật phẩm: {catalog['name']} · {catalog['price']} vàng",
    )
    db.add(log)

    await db.flush()
    await db.refresh(current_user)
    if not row:
        await db.refresh(inv_item)

    return BuyOut(
        gold=current_user.gold,
        item=InventoryItemOut(
            item_id=inv_item.item_id,
            quantity=inv_item.quantity,
            acquired_at=inv_item.acquired_at,
            **{k: catalog[k] for k in ("name", "description", "icon", "category", "rarity")},
        ),
    )


class UseIn(BaseModel):
    item_id: str


class UseOut(BaseModel):
    quantity: int
    gold: int


@router.post("/use", response_model=UseOut)
async def use_item(
    data: UseIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Consume 1 unit of an item from inventory (e.g. planting a seed)."""
    result = await db.execute(
        select(UserInventoryItem).where(
            UserInventoryItem.user_id == current_user.id,
            UserInventoryItem.item_id == data.item_id,
        )
    )
    row = result.scalar_one_or_none()
    if not row or row.quantity < 1:
        raise HTTPException(status_code=400, detail="Không đủ vật phẩm trong túi đồ")

    row.quantity -= 1
    await db.flush()
    return UseOut(quantity=row.quantity, gold=current_user.gold)


class HarvestIn(BaseModel):
    seed_type: str   # "hat-hoa-mai" | "hat-dua"
    is_golden: bool = False


class HarvestOut(BaseModel):
    gold_earned: int
    gold: int


HARVEST_GOLD = {
    "hat-hoa-mai": 50,
    "hat-dua": 30,
}


@router.post("/plant-harvest", response_model=HarvestOut)
async def plant_harvest(
    data: HarvestIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Award gold when player harvests a plant."""
    base = HARVEST_GOLD.get(data.seed_type)
    if base is None:
        raise HTTPException(status_code=400, detail="Loại hạt không hợp lệ")

    earned = int(base * 1.5) if data.is_golden else base
    current_user.gold += earned
    await db.flush()
    await db.refresh(current_user)
    return HarvestOut(gold_earned=earned, gold=current_user.gold)


@router.get("/inventory", response_model=List[InventoryItemOut])
async def get_inventory(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(UserInventoryItem)
        .where(UserInventoryItem.user_id == current_user.id)
        .order_by(UserInventoryItem.acquired_at.desc())
    )
    rows = result.scalars().all()
    out = []
    for row in rows:
        cat = ITEM_BY_ID.get(row.item_id)
        if cat:
            out.append(InventoryItemOut(
                item_id=row.item_id,
                quantity=row.quantity,
                acquired_at=row.acquired_at,
                **{k: cat[k] for k in ("name", "description", "icon", "category", "rarity")},
            ))
    return out

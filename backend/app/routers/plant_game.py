import random
from datetime import datetime, timedelta, timezone
from typing import List, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models import UserInventoryItem, UserPlantPlot
from security import get_current_user

router = APIRouter(prefix="/api/v1/game/plant", tags=["plant_game"])

DUR_SPROUT = 30   # giây: stage 1 → 2  (mầm cây → cây non)
DUR_YOUNG  = 20   # giây: stage 2 → 3  (cây non → nở hoa)

HARVEST_GOLD = {
    "hat-hoa-mai": 50,
    "hat-dua": 30,
}


def compute_stage(plot: UserPlantPlot) -> Tuple[int, int]:
    """So sánh now với stage2_at / blooms_at đã lưu sẵn trong DB."""
    now = datetime.now(timezone.utc)
    if now < plot.stage2_at:
        return 1, int((plot.stage2_at - now).total_seconds())
    if now < plot.blooms_at:
        return 2, int((plot.blooms_at - now).total_seconds())
    return 3, 0


# ── Schemas ────────────────────────────────────────────────────────────────────

class PlotOut(BaseModel):
    plot_index: int
    seed_type: str
    stage: int
    timer: int
    is_golden: bool
    planted_at: datetime
    stage2_at: datetime
    blooms_at: datetime


class PlantIn(BaseModel):
    plot_index: int
    seed_type: str


class HarvestPlotIn(BaseModel):
    plot_index: int


class HarvestPlotOut(BaseModel):
    gold_earned: int
    gold: int


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/plots", response_model=List[PlotOut])
async def get_plots(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(UserPlantPlot).where(UserPlantPlot.user_id == current_user.id)
    )
    out = []
    for row in result.scalars().all():
        stage, timer = compute_stage(row)
        out.append(PlotOut(
            plot_index=row.plot_index,
            seed_type=row.seed_type,
            stage=stage,
            timer=timer,
            is_golden=row.is_golden,
            planted_at=row.planted_at,
            stage2_at=row.stage2_at,
            blooms_at=row.blooms_at,
        ))
    return out


@router.post("/plant", response_model=PlotOut)
async def plant_seed(
    data: PlantIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not (0 <= data.plot_index <= 15):
        raise HTTPException(400, "Ô đất không hợp lệ")

    existing = await db.execute(
        select(UserPlantPlot).where(
            UserPlantPlot.user_id == current_user.id,
            UserPlantPlot.plot_index == data.plot_index,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Ô đất đã có cây")

    inv = await db.execute(
        select(UserInventoryItem).where(
            UserInventoryItem.user_id == current_user.id,
            UserInventoryItem.item_id == data.seed_type,
        )
    )
    inv_row = inv.scalar_one_or_none()
    if not inv_row or inv_row.quantity < 1:
        raise HTTPException(400, "Không đủ hạt giống trong túi đồ")

    inv_row.quantity -= 1
    is_golden = random.random() < 0.10

    # Lưu sẵn thời điểm chuyển giai đoạn
    planted_at = datetime.now(timezone.utc)
    stage2_at  = planted_at + timedelta(seconds=DUR_SPROUT)
    blooms_at  = planted_at + timedelta(seconds=DUR_SPROUT + DUR_YOUNG)

    plot = UserPlantPlot(
        user_id=current_user.id,
        plot_index=data.plot_index,
        seed_type=data.seed_type,
        planted_at=planted_at,
        stage2_at=stage2_at,
        blooms_at=blooms_at,
        is_golden=is_golden,
    )
    db.add(plot)
    await db.flush()

    return PlotOut(
        plot_index=data.plot_index,
        seed_type=data.seed_type,
        stage=1,
        timer=DUR_SPROUT,
        is_golden=is_golden,
        planted_at=planted_at,
        stage2_at=stage2_at,
        blooms_at=blooms_at,
    )


@router.post("/harvest", response_model=HarvestPlotOut)
async def harvest_plot(
    data: HarvestPlotIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(UserPlantPlot).where(
            UserPlantPlot.user_id == current_user.id,
            UserPlantPlot.plot_index == data.plot_index,
        )
    )
    plot = result.scalar_one_or_none()
    if not plot:
        raise HTTPException(400, "Ô đất trống")

    if datetime.now(timezone.utc) < plot.blooms_at:
        raise HTTPException(400, "Cây chưa nở hoa")

    base = HARVEST_GOLD.get(plot.seed_type)
    if not base:
        raise HTTPException(400, "Loại hạt không hợp lệ")

    earned = int(base * 1.5) if plot.is_golden else base
    current_user.gold += earned

    await db.delete(plot)
    await db.flush()
    await db.refresh(current_user)

    return HarvestPlotOut(gold_earned=earned, gold=current_user.gold)

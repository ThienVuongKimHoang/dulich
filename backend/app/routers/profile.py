from datetime import datetime, timezone, timedelta, date as date_type
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models import ActivityLog, GameScore, TourBooking, UserAchievement, WorkshopCompletion, CheckIn, DailyTaskCompletion
from security import get_current_user


def today_vn() -> date_type:
    """Ngày hiện tại theo múi giờ Việt Nam (UTC+7)."""
    return (datetime.now(timezone.utc) + timedelta(hours=7)).date()

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class WorkshopCompleteIn(BaseModel):
    workshop_slug: str = Field(..., max_length=100)


class AchievementUnlockIn(BaseModel):
    achievement_id: str = Field(..., max_length=100)


class CheckInIn(BaseModel):
    location: Optional[str] = Field(None, max_length=200)


class WorkshopCompletionOut(BaseModel):
    id: int
    workshop_slug: str
    completed_at: datetime
    model_config = {"from_attributes": True}


class AchievementOut(BaseModel):
    id: int
    achievement_id: str
    earned_at: datetime
    model_config = {"from_attributes": True}


class CheckInOut(BaseModel):
    id: int
    location: Optional[str]
    checked_at: datetime
    model_config = {"from_attributes": True}


class ProfileSummaryOut(BaseModel):
    points: int
    completed_workshops: List[str]
    achievements: List[str]
    checkin_count: int


class ActivityFeedItem(BaseModel):
    id: str
    type: str        # "game" | "tour_booking" | "shop_buy" | "workshop"
    label: str
    icon: str
    amount: int
    sign: str        # "+" | "-"
    unit: str        # "EXP" | "VND" | "vàng"
    detail: Optional[str]
    created_at: str


class AddExpIn(BaseModel):
    amount: int = Field(..., ge=1, le=500)
    reason: str = Field(default="daily_task", max_length=100)


class AddExpOut(BaseModel):
    points: int
    added: int


class DailyTaskCompleteIn(BaseModel):
    task_id: str = Field(..., max_length=50)
    exp: int = Field(..., ge=0, le=500)
    gold: int = Field(default=0, ge=0, le=100000)


class DailyTaskOut(BaseModel):
    task_id: str
    exp_awarded: int
    completed_at: datetime
    model_config = {"from_attributes": True}


class DailyTasksStatusOut(BaseModel):
    done_task_ids: List[str]
    points: int
    gold: int


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/add-exp", response_model=AddExpOut)
async def add_exp(
    data: AddExpIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    current_user.points += data.amount
    await db.flush()
    await db.refresh(current_user)
    return AddExpOut(points=current_user.points, added=data.amount)


@router.get("/daily-tasks/today", response_model=DailyTasksStatusOut)
async def get_today_tasks(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    today = today_vn()
    rows = await db.execute(
        select(DailyTaskCompletion.task_id)
        .where(DailyTaskCompletion.user_id == current_user.id, DailyTaskCompletion.date == today)
    )
    return DailyTasksStatusOut(done_task_ids=list(rows.scalars().all()), points=current_user.points, gold=current_user.gold)


@router.post("/daily-tasks/complete", response_model=DailyTasksStatusOut)
async def complete_daily_task(
    data: DailyTaskCompleteIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    today = today_vn()
    record = DailyTaskCompletion(
        user_id=current_user.id,
        task_id=data.task_id,
        date=today,
        exp_awarded=data.exp,
    )
    db.add(record)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        # Đã hoàn thành trước đó — trả về trạng thái hiện tại
        rows = await db.execute(
            select(DailyTaskCompletion.task_id)
            .where(DailyTaskCompletion.user_id == current_user.id, DailyTaskCompletion.date == today)
        )
        return DailyTasksStatusOut(done_task_ids=list(rows.scalars().all()), points=current_user.points, gold=current_user.gold)

    if data.exp > 0:
        current_user.points += data.exp
    if data.gold > 0:
        current_user.gold += data.gold
    await db.flush()
    await db.refresh(current_user)

    rows = await db.execute(
        select(DailyTaskCompletion.task_id)
        .where(DailyTaskCompletion.user_id == current_user.id, DailyTaskCompletion.date == today)
    )
    return DailyTasksStatusOut(done_task_ids=list(rows.scalars().all()), points=current_user.points, gold=current_user.gold)


@router.get("/summary", response_model=ProfileSummaryOut)
async def get_profile_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ws_rows = await db.execute(
        select(WorkshopCompletion.workshop_slug)
        .where(WorkshopCompletion.user_id == current_user.id)
    )
    ach_rows = await db.execute(
        select(UserAchievement.achievement_id)
        .where(UserAchievement.user_id == current_user.id)
    )
    checkin_count_row = await db.execute(
        select(func.count()).where(CheckIn.user_id == current_user.id)
    )
    return ProfileSummaryOut(
        points=current_user.points,
        completed_workshops=list(ws_rows.scalars().all()),
        achievements=list(ach_rows.scalars().all()),
        checkin_count=checkin_count_row.scalar_one(),
    )


@router.post("/workshops/complete", response_model=WorkshopCompletionOut, status_code=status.HTTP_201_CREATED)
async def complete_workshop(
    data: WorkshopCompleteIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = await db.execute(
        select(WorkshopCompletion).where(
            WorkshopCompletion.user_id == current_user.id,
            WorkshopCompletion.workshop_slug == data.workshop_slug,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Workshop này đã được hoàn thành.")

    completion = WorkshopCompletion(user_id=current_user.id, workshop_slug=data.workshop_slug)
    db.add(completion)
    await db.flush()
    await db.refresh(completion)
    return completion


@router.get("/workshops", response_model=List[WorkshopCompletionOut])
async def get_completed_workshops(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(WorkshopCompletion)
        .where(WorkshopCompletion.user_id == current_user.id)
        .order_by(WorkshopCompletion.completed_at.desc())
    )
    return list(result.scalars().all())


@router.post("/achievements/unlock", response_model=AchievementOut, status_code=status.HTTP_201_CREATED)
async def unlock_achievement(
    data: AchievementUnlockIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = await db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == current_user.id,
            UserAchievement.achievement_id == data.achievement_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Thành tựu này đã được mở khóa.")

    ach = UserAchievement(user_id=current_user.id, achievement_id=data.achievement_id)
    db.add(ach)
    await db.flush()
    await db.refresh(ach)
    return ach


@router.get("/achievements", response_model=List[AchievementOut])
async def get_achievements(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == current_user.id)
        .order_by(UserAchievement.earned_at.asc())
    )
    return list(result.scalars().all())


@router.post("/checkin", response_model=CheckInOut, status_code=status.HTTP_201_CREATED)
async def add_checkin(
    data: CheckInIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    checkin = CheckIn(user_id=current_user.id, location=data.location)
    db.add(checkin)
    await db.flush()
    await db.refresh(checkin)
    return checkin


@router.get("/checkins/count", response_model=dict)
async def get_checkin_count(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(func.count()).where(CheckIn.user_id == current_user.id)
    )
    return {"count": result.scalar_one()}


@router.get("/activity-feed", response_model=List[ActivityFeedItem])
async def get_activity_feed(
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    import json as _json

    items: list[ActivityFeedItem] = []

    # 1. Game scores
    gs_rows = await db.execute(
        select(GameScore)
        .where(GameScore.user_id == current_user.id)
        .order_by(GameScore.created_at.desc())
        .limit(limit)
    )
    for gs in gs_rows.scalars().all():
        items.append(ActivityFeedItem(
            id=f"game-{gs.id}",
            type="game",
            label="Nhặt Hoa Mai",
            icon="🌸",
            amount=gs.score,
            sign="+",
            unit="EXP",
            detail=None,
            created_at=gs.created_at.isoformat(),
        ))

    # 2. Tour bookings
    tb_rows = await db.execute(
        select(TourBooking)
        .where(TourBooking.user_id == current_user.id)
        .order_by(TourBooking.booked_at.desc())
        .limit(limit)
    )
    for tb in tb_rows.scalars().all():
        places = []
        if tb.places_json:
            try:
                places = _json.loads(tb.places_json)
            except Exception:
                pass
        label = "Tour " + ", ".join(places[:2]) if places else "Tour Bình Lợi"
        items.append(ActivityFeedItem(
            id=f"tour-{tb.id}",
            type="tour_booking",
            label=label,
            icon="🎫",
            amount=tb.total_vnd,
            sign="-",
            unit="vàng",
            detail=f"{tb.participants} người · {tb.tour_date or '—'} · #{tb.bid}",
            created_at=tb.booked_at.isoformat(),
        ))

    # 3. Shop purchases from activity log
    al_rows = await db.execute(
        select(ActivityLog)
        .where(
            ActivityLog.user_id == current_user.id,
            ActivityLog.action == "shop_buy",
        )
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    for al in al_rows.scalars().all():
        if al.action == "shop_buy":
            # detail = "Mua vật phẩm: {name} · {price} vàng"
            parts = (al.detail or "").split(" · ")
            price = 0
            name = al.detail or "Mua vật phẩm"
            try:
                price = int(parts[-1].split()[0]) if parts else 0
                name = parts[0].replace("Mua vật phẩm: ", "")
            except Exception:
                pass
            items.append(ActivityFeedItem(
                id=f"shop-{al.id}",
                type="shop_buy",
                label=name,
                icon="🛒",
                amount=price,
                sign="-",
                unit="vàng",
                detail=al.detail,
                created_at=al.created_at.isoformat(),
            ))

    # Sort by date desc, return top N
    items.sort(key=lambda x: x.created_at, reverse=True)
    return items[:limit]

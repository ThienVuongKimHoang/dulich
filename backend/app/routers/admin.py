from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models import ActivityLog, Booking, CheckIn, Location, PageVisit, TourBooking, User, Workshop
from sqlalchemy.orm import selectinload
from app.schemas.user import UserOut
from security import hash_password, require_super_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class UserCreateAdmin(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "khach"


VALID_ROLES = {"khach", "thanh_vien", "admin", "super_admin"}


class UserUpdateAdmin(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    is_super_admin: Optional[bool] = None
    points: Optional[int] = None
    role: Optional[str] = None


class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    user_name: Optional[str]
    user_email: Optional[str]
    action: str
    detail: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class DailyVisitOut(BaseModel):
    date: str
    count: int


class StatsOut(BaseModel):
    total_users: int
    active_users: int
    total_visits: int
    visits_today: int
    daily_visits: List[DailyVisitOut]


class TrackVisitIn(BaseModel):
    page: str = "home"


# ── User management ────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    result = await db.execute(select(User).order_by(User.id))
    return list(result.scalars().all())


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user_admin(
    data: UserCreateAdmin,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_super_admin),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    role = data.role if data.role in VALID_ROLES else "khach"
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=role,
        is_admin=role in ("admin", "super_admin"),
        is_super_admin=role == "super_admin",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    log = ActivityLog(
        user_id=admin.id,
        user_name=admin.name,
        user_email=admin.email,
        action="admin_create_user",
        detail=f"Tạo tài khoản mới: {data.email}",
    )
    db.add(log)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user_admin(
    user_id: int,
    data: UserUpdateAdmin,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_super_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    changes = []
    if data.is_active is not None:
        user.is_active = data.is_active
        changes.append(f"is_active={data.is_active}")
    if data.role is not None:
        if data.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Vai trò không hợp lệ. Chọn: {', '.join(VALID_ROLES)}")
        if user.is_super_admin and data.role != "super_admin":
            raise HTTPException(status_code=403, detail="Không thể hạ cấp Super Admin")
        user.role = data.role
        user.is_admin = data.role in ("admin", "super_admin")
        user.is_super_admin = data.role == "super_admin"
        changes.append(f"role={data.role}")
    elif data.is_admin is not None:
        user.is_admin = data.is_admin
        changes.append(f"is_admin={data.is_admin}")
    if data.is_super_admin is not None and data.role is None:
        user.is_super_admin = data.is_super_admin
        changes.append(f"is_super_admin={data.is_super_admin}")
    if data.points is not None:
        user.points = data.points
        changes.append(f"points={data.points}")

    log = ActivityLog(
        user_id=admin.id,
        user_name=admin.name,
        user_email=admin.email,
        action="admin_update_user",
        detail=f"Cập nhật {user.email}: {', '.join(changes)}",
    )
    db.add(log)
    await db.flush()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_super_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if user.is_super_admin:
        raise HTTPException(status_code=403, detail="Không thể xóa super admin")

    log = ActivityLog(
        user_id=admin.id,
        user_name=admin.name,
        user_email=admin.email,
        action="admin_delete_user",
        detail=f"Xóa tài khoản: {user.email} ({user.name})",
    )
    db.add(log)
    await db.delete(user)


# ── Activity logs ──────────────────────────────────────────────────────────────

@router.get("/activity-logs", response_model=List[ActivityLogOut])
async def get_activity_logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    result = await db.execute(
        select(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsOut)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    active_users = (await db.execute(select(func.count()).where(User.is_active == True))).scalar_one()
    total_visits = (await db.execute(select(func.count()).select_from(PageVisit))).scalar_one()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    visits_today = (await db.execute(
        select(func.count()).where(PageVisit.visited_at >= today_start)
    )).scalar_one()

    # Last 30 days daily visits
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=29)
    rows = await db.execute(
        select(
            func.date(PageVisit.visited_at).label("date"),
            func.count().label("count"),
        )
        .where(PageVisit.visited_at >= thirty_days_ago)
        .group_by(func.date(PageVisit.visited_at))
        .order_by(func.date(PageVisit.visited_at))
    )
    daily_visits = [DailyVisitOut(date=str(r.date), count=r.count) for r in rows]

    return StatsOut(
        total_users=total_users,
        active_users=active_users,
        total_visits=total_visits,
        visits_today=visits_today,
        daily_visits=daily_visits,
    )


# ── Workshop registrations ─────────────────────────────────────────────────────

class WorkshopRegistrationOut(BaseModel):
    id: int
    user_name: str
    user_email: str
    workshop_title: str
    workshop_slug: str
    scheduled_at: str
    participants: int
    status: str
    created_at: str


@router.get("/workshop-registrations", response_model=List[WorkshopRegistrationOut])
async def list_workshop_registrations(
    search: Optional[str] = None,
    workshop_slug: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    query = (
        select(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.workshop))
        .order_by(Booking.created_at.desc())
    )
    result = await db.execute(query)
    bookings = result.scalars().all()

    output = []
    for b in bookings:
        if search:
            haystack = (b.user.name + " " + b.user.email).lower()
            if search.lower() not in haystack:
                continue
        if workshop_slug and b.workshop.slug != workshop_slug:
            continue
        output.append(WorkshopRegistrationOut(
            id=b.id,
            user_name=b.user.name,
            user_email=b.user.email,
            workshop_title=b.workshop.title,
            workshop_slug=b.workshop.slug,
            scheduled_at=b.scheduled_at.isoformat(),
            participants=b.participants,
            status=b.status,
            created_at=b.created_at.isoformat(),
        ))
    return output


@router.get("/workshop-registrations/{booking_id}", response_model=WorkshopRegistrationOut)
async def get_workshop_registration(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.workshop))
        .where(Booking.id == booking_id)
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký")
    return WorkshopRegistrationOut(
        id=b.id,
        user_name=b.user.name,
        user_email=b.user.email,
        workshop_title=b.workshop.title,
        workshop_slug=b.workshop.slug,
        scheduled_at=b.scheduled_at.isoformat(),
        participants=b.participants,
        status=b.status,
        created_at=b.created_at.isoformat(),
    )


# ── Tour booking admin lookup (for QR scanner) ────────────────────────────────

class TourBookingAdminOut(BaseModel):
    id: int
    bid: str
    tour_date: Optional[str]
    participants: int
    places: list
    notes: Optional[str]
    total_vnd: int
    status: str
    booked_at: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None


@router.get("/tour-bookings/{bid}", response_model=TourBookingAdminOut)
async def get_tour_booking_admin(
    bid: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    import json as _json
    result = await db.execute(select(TourBooking).where(TourBooking.bid == bid))
    tb = result.scalar_one_or_none()
    if not tb:
        raise HTTPException(status_code=404, detail=f"Mã đặt lịch #{bid} không tồn tại trong hệ thống.")

    # Optionally fetch user info
    user_name = None
    user_email = None
    if tb.user_id:
        u_row = await db.execute(select(User).where(User.id == tb.user_id))
        u = u_row.scalar_one_or_none()
        if u:
            user_name = u.name
            user_email = u.email

    places = []
    if tb.places_json:
        try:
            places = _json.loads(tb.places_json)
        except Exception:
            pass

    return TourBookingAdminOut(
        id=tb.id,
        bid=tb.bid,
        tour_date=tb.tour_date,
        participants=tb.participants,
        places=places,
        notes=tb.notes,
        total_vnd=tb.total_vnd,
        status=tb.status,
        booked_at=tb.booked_at.isoformat(),
        user_name=user_name,
        user_email=user_email,
    )


# ── Locations admin ───────────────────────────────────────────────────────────

class LocationAdminOut(BaseModel):
    id: int
    name: str
    slug: str
    category: str
    address: str
    latitude: float
    longitude: float
    image_url: Optional[str]
    is_active: bool
    checkin_count: int
    created_at: str


class LocationPatch(BaseModel):
    is_active: Optional[bool] = None
    name: Optional[str] = None
    address: Optional[str] = None


@router.get("/locations", response_model=List[LocationAdminOut])
async def list_locations_admin(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    result = await db.execute(select(Location).order_by(Location.id))
    locations = result.scalars().all()

    output = []
    for loc in locations:
        checkin_count = (await db.execute(
            select(func.count()).where(CheckIn.location == loc.slug)
        )).scalar_one()
        output.append(LocationAdminOut(
            id=loc.id,
            name=loc.name,
            slug=loc.slug,
            category=loc.category.value if hasattr(loc.category, "value") else str(loc.category),
            address=loc.address,
            latitude=loc.latitude,
            longitude=loc.longitude,
            image_url=loc.image_url,
            is_active=loc.is_active,
            checkin_count=checkin_count,
            created_at=loc.created_at.isoformat(),
        ))
    return output


@router.patch("/locations/{location_id}", response_model=LocationAdminOut)
async def update_location_admin(
    location_id: int,
    data: LocationPatch,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Địa điểm không tồn tại")
    if data.is_active is not None:
        loc.is_active = data.is_active
    if data.name is not None:
        loc.name = data.name
    if data.address is not None:
        loc.address = data.address
    await db.commit()
    await db.refresh(loc)
    checkin_count = (await db.execute(
        select(func.count()).where(CheckIn.location == loc.slug)
    )).scalar_one()
    return LocationAdminOut(
        id=loc.id,
        name=loc.name,
        slug=loc.slug,
        category=loc.category.value if hasattr(loc.category, "value") else str(loc.category),
        address=loc.address,
        latitude=loc.latitude,
        longitude=loc.longitude,
        image_url=loc.image_url,
        is_active=loc.is_active,
        checkin_count=checkin_count,
        created_at=loc.created_at.isoformat(),
    )


# ── Workshops admin list ───────────────────────────────────────────────────────

class WorkshopAdminOut(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    duration_hours: float
    max_participants: int
    price_vnd: int
    points_reward: int
    is_active: bool
    location_name: Optional[str]
    booking_count: int
    confirmed_count: int
    created_at: str


@router.get("/workshops-list", response_model=List[WorkshopAdminOut])
async def list_workshops_admin(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    result = await db.execute(
        select(Workshop).options(selectinload(Workshop.location)).order_by(Workshop.id)
    )
    workshops = result.scalars().all()

    output = []
    for ws in workshops:
        booking_count = (await db.execute(
            select(func.count()).where(Booking.workshop_id == ws.id)
        )).scalar_one()
        confirmed_count = (await db.execute(
            select(func.count()).where(
                Booking.workshop_id == ws.id,
                Booking.status.in_(["confirmed", "completed"])
            )
        )).scalar_one()
        output.append(WorkshopAdminOut(
            id=ws.id,
            slug=ws.slug,
            title=ws.title,
            description=ws.description,
            duration_hours=ws.duration_hours,
            max_participants=ws.max_participants,
            price_vnd=ws.price_vnd,
            points_reward=ws.points_reward,
            is_active=ws.is_active,
            location_name=ws.location.name if ws.location else None,
            booking_count=booking_count,
            confirmed_count=confirmed_count,
            created_at=ws.created_at.isoformat(),
        ))
    return output


# ── Track visit (public) ───────────────────────────────────────────────────────

@router.post("/track-visit", status_code=status.HTTP_204_NO_CONTENT)
async def track_visit(
    data: TrackVisitIn,
    db: AsyncSession = Depends(get_db),
):
    db.add(PageVisit(page=data.page))

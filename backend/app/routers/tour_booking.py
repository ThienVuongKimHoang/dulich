from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models import ActivityLog, TourBooking, User, UserInventoryItem
from security import get_current_user, get_optional_user

router = APIRouter(prefix="/api/v1/tour-bookings", tags=["tour-bookings"])


# ── Schemas ────────────────────────────────────────────────────────────────────

VOUCHER_CATALOG = {
    "voucher-giam-gia-tour":    0.10,
    "voucher-giam-gia-tour-20": 0.20,
    "voucher-giam-gia-tour-50": 0.50,
}


class TourBookingIn(BaseModel):
    bid: str = Field(..., max_length=60)
    date: Optional[str] = Field(None, max_length=20)
    people: int = Field(1, ge=1, le=200)
    places: List[str] = Field(default_factory=list)
    notes: Optional[str] = Field(None, max_length=1000)
    total: int = Field(0, ge=0)                    # giá gốc (gold)
    voucher_item_id: Optional[str] = Field(None)   # ID voucher dùng (tối đa 1)


class TourBookingQRIn(BaseModel):
    qr_encrypted: str


class TourBookingOut(BaseModel):
    id: int
    bid: str
    tour_date: Optional[str]
    participants: int
    places: List[str]
    notes: Optional[str]
    total_vnd: int  # stores gold amount (reused field)
    status: str
    qr_encrypted: Optional[str]
    booked_at: str
    gold_remaining: Optional[int] = None

    model_config = {"from_attributes": True}


def _to_out(b: TourBooking, gold_remaining: Optional[int] = None) -> TourBookingOut:
    places = []
    if b.places_json:
        try:
            places = json.loads(b.places_json)
        except Exception:
            places = []
    return TourBookingOut(
        id=b.id,
        bid=b.bid,
        tour_date=b.tour_date,
        participants=b.participants,
        places=places,
        notes=b.notes,
        total_vnd=b.total_vnd,
        status=b.status,
        qr_encrypted=b.qr_encrypted,
        booked_at=b.booked_at.isoformat(),
        gold_remaining=gold_remaining,
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("", response_model=TourBookingOut, status_code=status.HTTP_201_CREATED)
async def create_tour_booking(
    data: TourBookingIn,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # Check duplicate bid
    existing = await db.execute(select(TourBooking).where(TourBooking.bid == data.bid))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Mã đặt lịch đã tồn tại")

    gold_remaining = None
    final_total = data.total

    # Deduct gold if user is logged in
    if current_user and data.total > 0:
        # Apply voucher (1 voucher per booking)
        discount_pct = 0
        if data.voucher_item_id:
            discount = VOUCHER_CATALOG.get(data.voucher_item_id)
            if not discount:
                raise HTTPException(status_code=400, detail="Voucher không hợp lệ")
            inv_row = await db.execute(
                select(UserInventoryItem).where(
                    UserInventoryItem.user_id == current_user.id,
                    UserInventoryItem.item_id == data.voucher_item_id,
                )
            )
            inv = inv_row.scalar_one_or_none()
            if not inv or inv.quantity < 1:
                raise HTTPException(status_code=400, detail="Không có voucher này trong túi đồ")
            final_total = round(data.total * (1 - discount))
            discount_pct = int(discount * 100)
            inv.quantity -= 1

        if current_user.gold < final_total:
            raise HTTPException(
                status_code=400,
                detail=f"Không đủ vàng. Bạn có {current_user.gold} vàng, cần {final_total} vàng.",
            )
        current_user.gold -= final_total
        gold_remaining = current_user.gold

        places_str = ", ".join(data.places) if data.places else "Tour cơ bản"
        discount_note = f" (giảm {discount_pct}%)" if discount_pct else ""
        log = ActivityLog(
            user_id=current_user.id,
            user_name=current_user.name,
            user_email=current_user.email,
            action="tour_booking",
            detail=f"Đặt lịch tour · {final_total} vàng{discount_note} · {data.people} người · {places_str}",
        )
        db.add(log)

    booking = TourBooking(
        bid=data.bid,
        user_id=current_user.id if current_user else None,
        tour_date=data.date or None,
        participants=data.people,
        places_json=json.dumps(data.places, ensure_ascii=False),
        notes=data.notes,
        total_vnd=final_total,
        status="confirmed",
    )
    db.add(booking)

    await db.flush()
    await db.refresh(booking)
    return _to_out(booking, gold_remaining)


@router.patch("/{bid}/qr", response_model=TourBookingOut)
async def save_tour_qr(
    bid: str,
    data: TourBookingQRIn,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = await db.execute(select(TourBooking).where(TourBooking.bid == bid))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail=f"Mã đặt chỗ #{bid} không tồn tại trong hệ thống.")
    booking.qr_encrypted = data.qr_encrypted
    await db.flush()
    await db.refresh(booking)
    return _to_out(booking)


@router.get("/my", response_model=List[TourBookingOut])
async def get_my_tour_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TourBooking)
        .where(TourBooking.user_id == current_user.id)
        .order_by(TourBooking.booked_at.desc())
    )
    return [_to_out(b) for b in result.scalars().all()]

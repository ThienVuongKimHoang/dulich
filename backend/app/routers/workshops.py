from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.models import Booking, BookingStatus, User, Workshop
from security import get_current_user

router = APIRouter(prefix="/api/v1/workshops", tags=["workshops"])


class WorkshopRegisterIn(BaseModel):
    workshop_slug: str = Field(..., max_length=100)
    scheduled_at: datetime
    participants: int = Field(1, ge=1, le=10)
    note: Optional[str] = Field(None, max_length=500)


class UpdateQRIn(BaseModel):
    qr_encrypted: str


class BookingInfoOut(BaseModel):
    id: int
    workshop_slug: str
    workshop_title: str
    user_name: str
    user_email: str
    scheduled_at: str
    participants: int
    status: str
    qr_encrypted: Optional[str]
    created_at: str


class BookingMyOut(BaseModel):
    id: int
    workshop_slug: str
    workshop_title: str
    user_name: str
    user_email: str
    scheduled_at: str
    participants: int
    status: str
    qr_encrypted: Optional[str]
    created_at: str


@router.post("/register", response_model=BookingInfoOut, status_code=status.HTTP_201_CREATED)
async def register_workshop(
    data: WorkshopRegisterIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws_result = await db.execute(select(Workshop).where(Workshop.slug == data.workshop_slug))
    workshop = ws_result.scalar_one_or_none()
    if not workshop:
        raise HTTPException(status_code=404, detail="Không tìm thấy workshop")

    booking = Booking(
        user_id=current_user.id,
        workshop_id=workshop.id,
        scheduled_at=data.scheduled_at,
        participants=data.participants,
        status=BookingStatus.confirmed,
        note=data.note,
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)

    return BookingInfoOut(
        id=booking.id,
        workshop_slug=data.workshop_slug,
        workshop_title=workshop.title,
        user_name=current_user.name,
        user_email=current_user.email,
        scheduled_at=booking.scheduled_at.isoformat(),
        participants=booking.participants,
        status=booking.status,
        qr_encrypted=booking.qr_encrypted,
        created_at=booking.created_at.isoformat(),
    )


@router.patch("/bookings/{booking_id}/qr", status_code=status.HTTP_204_NO_CONTENT)
async def update_booking_qr(
    booking_id: int,
    data: UpdateQRIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.user_id == current_user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt chỗ")
    booking.qr_encrypted = data.qr_encrypted


@router.get("/my-bookings", response_model=List[BookingMyOut])
async def get_my_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.workshop), selectinload(Booking.user))
        .where(
            Booking.user_id == current_user.id,
            Booking.status != BookingStatus.cancelled,
        )
        .order_by(Booking.created_at.desc())
    )
    bookings = result.scalars().all()
    return [
        BookingMyOut(
            id=b.id,
            workshop_slug=b.workshop.slug,
            workshop_title=b.workshop.title,
            user_name=b.user.name,
            user_email=b.user.email,
            scheduled_at=b.scheduled_at.isoformat(),
            participants=b.participants,
            status=b.status,
            qr_encrypted=b.qr_encrypted,
            created_at=b.created_at.isoformat(),
        )
        for b in bookings
    ]

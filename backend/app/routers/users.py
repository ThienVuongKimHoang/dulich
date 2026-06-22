import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from app.schemas.user import UserOut
from app.services.user_service import get_all_users
from security import get_current_user, require_super_admin

router = APIRouter(prefix="/api/v1/users", tags=["users"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "avatars")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("/me", response_model=UserOut)
async def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Ảnh tối đa 5MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)

    # Xoá avatar cũ nếu có
    if current_user.avatar_url:
        old_file = os.path.join(UPLOAD_DIR, os.path.basename(current_user.avatar_url))
        if os.path.exists(old_file):
            os.remove(old_file)

    current_user.avatar_url = f"/uploads/avatars/{filename}"
    await db.flush()
    await db.refresh(current_user)
    return current_user


class UpdateProfileIn(BaseModel):
    equipped_frame: Optional[str] = None


@router.patch("/me", response_model=UserOut)
async def update_profile(
    data: UpdateProfileIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if "equipped_frame" in data.model_fields_set or data.equipped_frame is not None:
        current_user.equipped_frame = data.equipped_frame
    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.get("/", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_super_admin),
):
    return await get_all_users(db)

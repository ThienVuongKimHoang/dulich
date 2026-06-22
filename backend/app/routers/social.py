import base64
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from groq import AsyncGroq

from core.config import get_settings
from core.database import get_db
from core.models import FacebookProof
from security import get_current_user

router = APIRouter(prefix="/api/v1/social", tags=["social"])

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "fb_proofs")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_PROOFS_PER_DAY = 3
MAX_EXP_PER_PROOF = 500   # tránh ảnh chỉnh sửa với số like khổng lồ


# ── Groq vision ────────────────────────────────────────────────────────────────

async def _analyze_screenshot(image_bytes: bytes, mime: str) -> dict:
    s = get_settings()
    if not s.groq_api_key:
        raise HTTPException(status_code=503, detail="Chưa cấu hình Groq API key")

    b64 = base64.b64encode(image_bytes).decode()
    client = AsyncGroq(api_key=s.groq_api_key)

    prompt = (
        "This is a screenshot of a Facebook post. "
        "Extract ONLY the numbers for: likes/reactions, comments, shares. "
        "Look carefully at the reaction count (👍❤️😆😢😮😡), comment count, and share count. "
        "Numbers may appear as '1.2K' (=1200), '2,5K' (=2500), etc — convert to integer. "
        "If the screenshot does NOT look like a real Facebook post, set valid=false. "
        'Return ONLY valid JSON: {"valid": true, "likes": 17, "comments": 5, "shares": 3}'
    )

    resp = await client.chat.completions.create(
        model=VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                {"type": "text", "text": prompt},
            ],
        }],
        max_tokens=120,
        temperature=0,
    )

    raw = resp.choices[0].message.content.strip()
    # Extract JSON từ response (có thể có text thừa)
    start, end = raw.find("{"), raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise HTTPException(status_code=422, detail="Groq không đọc được ảnh, vui lòng chụp rõ hơn")

    try:
        data = json.loads(raw[start:end])
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Không phân tích được ảnh, vui lòng thử lại")

    if not data.get("valid", True) is False and not data.get("valid", True):
        raise HTTPException(status_code=422, detail="Ảnh không phải bài đăng Facebook hợp lệ")

    return {
        "likes": max(0, int(data.get("likes") or 0)),
        "comments": max(0, int(data.get("comments") or 0)),
        "shares": max(0, int(data.get("shares") or 0)),
    }


# ── Schemas ────────────────────────────────────────────────────────────────────

class FacebookProofOut(BaseModel):
    id: int
    screenshot_url: str
    like_count: int
    comment_count: int
    share_count: int
    exp_awarded: int
    submitted_at: str

    model_config = {"from_attributes": True}


def _to_out(proof: FacebookProof) -> FacebookProofOut:
    return FacebookProofOut(
        id=proof.id,
        screenshot_url=f"/uploads/fb_proofs/{os.path.basename(proof.screenshot_path)}",
        like_count=proof.like_count,
        comment_count=proof.comment_count,
        share_count=proof.share_count,
        exp_awarded=proof.exp_awarded,
        submitted_at=proof.submitted_at.isoformat(),
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/facebook/submit-proof", response_model=FacebookProofOut)
async def submit_facebook_proof(
    screenshot: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Kiểm tra giới hạn ngày
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    count_today = await db.scalar(
        select(func.count()).where(
            FacebookProof.user_id == current_user.id,
            FacebookProof.submitted_at >= today_start,
        )
    )
    if count_today >= MAX_PROOFS_PER_DAY:
        raise HTTPException(status_code=429, detail=f"Tối đa {MAX_PROOFS_PER_DAY} ảnh mỗi ngày")

    # Đọc file
    if screenshot.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận ảnh JPG, PNG hoặc WebP")
    image_bytes = await screenshot.read()
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ảnh quá lớn (tối đa 8MB)")

    # Groq phân tích
    stats = await _analyze_screenshot(image_bytes, screenshot.content_type)

    # Lưu file
    ext = screenshot.filename.rsplit(".", 1)[-1] if screenshot.filename and "." in screenshot.filename else "jpg"
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    # Tính EXP: 1 like = 1 điểm, giới hạn MAX_EXP_PER_PROOF
    exp = min(stats["likes"], MAX_EXP_PER_PROOF)

    proof = FacebookProof(
        user_id=current_user.id,
        screenshot_path=filepath,
        like_count=stats["likes"],
        comment_count=stats["comments"],
        share_count=stats["shares"],
        exp_awarded=exp,
    )
    db.add(proof)

    if exp > 0:
        current_user.points += exp

    await db.flush()
    await db.refresh(proof)
    return _to_out(proof)


@router.get("/facebook/my-proofs", response_model=List[FacebookProofOut])
async def my_facebook_proofs(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(FacebookProof)
        .where(FacebookProof.user_id == current_user.id)
        .order_by(FacebookProof.submitted_at.desc())
    )
    return [_to_out(p) for p in result.scalars().all()]


@router.delete("/facebook/proof/{proof_id}")
async def delete_facebook_proof(
    proof_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(FacebookProof).where(
            FacebookProof.id == proof_id,
            FacebookProof.user_id == current_user.id,
        )
    )
    proof = result.scalar_one_or_none()
    if not proof:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    # Xóa file ảnh
    if os.path.exists(proof.screenshot_path):
        os.remove(proof.screenshot_path)
    await db.delete(proof)
    await db.flush()
    return {"ok": True}

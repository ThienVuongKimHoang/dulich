from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models import GameScore
from app.schemas.user import UserOut
from app.services.user_service import add_game_score
from security import get_current_user

router = APIRouter(prefix="/api/v1/minigame", tags=["minigame"])


class ScoreSubmit(BaseModel):
    score: int = Field(..., ge=0, le=10000)
    game: str = Field(default="mai_flower", max_length=50)


class ScoreResult(BaseModel):
    message: str
    score_added: int
    total_points: int
    user: UserOut


class ScoreEntry(BaseModel):
    id: int
    game: str
    score: int
    created_at: datetime
    model_config = {"from_attributes": True}


@router.post("/score", response_model=ScoreResult)
async def submit_score(
    data: ScoreSubmit,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản bị vô hiệu hóa")

    updated_user = await add_game_score(db, current_user.id, data.score, data.game)
    return ScoreResult(
        message=f"Cộng {data.score} điểm thành công!",
        score_added=data.score,
        total_points=updated_user.points,
        user=updated_user,
    )


@router.get("/my-points", response_model=dict)
async def get_my_points(current_user=Depends(get_current_user)):
    return {"points": current_user.points, "name": current_user.name}


@router.get("/history", response_model=List[ScoreEntry])
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(GameScore)
        .where(GameScore.user_id == current_user.id)
        .order_by(GameScore.created_at.desc())
        .limit(20)
    )
    return list(result.scalars().all())

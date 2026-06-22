from __future__ import annotations

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models import GameScore, User
from app.schemas.user import UserCreate
from security import hash_password


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_all_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.id))
    return list(result.scalars().all())


async def add_game_score(db: AsyncSession, user_id: int, score: int, game: str = "mai_flower") -> User:
    entry = GameScore(user_id=user_id, score=score, game=game)
    db.add(entry)

    user = await get_user_by_id(db, user_id)
    user.points += score
    await db.flush()
    await db.refresh(user)
    return user

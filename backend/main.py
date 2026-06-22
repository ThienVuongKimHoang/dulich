import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from core.database import AsyncSessionLocal, create_tables
from core.models import User
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.minigame import router as minigame_router
from app.routers.profile import router as profile_router
from app.routers.admin import router as admin_router
from app.routers.chat import router as chat_router
from app.routers.community import router as community_router
from app.routers.shop import router as shop_router
from app.routers.plant_game import router as plant_router
from app.routers.transform import router as transform_router
from app.routers.workshops import router as workshops_router
from app.routers.tour_booking import router as tour_booking_router
from app.routers.social import router as social_router
from security import hash_password

# uvicorn main:app --reload

async def _ensure_super_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == "admin@binhloi.vn")
        )
        if result.scalar_one_or_none():
            return
        admin = User(
            name="Super Admin",
            email="admin@binhloi.vn",
            hashed_password=hash_password("Admin@2024!"),
            is_active=True,
            is_admin=True,
            is_super_admin=True,
            points=0,
        )
        db.add(admin)
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    await _ensure_super_admin()
    yield


app = FastAPI(
    title="Bình Lợi Healing Journey API",
    version="1.0.0",
    lifespan=lifespan,
)

_extra_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"] + _extra_origins,
    allow_origin_regex=r"https://.*\.trycloudflare\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(minigame_router)
app.include_router(profile_router)
app.include_router(admin_router)
app.include_router(chat_router)
app.include_router(community_router)
app.include_router(shop_router)
app.include_router(plant_router)
app.include_router(transform_router)
app.include_router(workshops_router)
app.include_router(tour_booking_router)
app.include_router(social_router)

_uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
os.makedirs(os.path.join(_uploads_dir, "fb_proofs"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}

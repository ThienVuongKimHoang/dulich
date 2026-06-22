"""
Chạy: python seed_superadmin.py
Tạo tài khoản super_admin nếu chưa tồn tại.
"""
import asyncio
from sqlalchemy import select
from core.database import AsyncSessionLocal, create_tables
from core.models import User
from security import hash_password

SUPER_ADMIN_EMAIL    = "admin@binhloi.vn"
SUPER_ADMIN_PASSWORD = "Admin@2024!"
SUPER_ADMIN_NAME     = "Super Admin"


async def seed():
    await create_tables()
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == SUPER_ADMIN_EMAIL))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[seed] Super admin đã tồn tại: {SUPER_ADMIN_EMAIL}")
            if not existing.is_super_admin:
                existing.is_super_admin = True
                existing.is_admin = True
                await db.commit()
                print("[seed] Đã cập nhật quyền super_admin.")
            return

        admin = User(
            name=SUPER_ADMIN_NAME,
            email=SUPER_ADMIN_EMAIL,
            hashed_password=hash_password(SUPER_ADMIN_PASSWORD),
            is_active=True,
            is_admin=True,
            is_super_admin=True,
            points=0,
        )
        db.add(admin)
        await db.commit()
        print(f"[seed] Tạo super admin thành công!")
        print(f"       Email   : {SUPER_ADMIN_EMAIL}")
        print(f"       Password: {SUPER_ADMIN_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())

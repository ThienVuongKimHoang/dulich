"""
Seed dữ liệu Workshop và Location khớp với frontend travel.jsx.
Chạy: python seed_workshops.py
"""
import asyncio
from sqlalchemy import select
from core.database import AsyncSessionLocal, create_tables
from core.models import Location, LocationCategory, Workshop

# ── Locations ──────────────────────────────────────────────────────────────────
LOCATIONS = [
    {
        "name": "Làng Mai Bình Lợi",
        "slug": "lang-mai-binh-loi",
        "description": "Vùng đất nổi tiếng với nghề trồng mai vàng truyền thống lâu đời. Hàng trăm vườn mai nở rộ mỗi dịp Tết.",
        "category": LocationCategory.mai_village,
        "address": "Xã Bình Lợi, Huyện Bình Chánh, TP.HCM",
        "latitude": 10.7195,
        "longitude": 106.5432,
    },
    {
        "name": "Làng Nhang Lê Minh Xuân",
        "slug": "lang-nhang-le-minh-xuan",
        "description": "Làng nghề làm nhang trầm hương thủ công lâu đời, nơi những nghệ nhân truyền từng bí quyết qua nhiều thế hệ.",
        "category": LocationCategory.incense_village,
        "address": "Lê Minh Xuân, Huyện Bình Chánh, TP.HCM",
        "latitude": 10.7021,
        "longitude": 106.5318,
    },
    {
        "name": "Hồ Cá Koi Bình Lợi",
        "slug": "ho-ca-koi-binh-loi",
        "description": "Không gian thiên nhiên yên tĩnh bên hồ cá koi, lý tưởng để thiền định và tĩnh tâm.",
        "category": LocationCategory.koi_pond,
        "address": "Xã Bình Lợi, Huyện Bình Chánh, TP.HCM",
        "latitude": 10.7150,
        "longitude": 106.5380,
    },
]

# ── Workshops khớp với frontend ────────────────────────────────────────────────
# Dữ liệu từ BONSAI_TRACK và achievement rows trong travel.jsx
WORKSHOPS = [
    # ── Uốn cành mai / Bonsai (location: lang-mai-binh-loi) ──
    {
        "slug": "uon-mai-1",
        "title": "Uốn cành mai – Tập sự",
        "description": "Tìm hiểu nguyên tắc tạo dáng, kỹ thuật quấn dây nhôm và tự tay uốn cành mai đầu tiên. Phù hợp cho người mới bắt đầu.",
        "duration_hours": 3.0,
        "max_participants": 10,
        "price_vnd": 350_000,
        "points_reward": 3_000,
        "location_slug": "lang-mai-binh-loi",
    },
    {
        "slug": "bonsai-basic",
        "title": "Bonsai cơ bản",
        "description": "Học cách chọn cây giống, cắt tỉa và định hình khung xương cho cây bonsai mai. Yêu cầu hoàn thành Tập sự.",
        "duration_hours": 4.0,
        "max_participants": 10,
        "price_vnd": 450_000,
        "points_reward": 5_000,
        "location_slug": "lang-mai-binh-loi",
    },
    {
        "slug": "bonsai-mid",
        "title": "Bonsai trung cấp",
        "description": "Thực hành ghép cành, tạo rễ nổi và kiểm soát sự phát triển của cây qua các mùa. Yêu cầu hoàn thành Cơ bản.",
        "duration_hours": 5.0,
        "max_participants": 8,
        "price_vnd": 600_000,
        "points_reward": 8_000,
        "location_slug": "lang-mai-binh-loi",
    },
    {
        "slug": "bonsai-advanced",
        "title": "Bậc thầy bonsai",
        "description": "Tạo tác phẩm bonsai mai hoàn chỉnh theo phong cách cổ điển và hiện đại Nam Bộ. Yêu cầu hoàn thành Trung cấp.",
        "duration_hours": 6.0,
        "max_participants": 6,
        "price_vnd": 800_000,
        "points_reward": 15_000,
        "location_slug": "lang-mai-binh-loi",
    },

    # ── Nhang thơm (location: lang-nhang-le-minh-xuan) ──
    {
        "slug": "nhang-1",
        "title": "Làm nhang thơm – Tập sự",
        "description": "Khám phá quy trình làm nhang thủ công, tìm hiểu nguyên liệu trầm hương và tự tay tạo ra sản phẩm đầu tiên.",
        "duration_hours": 4.0,
        "max_participants": 8,
        "price_vnd": 150_000,
        "points_reward": 2_000,
        "location_slug": "lang-nhang-le-minh-xuan",
    },
    {
        "slug": "nhang-basic",
        "title": "Làm nhang thơm – Cơ bản",
        "description": "Học cách pha trộn hương liệu, tạo hình nhang que và nhang vòng truyền thống theo kỹ thuật gia truyền.",
        "duration_hours": 4.0,
        "max_participants": 8,
        "price_vnd": 300_000,
        "points_reward": 4_000,
        "location_slug": "lang-nhang-le-minh-xuan",
    },
    {
        "slug": "nhang-mid",
        "title": "Làm nhang thơm – Trung cấp",
        "description": "Thực hành pha chế hương liệu phức tạp, tạo nhang tháp và các dòng sản phẩm cao cấp hơn.",
        "duration_hours": 5.0,
        "max_participants": 8,
        "price_vnd": 450_000,
        "points_reward": 7_000,
        "location_slug": "lang-nhang-le-minh-xuan",
    },
    {
        "slug": "nhang-advanced",
        "title": "Bậc thầy nhang thơm",
        "description": "Sáng tạo dòng nhang đặc trưng của riêng mình, kết hợp nghệ thuật tạo mùi và thẩm mỹ sản phẩm cao cấp.",
        "duration_hours": 6.0,
        "max_participants": 6,
        "price_vnd": 700_000,
        "points_reward": 12_000,
        "location_slug": "lang-nhang-le-minh-xuan",
    },

    # ── Thiền định (location: ho-ca-koi-binh-loi) ──
    {
        "slug": "meditation-basic",
        "title": "Thiền định bên hồ – Buổi sáng tĩnh lặng",
        "description": "Thiền định giữa thiên nhiên, tĩnh tâm và tìm lại bình yên bên hồ koi. Hướng dẫn bởi thầy thiền có kinh nghiệm.",
        "duration_hours": 2.0,
        "max_participants": 15,
        "price_vnd": 150_000,
        "points_reward": 1_500,
        "location_slug": "ho-ca-koi-binh-loi",
    },
]


async def seed():
    await create_tables()
    async with AsyncSessionLocal() as db:
        # ── Seed locations ──
        location_map: dict[str, int] = {}
        for loc_data in LOCATIONS:
            existing = await db.execute(
                select(Location).where(Location.slug == loc_data["slug"])
            )
            loc = existing.scalar_one_or_none()
            if not loc:
                loc = Location(**loc_data)
                db.add(loc)
                await db.flush()
                print(f"[seed] Tạo location: {loc_data['name']}")
            else:
                print(f"[seed] Location đã tồn tại: {loc_data['name']}")
            location_map[loc_data["slug"]] = loc.id

        # ── Seed workshops ──
        for ws_data in WORKSHOPS:
            existing = await db.execute(
                select(Workshop).where(Workshop.slug == ws_data["slug"])
            )
            ws = existing.scalar_one_or_none()

            location_id = location_map[ws_data["location_slug"]]
            ws_fields = {k: v for k, v in ws_data.items() if k != "location_slug"}
            ws_fields["location_id"] = location_id

            if not ws:
                ws = Workshop(**ws_fields)
                db.add(ws)
                print(f"[seed] Tạo workshop: {ws_data['title']} — {ws_data['price_vnd']:,} VNĐ / {ws_data['duration_hours']}h / {ws_data['max_participants']} người")
            else:
                # Cập nhật giá/thời lượng nếu đã tồn tại
                for k, v in ws_fields.items():
                    setattr(ws, k, v)
                print(f"[seed] Cập nhật workshop: {ws_data['title']}")

        await db.commit()
        print("\n[seed] Hoàn thành! Tổng cộng:")
        print(f"       {len(LOCATIONS)} locations")
        print(f"       {len(WORKSHOPS)} workshops")


if __name__ == "__main__":
    asyncio.run(seed())

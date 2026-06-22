from __future__ import annotations

import base64
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from groq import AsyncGroq
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.database import get_db
from core.models import User, UserPersonality
from security import get_current_user

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
TEXT_MODEL   = "llama-3.1-8b-instant"

BASE_PERSONA = """Bạn là Mai — người bạn GenZ thân thiết, nhí nhảnh, hơi "slay" của khu sinh thái Bình Lợi.

Tính cách:
- Nói chuyện như bạn thân — vui vẻ, bắt trend, hay dùng "quào", "ủa", "trời ơi", "xịn xò", "thật á", "cute vãi", "slay thật".
- Phản ứng tự nhiên, đúng cảm xúc — không gượng ép, không sách vở.
- Câu ngắn, nhịp nhanh, hay hỏi lại để kéo dài cuộc trò chuyện.
- Output Tiếng Việt, có thể dùng các từ tiếng anh như slay, chill chill

Khi nhận ảnh — quan trọng nhất:
- TUYỆT ĐỐI không tóm tắt hay liệt kê những thứ có trong ảnh.
- Phản ứng như một người bạn đang nhìn vào ảnh đó cùng với người gửi.
- Nếu có người trong ảnh: khen người đó tự nhiên, hỏi han, chọc nhẹ kiểu bạn bè.
- Nếu là cảnh đẹp: trầm trồ, hỏi xem ở đâu, kể cảm xúc.
- Nếu có đồ ăn: phấn khích, hỏi ngon không, giả vờ thèm.
- Bám theo tin nhắn của người gửi kèm ảnh — đó mới là trọng tâm cần trả lời.
- Tin nhắn phải tự nhiên, ngắn gọn
- Ngoài ra, hướng chủ đề về Bình Lợi

Bình Lợi có: vườn mai vàng, làng nhang thơm, hồ koi, chùa chiền, workshop thủ công, không gian healing."""

_PERSONALITY_BLOCK = """
[Ghi chú về người dùng này]
{summary}
→ Hãy tự nhiên điều chỉnh giọng điệu, cách xưng hô và mức độ sâu câu trả lời cho phù hợp.
"""

_RAG_BLOCK = """
[Thông tin địa điểm Bình Lợi — tham khảo để trả lời chính xác]
{context}
→ Dùng thông tin trên để trả lời đúng chi tiết, nhưng diễn đạt tự nhiên theo phong cách bạn bè, không đọc lại y nguyên.
"""

_PERSONALITY_EXTRACT = """Từ đoạn hội thoại dưới đây, viết 3-4 câu tóm tắt TÂM LÝ & PHONG CÁCH của người dùng:
- Họ thích giọng điệu gì (trang trọng/thân mật/hài hước)?
- Sở thích hoặc chủ đề quan tâm nổi bật?
- Cách họ đặt câu hỏi và kỳ vọng câu trả lời ra sao?

Chỉ viết đoạn mô tả ngắn, dùng tiếng Việt, không giải thích thêm.

Hội thoại:
{history}"""

# ── RAG Knowledge Base ─────────────────────────────────────────────────────────

_RAG_KB = [
    {
        "keywords": ["sake quán", "sake quan", "cầu đôi", "cá tai tượng", "gỏi củ hủ dừa", "nhà hàng cầu đôi"],
        "context": "Sake Quán (D8/67/1 Trần Văn Giàu, xã Bình Lợi): không gian sân vườn, món dân dã miền Tây: cá tai tượng chiên xù, gỏi củ hủ dừa tôm thịt, lẩu cá diêu hồng, dồi trường chiên giòn. Giá bình dân 80–200k/người, lý tưởng cho gia đình và đoàn dã ngoại.",
    },
    {
        "keywords": ["xuân hương", "xuan huong", "câu cá giải trí", "gà hấp mắm nhĩ", "heo tộc", "dừa nước", "cầu khỉ", "lẩu cá măng"],
        "context": "Khu ẩm thực sinh thái Xuân Hương (C12/40 Long Vĩnh, ấp 5, Bình Hưng): hàng dừa nước, cầu khỉ đong đưa, câu cá giải trí. Nổi tiếng: gà xé lên mâm, gà hấp mắm nhĩ trong lu, lẩu cá măng chua, heo tộc lên mẹt.",
    },
    {
        "keywords": ["tấn phong", "tan phong", "koi farm", "trang trại koi", "ao cá koi", "cá nhật", "9 ha", "cho cá ăn", "hồ cá koi", "hồ koi", "cá koi"],
        "context": "Tấn Phong Koi Farm (A3/69, ấp 1, xã Bình Lợi): trang trại cá Koi lớn nhất vùng, hơn 9 ha ao nuôi. Du khách tự tay cho cá ăn và chọn mua cá giống trực tiếp. Mô hình nông nghiệp đô thị công nghệ cao.",
    },
    {
        "keywords": ["ba quyền", "ba quyen", "trại cá ba quyền", "cá ba đuôi", "cá cảnh"],
        "context": "Trại cá cảnh Ba Quyền (ấp 1, xã Bình Lợi): cá Koi, cá ba đuôi, cá vàng đa dạng. Nằm gần Tấn Phong Koi Farm, tiện kết hợp trong một chuyến.",
    },
    {
        "keywords": ["dưa lưới", "hồng vân", "hong van", "nhà màng", "thủy canh", "tưới nhỏ giọt", "vườn dưa"],
        "context": "Vườn Dưa Lưới Huỳnh Thị Hồng Vân (ấp 2, xã Bình Lợi): nhà màng vô trùng, công nghệ tưới nhỏ giọt thủy canh. Trải nghiệm mặc đồ bảo hộ, tự tay hái dưa lưới căng mọng.",
    },
    {
        "keywords": ["sơn hà", "son ha", "vườn lan sơn hà", "lan dendrobium", "dendrobium", "lan thái", "40 sắc màu"],
        "context": "Vườn Lan Sơn Hà (ấp 5, xã Đa Phước, Bình Chánh): 12.000 m², chuyên lan Dendrobium Thái Lan với 40+ sắc màu. Học cách chọn giống, bón phân, kích hoa ra đều quanh năm.",
    },
    {
        "keywords": ["mê lan", "me lan", "lan ngọc điểm", "ngọc điểm", "lan rừng", "rạch cầu suối", "vĩnh lộc"],
        "context": "Vườn Mê Lan (Tổ 9, ấp 6B, Rạch Cầu Suối, Vĩnh Lộc A): lan rừng quý Ngọc Điểm, hương thơm ngát đặc trưng. Không gian kênh rạch thơ mộng, yên bình.",
    },
    {
        "keywords": ["nhang", "làng nhang", "se nhang", "nhang trầm", "workshop nhang", "làm nhang", "mai bá hương", "cơ sở nhang", "phơi nhang"],
        "context": "Làng Nhang Lê Minh Xuân (đường Mai Bá Hương, ấp 9, xã Bình Lợi): gần 100 năm tuổi, lớn nhất Nam Bộ. Sào nhang đỏ/hồng/vàng phơi dọc đường — Top 10 check-in TP.HCM. Workshop làm nhang từ 150k/người, Thứ 7 & Chủ nhật 8:00–12:00.",
    },
    {
        "keywords": ["đạp xe", "rừng tràm", "tràm lê minh xuân", "cào cào adventures", "xuồng ba lá", "rau choại", "đường mòn rừng"],
        "context": "Tuyến đạp xe rừng tràm Lê Minh Xuân (~30 km từ trung tâm): đường mòn đất đỏ rợp bóng tràm. Trải nghiệm: đạp xe, chèo xuồng ba lá qua kênh xanh, hái đọt rau choại, ngâm chân thảo dược.",
    },
    {
        "keywords": ["chùa thanh tâm", "phật cô đơn", "bát bửu", "tâm linh", "cầu duyên", "phật thích ca bình lợi", "thiền", "không gian tâm linh"],
        "context": "Chùa Thanh Tâm / Phật Cô Đơn (ấp 1, xã Bình Lợi): tượng Phật Thích Ca 4 tấn vẫn đứng nguyên sau chiến tranh — kỳ tích lịch sử. Mở cửa 05:00–21:00 hằng ngày. Điểm cầu duyên nổi tiếng vào ngày rằm và Valentine.",
    },
    {
        "keywords": ["làng mai", "mai vàng", "vườn mai", "hoa mai tết", "mai bình lợi", "trồng mai", "workshop mai", "uốn mai"],
        "context": "Làng Mai Vàng Bình Lợi (đường Mai Bá Hương, ấp 9, xã Bình Lợi): nghề trồng mai vàng truyền thống lâu đời. Đẹp nhất tháng 11–1 âm lịch. Workshop uốn mai cùng nghệ nhân, thăm vườn, mua mai dịp Tết.",
    },
    {
        "keywords": ["lịch trình", "tour một ngày", "kế hoạch đi", "gợi ý lịch", "đi trong ngày", "plan", "chơi gì", "làm gì ở bình lợi"],
        "context": "Gợi ý lịch trình 1 ngày Bình Lợi: 8:30 ăn sáng → 9:00 đạp xe rừng tràm + workshop nhang → 11:30 ăn trưa Sake Quán/Xuân Hương → 13:30 Tấn Phong Koi Farm → 15:00 Làng Mai Vàng hoặc Làng Nhang → 17:00 Chùa Thanh Tâm ngắm hoàng hôn → 18:00 về.",
    },
    {
        "keywords": ["đường đi", "đi như thế nào", "xe bus", "grab", "bao lâu", "cách đi", "phương tiện", "tuyến đường", "bao xa"],
        "context": "Đường đến Bình Lợi: Từ trung tâm Sài Gòn theo hướng Bình Chánh ~45–60 phút (khoảng 20–30 km). Đi xe máy, ô tô hoặc Grab đều được. Địa chỉ: xã Bình Lợi, huyện Bình Chánh, TP.HCM.",
    },
    {
        "keywords": ["giá", "bao nhiêu tiền", "phí", "chi phí", "vé vào", "mất bao nhiêu", "free", "miễn phí"],
        "context": "Chi phí tại Bình Lợi: Nhiều điểm tham quan miễn phí (vườn mai, làng nhang ngắm). Workshop nhang: 150k/người. Koi Farm: miễn phí vào xem. Ăn uống: 80–200k/người tại Sake Quán, Xuân Hương.",
    },
    {
        "keywords": ["đặt lịch", "booking", "hẹn trước", "đăng ký", "book tour", "đặt tour"],
        "context": "Đặt lịch tham quan Bình Lợi: Có thể đặt trước qua website để có hướng dẫn viên riêng. Workshop nhang & mai nên đặt trước, nhóm 5–15 người. Thứ 7 & Chủ nhật là thời điểm đông khách nhất.",
    },
]

# Keywords that signal the user needs location-specific info
_PLACE_TRIGGERS = {
    "bình lợi", "ở đâu", "chỗ nào", "địa điểm", "tham quan", "thăm quan",
    "ăn ở đâu", "đặt lịch", "booking", "workshop", "tour", "đi chơi",
    "khách sạn", "lưu trú", "nghỉ đêm", "camping",
}

# Very short / casual phrases that never need RAG
_CASUAL_PHRASES = {
    "chào", "hello", "hi", "alo", "hey", "ok", "oke", "okay",
    "cảm ơn", "thanks", "bye", "haha", "hihi", "😂", "❤️",
    "tốt", "hay quá", "thú vị", "hiểu rồi", "biết rồi", "đúng rồi", "được",
}


def _needs_rag(message: str) -> bool:
    """Return True if the message is likely asking about a specific Bình Lợi place/activity."""
    t = message.lower().strip()
    # Short casual replies never need RAG
    if len(t) < 20 and any(phrase in t for phrase in _CASUAL_PHRASES):
        return False
    # Check KB keywords first (most specific)
    for entry in _RAG_KB:
        if any(kw in t for kw in entry["keywords"]):
            return True
    # General place/activity triggers
    return any(trigger in t for trigger in _PLACE_TRIGGERS)


def _get_rag_context(message: str) -> str:
    """Retrieve top-3 relevant KB entries for the message."""
    t = message.lower()
    scored: list[tuple[int, str]] = []
    for entry in _RAG_KB:
        score = sum(1 for kw in entry["keywords"] if kw in t)
        if score > 0:
            scored.append((score, entry["context"]))
    scored.sort(reverse=True)
    return "\n\n".join(ctx for _, ctx in scored[:3])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_client() -> AsyncGroq:
    s = get_settings()
    if not s.groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY chưa được cấu hình")
    return AsyncGroq(api_key=s.groq_api_key)


def _build_system(personality: str, rag_context: str) -> str:
    system = BASE_PERSONA
    if rag_context:
        system += _RAG_BLOCK.format(context=rag_context)
    if personality and personality.strip():
        system += _PERSONALITY_BLOCK.format(summary=personality.strip())
    return system


def _parse_history(raw: Optional[str]) -> list[dict]:
    """Parse JSON history string from form data."""
    if not raw:
        return []
    try:
        items = json.loads(raw)
        result = []
        for item in items[-4:]:  # limit to last 4 messages
            role = "assistant" if item.get("role") == "bot" else "user"
            text = (item.get("text") or "").strip()
            if text:
                result.append({"role": role, "content": text})
        return result
    except Exception:
        return []


async def _user_from_token(authorization: Optional[str], db: AsyncSession) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        settings = get_settings()
        payload = jwt.decode(authorization[7:], settings.secret_key, algorithms=["HS256"])
        uid = payload.get("sub")
        if not uid:
            return None
        result = await db.execute(select(User).where(User.id == int(uid)))
        return result.scalar_one_or_none()
    except (JWTError, Exception):
        return None


async def _get_personality_summary(db: AsyncSession, user_id: int) -> str:
    row = await db.execute(select(UserPersonality).where(UserPersonality.user_id == user_id))
    pers = row.scalar_one_or_none()
    return pers.summary if pers and pers.summary else ""


# ── Schemas ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" | "bot"
    text: str


class PersonalityUpdateIn(BaseModel):
    history: List[ChatMessage]


class PersonalityOut(BaseModel):
    summary: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/message")
async def chat_message(
    message:       Optional[str]        = Form(None),
    image:         Optional[UploadFile] = File(None),
    history:       Optional[str]        = Form(None),   # JSON string of past messages
    authorization: Optional[str]        = Header(None),
    db:            AsyncSession         = Depends(get_db),
):
    if not message and not image:
        raise HTTPException(status_code=400, detail="Vui lòng gửi tin nhắn hoặc ảnh")

    user        = await _user_from_token(authorization, db)
    personality = await _get_personality_summary(db, user.id) if user else ""

    # Decide whether to fetch RAG context (only for text messages)
    rag_context = ""
    if message and not image:
        if _needs_rag(message):
            rag_context = _get_rag_context(message)

    system  = _build_system(personality, rag_context)
    client  = _get_client()
    history_msgs = _parse_history(history)

    if image:
        b64  = base64.b64encode(await image.read()).decode()
        mime = image.content_type or "image/jpeg"
        user_content = [
            {"type": "text",      "text": message if message else "Tao vừa gửi ảnh này cho mày xem, mày thấy sao?"},
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
        ]
        model = VISION_MODEL
        # Vision model: no history (payload too large)
        llm_messages = [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_content},
        ]
    else:
        model = TEXT_MODEL
        llm_messages = [{"role": "system", "content": system}]
        llm_messages.extend(history_msgs)
        llm_messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model=model,
        messages=llm_messages,
        max_tokens=512,
        temperature=0.88,
    )
    reply = response.choices[0].message.content
    return {"reply": reply, "used_rag": bool(rag_context)}


@router.post("/update-personality", response_model=PersonalityOut)
async def update_personality(
    data: PersonalityUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_msgs = [m for m in data.history if m.role == "user"]
    if len(user_msgs) < 3:
        summary = await _get_personality_summary(db, current_user.id)
        return PersonalityOut(summary=summary)

    history_text = "\n".join(
        f"{'Người dùng' if m.role == 'user' else 'Mai'}: {m.text}"
        for m in data.history[-24:]
        if m.text
    )

    client = _get_client()
    resp = await client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[{"role": "user", "content": _PERSONALITY_EXTRACT.format(history=history_text)}],
        max_tokens=180,
        temperature=0.4,
    )
    new_summary = resp.choices[0].message.content.strip()

    row = await db.execute(select(UserPersonality).where(UserPersonality.user_id == current_user.id))
    pers = row.scalar_one_or_none()
    if pers:
        pers.summary = new_summary
    else:
        db.add(UserPersonality(user_id=current_user.id, summary=new_summary))

    return PersonalityOut(summary=new_summary)


@router.get("/personality", response_model=PersonalityOut)
async def get_personality(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return PersonalityOut(summary=await _get_personality_summary(db, current_user.id))

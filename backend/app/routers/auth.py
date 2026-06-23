import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.database import get_db
from core.models import ActivityLog, User
from app.schemas.user import Token, UserCreate, UserOut
from app.services.user_service import create_user, get_user_by_email
from security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    if await get_user_by_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được sử dụng",
        )
    user = await create_user(db, data)
    db.add(ActivityLog(
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        action="register",
        detail="Đăng ký tài khoản mới",
    ))
    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # frontend gửi username = email
    user = await get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa",
        )
    db.add(ActivityLog(
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        action="login",
        detail="Đăng nhập thành công",
    ))
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.get("/google")
async def google_login_url():
    cfg = get_settings()
    params = urlencode({
        "client_id": cfg.google_client_id,
        "redirect_uri": cfg.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    })
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


async def _handle_google_callback(code: str, db: AsyncSession):
    cfg = get_settings()

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": cfg.google_client_id,
                "client_secret": cfg.google_client_secret,
                "redirect_uri": cfg.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Không thể xác thực với Google")
        token_data = token_res.json()

        userinfo_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        if userinfo_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Không thể lấy thông tin người dùng từ Google")
        guser = userinfo_res.json()

    email = guser.get("email")
    name = guser.get("name") or email.split("@")[0]
    avatar = guser.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Google không cung cấp email")

    user = await get_user_by_email(db, email)
    if not user:
        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(secrets.token_hex(32)),
            avatar_url=avatar,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        db.add(ActivityLog(
            user_id=user.id,
            user_name=user.name,
            user_email=user.email,
            action="register",
            detail="Đăng ký qua Google OAuth",
        ))
    else:
        if avatar and not user.avatar_url:
            user.avatar_url = avatar
        db.add(ActivityLog(
            user_id=user.id,
            user_name=user.name,
            user_email=user.email,
            action="login",
            detail="Đăng nhập qua Google OAuth",
        ))

    await db.commit()
    jwt = create_access_token({"sub": str(user.id)})
    return jwt, cfg.frontend_url


@router.get("/google/callback")
async def google_callback_api(code: str, db: AsyncSession = Depends(get_db)):
    jwt, frontend_url = await _handle_google_callback(code, db)
    return RedirectResponse(url=f"{frontend_url}/?google_token={jwt}")

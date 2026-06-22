from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models import ActivityLog
from app.schemas.user import Token, UserCreate, UserOut
from app.services.user_service import create_user, get_user_by_email
from security import create_access_token, verify_password

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

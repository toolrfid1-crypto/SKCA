"""
routers/auth.py -- login / logout / ดูข้อมูลตัวเอง
"""

from fastapi import APIRouter, Depends

from app.config import settings
from app.schemas import ActionResponse, AuthConfig, CurrentUser, LoginRequest, LoginResponse
from app.security import authenticate, create_access_token, get_current_user, require_admin
from app.users import get_user_directory

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/config", response_model=AuthConfig)
def auth_config() -> AuthConfig:
    """
    endpoint สาธารณะ (ไม่ต้องล็อกอิน) -- หน้า login เรียกก่อนวาดฟอร์ม

    ถ้า require_password = false หน้าเว็บจะแสดงแค่ช่องอีเมลช่องเดียว
    """
    return AuthConfig(require_password=settings.REQUIRE_PASSWORD)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    """
    เข้าสู่ระบบด้วย "อีเมล" -> คืน JWT กลับไปให้ frontend เก็บไว้

    ถ้า REQUIRE_PASSWORD=false (ค่าเริ่มต้น) ระบบจะไม่ตรวจ password
    เหมือนกับโค้ด Flask เดิม
    """
    user = authenticate(payload.email, payload.password)
    token = create_access_token(user.username)
    return LoginResponse(access_token=token, user=user)


@router.get("/me", response_model=CurrentUser)
def me(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    frontend เรียกตอนเปิดเว็บ เพื่อเช็คว่า token ที่เก็บไว้ยังใช้ได้ไหม
    ถ้า token หมดอายุจะได้ 401 แล้วเด้งกลับไปหน้า login
    """
    return user


@router.post("/logout", response_model=ActionResponse)
def logout() -> ActionResponse:
    """
    JWT ไม่มี state ฝั่ง server -- การ logout คือให้ frontend ลบ token ทิ้ง
    endpoint นี้มีไว้เพื่อความชัดเจนของ API เท่านั้น
    """
    return ActionResponse(message="ออกจากระบบแล้ว")


@router.post("/refresh-users", response_model=ActionResponse)
def refresh_users(_: CurrentUser = Depends(require_admin)) -> ActionResponse:
    """สั่งอ่าน sheet Mail ใหม่ทันที (ปกติ cache ไว้ 60 วินาที)"""
    count = len(get_user_directory(force_refresh=True))
    return ActionResponse(message=f"โหลด user ใหม่แล้ว {count} คน")

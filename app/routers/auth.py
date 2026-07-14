"""
routers/auth.py -- login / logout / ดูข้อมูลตัวเอง
"""

from fastapi import APIRouter, Depends

from app.employee_api import get_employee_photo
from app.schemas import (
    ActionResponse,
    CurrentUser,
    LoginRequest,
    LoginResponse,
    ProfilePhoto,
)
from app.security import (
    get_current_user,
    get_user_directory,
    login_user,
    require_admin,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    """
    เข้าสู่ระบบด้วย "อีเมล" อย่างเดียว -> คืน JWT กลับไปให้ frontend เก็บไว้

    logic ทั้งหมดอยู่ที่ security.login_user() -- endpoint นี้เป็นแค่ทางผ่าน
    """
    return login_user(payload.email)


@router.get("/me", response_model=CurrentUser)
def me(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    frontend เรียกตอนเปิดเว็บ เพื่อเช็คว่า token ที่เก็บไว้ยังใช้ได้ไหม
    ถ้า token หมดอายุจะได้ 401 แล้วเด้งกลับไปหน้า login
    """
    return user


@router.get("/photo", response_model=ProfilePhoto)
def profile_photo(user: CurrentUser = Depends(get_current_user)) -> ProfilePhoto:
    """
    รูปโปรไฟล์ + ชื่อของผู้ใช้ที่ล็อกอินอยู่ (ดึงจาก HR API ด้วยอีเมล)

    ถ้า HR API หาไม่เจอหรือมีปัญหา จะคืนค่าว่าง ๆ กลับไป
    แล้ว frontend ค่อยไปแสดงตัวอักษรย่อแทน
    """
    info = get_employee_photo(user.username)
    if not info:
        return ProfilePhoto()
    return ProfilePhoto(picture_url=info.get("picture_url"), full_name=info.get("full_name"))


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

"""
security.py -- ระบบ login / token + ทะเบียน user

ไฟล์นี้รวม "ทุกอย่างที่เกี่ยวกับ ตัวตนของผู้ใช้" ไว้ที่เดียว:
  - อ่านทะเบียน user จาก sheet Mail (พร้อม cache)   <- เดิมอยู่ใน users.py
  - login แล้วออก JWT
  - decode JWT กลับมาเป็น CurrentUser พร้อมสิทธิ์

Flask เดิมใช้ session cookie ฝั่ง server
แต่ SPA (React) แยกออกมาคนละ port เลยเหมาะกับ JWT มากกว่า:

  1. user กด login  -> backend คืน access_token (JWT) กลับไป
  2. frontend เก็บ token ไว้ แล้วแนบไปทุก request ใน header
        Authorization: Bearer <token>
  3. backend decode token -> รู้ว่าเป็นใคร -> ไปดึงสิทธิ์จาก Excel

หมายเหตุความปลอดภัย:
  ระบบนี้ล็อกอินด้วย "อีเมล" อย่างเดียว ไม่มีการตรวจรหัสผ่าน
  (ใครรู้อีเมลที่อยู่ใน sheet Mail ก็ล็อกอินเป็นคนนั้นได้)
  การจำกัดสิทธิ์อาศัย Line/CostCenter ที่ผูกกับอีเมลนั้นแทน
"""

import threading
import time
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.excel_store import load_users
from app.schemas import CurrentUser, LoginResponse

# auto_error=False -> เราอยากคุม error message เอง
_bearer_scheme = HTTPBearer(auto_error=False)


# ============================================================================
#  ทะเบียน user (cache)   -- เดิมแยกอยู่ในไฟล์ users.py
#
#  ทำไมต้องมี cache?
#    ทุก request ที่ต้องรู้สิทธิ์ของ user จะต้องเปิดไฟล์ Excel อ่านหนึ่งครั้ง
#    ซึ่งช้ามาก (ไฟล์อยู่บน OneDrive) เราเลย cache ไว้ในหน่วยความจำ 60 วินาที
#
#  ถ้าเพิ่ม user ใหม่ใน Excel แล้วอยากให้มีผลทันที ให้เรียก
#  POST /api/auth/refresh-users
# ============================================================================

_CACHE_TTL_SECONDS = 60

_cache_lock = threading.Lock()
_user_cache: dict[str, dict] | None = None
_user_cache_time: float = 0.0


def get_user_directory(force_refresh: bool = False) -> dict[str, dict]:
    """
    คืน dict ของ user ทั้งหมด -- อ่านจาก cache ถ้ายังไม่หมดอายุ

    key ใน dict เป็นอีเมลตัวพิมพ์เล็กเสมอ (load_users() ทำ .lower() ให้แล้ว)
    ดังนั้นเวลาจะหา user คนเดียวให้เรียก  get_user_directory().get(อีเมล_ตัวเล็ก)
    """
    global _user_cache, _user_cache_time

    with _cache_lock:
        expired = (time.time() - _user_cache_time) > _CACHE_TTL_SECONDS
        if force_refresh or _user_cache is None or expired:
            _user_cache = load_users()
            _user_cache_time = time.time()
        return _user_cache


# ============================================================================
#  Login / JWT
# ============================================================================

def login_user(email: str) -> LoginResponse:
    """
    Login ทั้งกระบวนการรวมไว้ที่เดียว -- อ่านไล่บนลงล่างจบในฟังก์ชันนี้:
      1. normalize อีเมล (เทียบกับคอลัมน์ User ใน sheet Mail แบบ lower-case)
      2. หา user ; ไม่เจอ -> 401
      3. ประกอบ CurrentUser + ออก JWT แล้วคืน LoginResponse ให้ frontend เก็บ

    ล็อกอินด้วยอีเมลอย่างเดียว ไม่มีการตรวจรหัสผ่าน
    ("admin" ไม่ได้อยู่ใน Excel -- ตั้ง is_admin ให้ใน _to_current_user เหมือนโค้ดเดิม)
    """
    username = email.strip().lower()
    user = get_user_directory().get(username)
    print(username, user)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ไม่พบอีเมลนี้ในระบบ",
        )

    # ออก JWT: ข้างในเก็บแค่ชื่อ user (sub) กับเวลาหมดอายุ (exp)
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    access_token = jwt.encode(
        {"sub": username, "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return LoginResponse(
        access_token=access_token,
        user=_to_current_user(username, user),
    )


def _to_current_user(username: str, user: dict) -> CurrentUser:
    return CurrentUser(
        username=username,
        lines=user["lines"],
        costcenters=user["costcenters"],
        is_admin=(username == "admin"),
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> CurrentUser:
    """
    FastAPI dependency -- ใช้แทน @login_required ของ Flask

    วิธีใช้:
        @router.get("/something")
        def handler(user: CurrentUser = Depends(get_current_user)):
            ...
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="กรุณาเข้าสู่ระบบใหม่",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        username: str = payload["sub"]
    except (jwt.PyJWTError, KeyError) as exc:
        raise unauthorized from exc

    # โหลดสิทธิ์ใหม่ทุกครั้งจาก Excel -- ถ้า admin ถอดสิทธิ์ user จะมีผลทันที
    # (username ใน JWT ถูกเก็บเป็นตัวพิมพ์เล็กไว้แล้วตอนออก token)
    user = get_user_directory().get(username)
    if user is None:
        raise unauthorized

    return _to_current_user(username, user)


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """ใช้กับ endpoint ที่ admin เท่านั้นที่เข้าได้"""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="คุณไม่มีสิทธิ์เข้าหน้านี้",
        )
    return user

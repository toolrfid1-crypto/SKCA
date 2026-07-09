"""
security.py -- ระบบ login / token

Flask เดิมใช้ session cookie ฝั่ง server
แต่ SPA (React) แยกออกมาคนละ port เลยเหมาะกับ JWT มากกว่า:

  1. user กด login  -> backend คืน access_token (JWT) กลับไป
  2. frontend เก็บ token ไว้ แล้วแนบไปทุก request ใน header
        Authorization: Bearer <token>
  3. backend decode token -> รู้ว่าเป็นใคร -> ไปดึงสิทธิ์จาก Excel

หมายเหตุความปลอดภัย:
  ค่าเริ่มต้น REQUIRE_PASSWORD=false คือ "พฤติกรรมเดิม" ของ WebAppApprove.py
  ซึ่ง *ไม่ได้ตรวจ password เลย* ใครรู้ชื่อ user ก็ล็อกอินเป็นคนนั้นได้
  เมื่อพร้อมแล้วให้ตั้ง REQUIRE_PASSWORD=true ใน .env เพื่อเปิดการตรวจสอบ
"""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.schemas import CurrentUser
from app.users import find_user

# auto_error=False -> เราอยากคุม error message เอง
_bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(username: str) -> str:
    """สร้าง JWT ที่หมดอายุตาม JWT_EXPIRE_MINUTES"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def authenticate(email: str, password: str) -> CurrentUser:
    """
    ตรวจสอบ user จาก "อีเมล" แล้วคืน CurrentUser
    โยน HTTPException 401 ถ้าไม่ผ่าน

    อีเมลที่รับเข้ามาต้องตรงกับคอลัมน์ User ใน sheet Mail
    (ยกเว้น "admin" ที่ไม่ได้อยู่ใน Excel -- hardcode ไว้เหมือนโค้ดเดิม)
    """
    username = email.strip().lower()
    user = find_user(username)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ไม่พบอีเมลนี้ในระบบ",
        )

    # ตรวจ password เฉพาะเมื่อเปิด flag ไว้เท่านั้น
    if settings.REQUIRE_PASSWORD and user["password"] != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="รหัสผ่านไม่ถูกต้อง",
        )

    return _to_current_user(username, user)


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
    user = find_user(username)
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

"""
users.py -- ทะเบียน user ที่อ่านมาจาก sheet "Mail"

ทำไมต้องมี cache?
  ทุก request ที่ต้องรู้สิทธิ์ของ user จะต้องเปิดไฟล์ Excel อ่านหนึ่งครั้ง
  ซึ่งช้ามาก (ไฟล์อยู่บน OneDrive) เราเลย cache ไว้ในหน่วยความจำ 60 วินาที

ถ้าเพิ่ม user ใหม่ใน Excel แล้วอยากให้มีผลทันที ให้เรียก POST /api/auth/refresh
"""

import threading
import time

from app.excel_store import load_users

_CACHE_TTL_SECONDS = 60

_lock = threading.Lock()
_cache: dict[str, dict] | None = None
_cache_time: float = 0.0


def get_user_directory(force_refresh: bool = False) -> dict[str, dict]:
    """คืน dict ของ user ทั้งหมด -- อ่านจาก cache ถ้ายังไม่หมดอายุ"""
    global _cache, _cache_time

    with _lock:
        expired = (time.time() - _cache_time) > _CACHE_TTL_SECONDS
        if force_refresh or _cache is None or expired:
            _cache = load_users()
            _cache_time = time.time()
        return _cache


def find_user(username: str) -> dict | None:
    """หา user จากชื่อ (ไม่สนตัวพิมพ์ใหญ่เล็ก เหมือนโค้ดเดิมที่ .lower() ก่อนเทียบ)"""
    return get_user_directory().get(username.strip().lower())

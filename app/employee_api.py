"""
employee_api.py -- ดึงรูปโปรไฟล์ + ชื่อพนักงานจาก HR API (empsearch)

ทำไมต้องผ่าน backend แทนที่จะเรียกจาก React ตรง ๆ?
  การขอ token ต้องใช้ USERNAME/PASSWORD ของ API
  ถ้าเรียกจากเบราว์เซอร์ รหัสพวกนี้จะโผล่ให้ทุกคนเห็นใน DevTools
  เลยต้องซ่อนไว้ฝั่ง server แล้วให้ frontend ขอแค่ "รูปของฉัน" ผ่าน token ปกติ

เรื่อง cache (เลียนแบบแนวคิดใน security.py -- ส่วน user cache):
  - token: ขอทีนึงใช้ซ้ำได้ เราไม่รู้เวลาหมดอายุจริงเลยตั้ง TTL เผื่อไว้
  - รูปของแต่ละอีเมล: cache ไว้ กันยิง HR API ซ้ำทุกครั้งที่เปิดหน้า
    (cache ทั้งกรณีสำเร็จและล้มเหลว -- ถ้าล้มเหลวก็ไม่รีบยิงซ้ำให้ช้า)

หมายเหตุ: ใช้ urllib จาก stdlib เพื่อไม่ต้องเพิ่ม dependency (requests/httpx)
เข้ามาใน backend เพราะ endpoint ของ FastAPI รันแบบ sync ใน threadpool อยู่แล้ว
"""

import json
import logging
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from app.config import settings

logger = logging.getLogger(__name__)

# token ขอมาแล้วใช้ซ้ำได้ 30 นาที (กันการขอใหม่ทุก request)
_TOKEN_TTL_SECONDS = 30 * 60
# ผลรูปของแต่ละอีเมลเก็บไว้ 30 นาที
# สำคัญ: picture_url เป็น Azure SAS URL ที่หมดอายุใน ~1 ชั่วโมงนับจากตอนขอ
# ถ้า cache นานเท่าอายุ SAS พอดี จะมีจังหวะที่เสิร์ฟ URL ที่หมดอายุแล้วออกไป
# เลยตั้งให้สั้นกว่าครึ่งหนึ่ง เพื่อให้ URL ที่ส่งให้ frontend ยังเหลืออายุเสมอ
_PHOTO_TTL_SECONDS = 30 * 60

_lock = threading.Lock()
_token: str | None = None
_token_time: float = 0.0

# email -> (เวลาที่ cache, ผลลัพธ์)  โดยผลลัพธ์อาจเป็น None ได้ (แปลว่าหาไม่เจอ)
_photo_cache: dict[str, tuple[float, dict | None]] = {}


def _request_token() -> str:
    """
    ขอ token จาก HR API -- ลอง 3 แบบเหมือนสคริปต์เดิม
    เพราะเราไม่รู้แน่ว่า endpoint รับ body รูปแบบไหน
    """
    username = settings.EMP_API_USERNAME
    password = settings.EMP_API_PASSWORD

    attempts = [
        # (Content-Type, body ที่ encode แล้ว)
        (
            "application/json",
            json.dumps({"UserName": username, "Password": password}).encode("utf-8"),
        ),
        (
            "application/x-www-form-urlencoded",
            urllib.parse.urlencode({"UserName": username, "Password": password}).encode("utf-8"),
        ),
        (
            "application/x-www-form-urlencoded",
            urllib.parse.urlencode(
                {"grant_type": "password", "username": username, "password": password}
            ).encode("utf-8"),
        ),
    ]

    for content_type, body in attempts:
        try:
            req = urllib.request.Request(
                settings.EMP_TOKEN_URL,
                data=body,
                headers={"Content-Type": content_type},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            # API ส่ง key ชื่อไม่แน่นอน -- ไล่หาให้ครบทุกแบบ
            token = (
                data.get("accessToken")
                or data.get("AccessToken")
                or data.get("access_token")
                or data.get("token")
                or data.get("Token")
            )
            if token:
                return token

            logger.warning("ขอ token HR API: status 200 แต่ไม่พบ key ของ token (%s)", content_type)
        except Exception as exc:  # noqa: BLE001 -- ลองแบบถัดไป
            logger.warning("ขอ token HR API ไม่สำเร็จ (%s): %s", content_type, exc)

    raise RuntimeError("ขอ token จาก HR API ไม่ได้ทั้ง 3 แบบ")


def _get_token(force_refresh: bool = False) -> str:
    """คืน token จาก cache ถ้ายังไม่หมดอายุ ไม่งั้นขอใหม่"""
    global _token, _token_time

    with _lock:
        fresh = _token and (time.time() - _token_time) < _TOKEN_TTL_SECONDS
        if not force_refresh and fresh:
            return _token

    # ขอ token นอก lock -- ไม่บล็อก request อื่นระหว่างรอเน็ตเวิร์ก
    new_token = _request_token()

    with _lock:
        _token = new_token
        _token_time = time.time()
    return new_token


def _search_employee(token: str, keyword: str) -> list:
    """ยิง empsearch ด้วย keyword (อีเมล) -- คืน list ของผลลัพธ์"""
    body = json.dumps({"Keyword": keyword}).encode("utf-8")
    req = urllib.request.Request(
        settings.EMP_SEARCH_URL,
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data if isinstance(data, list) else []


def _fetch_photo(email: str) -> dict | None:
    """
    ขั้นตอนจริงในการหา รูป+ชื่อ ของอีเมลหนึ่ง (ยังไม่ผ่าน cache)

    ถ้า token หมดอายุ (401) จะขอ token ใหม่แล้วลองอีกครั้งหนึ่ง
    """
    token = _get_token()
    try:
        results = _search_employee(token, email)
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            # token หมดอายุ -- ขอใหม่แล้วลองซ้ำ
            token = _get_token(force_refresh=True)
            results = _search_employee(token, email)
        else:
            raise

    if not results:
        return None

    first = results[0]
    return {
        "picture_url": first.get("picture_url"),
        "full_name": first.get("fullNameEN"),
    }


def get_employee_photo(email: str) -> dict | None:
    """
    คืน {"picture_url": ..., "full_name": ...} ของอีเมล (จาก cache ถ้ามี)
    คืน None ถ้าหาไม่เจอหรือ HR API มีปัญหา -- ให้ frontend ไปแสดงตัวอักษรแทน
    """
    key = email.strip().lower()

    with _lock:
        cached = _photo_cache.get(key)
        if cached and (time.time() - cached[0]) < _PHOTO_TTL_SECONDS:
            return cached[1]

    try:
        result = _fetch_photo(key)
    except Exception as exc:  # noqa: BLE001 -- HR API ล่มไม่ควรทำให้เว็บพัง
        logger.warning("ดึงรูปพนักงานของ %s ไม่สำเร็จ: %s", key, exc)
        result = None

    with _lock:
        _photo_cache[key] = (time.time(), result)
    return result

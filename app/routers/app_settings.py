"""
routers/app_settings.py -- หน้า Settings

ข้อควรรู้:
  ค่า setting พวกนี้ (เปิด/ปิดการแจ้งเตือน) เดิมเป็น global variable ใน Flask
  ตอนนี้ยังเก็บไว้ในหน่วยความจำเหมือนเดิม -- รีสตาร์ต server แล้วค่ากลับเป็นค่าเริ่มต้น

  ในเฟสนี้ยังไม่มี background job มาอ่านค่าเหล่านี้ (เราตัดออกไปก่อน)
  ถ้าจะย้าย job มาอยู่ใน FastAPI ค่อยเก็บ setting ลง SQL หรือไฟล์ json
"""

from fastapi import APIRouter, Depends

from app.config import settings as app_config
from app.schemas import AppSettings, CurrentUser
from app.security import get_current_user, require_admin

router = APIRouter(prefix="/api/settings", tags=["settings"])

# state ในหน่วยความจำ (เทียบเท่า global NotifyNGCase_Status ฯลฯ ของเดิม)
_current = AppSettings()


@router.get("", response_model=AppSettings)
def get_settings(_: CurrentUser = Depends(get_current_user)) -> AppSettings:
    return _current


@router.put("", response_model=AppSettings)
def update_settings(
    payload: AppSettings,
    _: CurrentUser = Depends(require_admin),
) -> AppSettings:
    global _current
    _current = payload
    return _current


@router.get("/links")
def get_links(_: CurrentUser = Depends(get_current_user)) -> dict:
    """ลิงก์ภายนอกที่หน้าเว็บต้องใช้ -- อ่านมาจาก .env จะได้ไม่ต้อง hardcode ใน React"""
    return {"dashboard": app_config.LINK_DASHBOARD}

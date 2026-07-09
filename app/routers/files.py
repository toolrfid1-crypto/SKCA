"""
routers/files.py -- เปิดไฟล์ PDF

โค้ดเดิม (route /pdf/<path:filename>) ยอมเปิด "ไฟล์อะไรก็ได้" ที่ path ชี้ไป
ซึ่งอันตรายมาก -- ใครก็ขอ  /pdf/C:/Windows/System32/config/SAM  ได้

ตรงนี้เราบังคับว่า path ต้องอยู่ใต้ folder ที่ระบุไว้ใน PDF_ALLOWED_ROOTS
"""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.config import settings
from app.schemas import CurrentUser
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["files"])


def _is_inside_allowed_root(target: Path) -> bool:
    """เช็คว่า target อยู่ใต้ folder ที่อนุญาตหรือไม่"""
    roots = settings.pdf_allowed_roots
    if not roots:
        # ไม่ได้ตั้งค่าไว้ = ไม่อนุญาตอะไรเลย (ปลอดภัยไว้ก่อน)
        return False

    for root in roots:
        try:
            target.relative_to(root)  # โยน ValueError ถ้าไม่ได้อยู่ข้างใน
            return True
        except ValueError:
            continue
    return False


@router.get("/pdf")
def serve_pdf(
    path: str = Query(..., description="path เต็มของไฟล์ PDF"),
    _: CurrentUser = Depends(get_current_user),
) -> FileResponse:
    real_path = Path(path.strip()).resolve()

    if real_path.suffix.lower() != ".pdf":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="ไฟล์นี้ไม่ใช่ PDF")

    if not _is_inside_allowed_root(real_path):
        logger.warning("ปฏิเสธการเปิดไฟล์นอก folder ที่อนุญาต: %s", real_path)
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="ไม่อนุญาตให้เปิดไฟล์นี้")

    if not real_path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"ไม่พบไฟล์: {real_path}")

    # inline = ให้เบราว์เซอร์เปิดดูในแท็บ แทนที่จะดาวน์โหลด
    return FileResponse(
        real_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{real_path.name}"'},
    )

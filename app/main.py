"""
main.py -- จุดเริ่มต้นของ Backend

รันด้วย:
    cd backend
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

เปิดดูเอกสาร API อัตโนมัติได้ที่:
    http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import check_connection
from app.routers import app_settings, auth, documents, edit_sheets, files

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """โค้ดที่รันตอน server เริ่ม และตอนปิด"""
    logger.info("=" * 60)
    logger.info(" LTR Document Approve System -- FastAPI")
    logger.info("=" * 60)

    if check_connection():
        logger.info("SQL Server: เชื่อมต่อสำเร็จ (%s)", settings.SQL_SERVER)
    else:
        logger.warning("SQL Server: เชื่อมต่อไม่ได้ -- endpoint ที่ใช้ SQL จะ error")

    if not settings.REQUIRE_PASSWORD:
        logger.warning("REQUIRE_PASSWORD=false -> ระบบไม่ตรวจสอบรหัสผ่านตอน login")

    yield
    logger.info("ปิด server")


app = FastAPI(
    title="LTR Document Approve System",
    description="ระบบอนุมัติเอกสาร Patrol / Verify Torque",
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------- CORS
# React (port 5173) กับ FastAPI (port 8000) อยู่คนละ origin
# เบราว์เซอร์จะบล็อก request ถ้าไม่ประกาศตรงนี้
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------- Routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(edit_sheets.router)
app.include_router(files.router)
app.include_router(app_settings.router)


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "database": "up" if check_connection() else "down"}


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError) -> JSONResponse:
    """
    safe_column() และฟังก์ชันอื่นโยน ValueError เมื่อ input ไม่ถูกต้อง
    แปลงเป็น HTTP 400 แทนที่จะปล่อยเป็น 500
    """
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    """
    กัน stack trace หลุดไปหา user (ตามคู่มือหัวข้อ HTTP Status Code)
    รายละเอียดจริงเก็บไว้ใน log ของ server
    """
    logger.exception("เกิดข้อผิดพลาดที่ไม่ได้ดักไว้: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "เกิดข้อผิดพลาดภายในระบบ กรุณาติดต่อผู้ดูแล"},
    )

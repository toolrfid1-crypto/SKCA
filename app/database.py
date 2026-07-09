"""
database.py -- ทุกอย่างที่คุยกับ SQL Server อยู่ในไฟล์นี้

ของเดิมใน WebAppApprove.py จะเรียก pyodbc.connect(conn_str) กระจายอยู่ทุกที่
ตรงนี้เรารวบมาไว้ที่เดียว เพื่อให้:
  1. เปลี่ยน connection string ที่เดียวจบ
  2. ใช้ engine ตัวเดียวร่วมกัน (SQLAlchemy จะทำ connection pool ให้)
  3. เขียน query แบบ parameterized เสมอ -> กัน SQL injection
"""

import logging
from typing import Any, Sequence

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.config import settings

logger = logging.getLogger(__name__)

# สร้าง engine แค่ตัวเดียวตอน import module (SQLAlchemy จัดการ pool ให้เอง)
# pool_pre_ping=True -> เช็คว่า connection ยังไม่ตายก่อนเอาไปใช้
engine: Engine = create_engine(
    settings.sqlalchemy_url,
    pool_pre_ping=True,
    pool_recycle=1800,  # รีไซเคิล connection ทุก 30 นาที
)


def fetch_dataframe(query: str, params: dict[str, Any] | None = None) -> pd.DataFrame:
    """
    รัน SELECT แล้วคืนค่าเป็น pandas DataFrame

    ใช้แทน  pd.read_sql(Query, engine)  ของเดิม
    ต่างกันตรงที่ตัวนี้รองรับ named parameter (:name) เพื่อความปลอดภัย
    """
    with engine.connect() as conn:
        return pd.read_sql(text(query), conn, params=params or {})


def execute(query: str, params: dict[str, Any] | None = None) -> int:
    """
    รัน UPDATE / INSERT / DELETE แล้ว commit
    คืนค่าเป็นจำนวนแถวที่ถูกแก้ (rowcount)
    """
    with engine.begin() as conn:  # engine.begin() = auto commit ตอนจบ block
        result = conn.execute(text(query), params or {})
        return result.rowcount


def safe_column(column: str, allowed: Sequence[str]) -> str:
    """
    ตรวจสอบชื่อคอลัมน์ก่อนเอาไปต่อเป็นสตริง SQL

    ทำไมต้องมีฟังก์ชันนี้?
      SQL ไม่ยอมให้เอาชื่อ "คอลัมน์" มาเป็น parameter ได้ (ได้แค่ "ค่า")
      เช่น  UPDATE t SET :col = ?   <-- ใช้ไม่ได้
      เราเลยต้องเอาชื่อคอลัมน์ไปต่อสตริงตรง ๆ ซึ่งเสี่ยง SQL injection

    วิธีแก้: เทียบกับ whitelist ก่อน ถ้าไม่อยู่ในลิสต์ = โยน error ทิ้ง
    """
    if column not in allowed:
        raise ValueError(f"ไม่อนุญาตให้แก้ไขคอลัมน์: {column!r}")
    return column


def check_connection() -> bool:
    """เอาไว้เช็คตอน start ว่าต่อ SQL ติดไหม"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("เชื่อมต่อ SQL Server ไม่ได้: %s", exc)
        return False

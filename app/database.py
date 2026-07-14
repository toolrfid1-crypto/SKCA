"""
database.py -- ทุกอย่างที่เกี่ยวกับ SQL Server อยู่ในไฟล์นี้

มี 3 ส่วน อ่านไล่จากบนลงล่างได้เลย:
  1. connection + ฟังก์ชันรัน query (fetch_dataframe / execute)
  2. safe_column -- กัน SQL injection ตอนต้องเอาชื่อคอลัมน์ไปต่อสตริง
  3. ตัว SQL ทั้งหมด + ตาราง map "ตำแหน่ง -> ชื่อคอลัมน์"   (เดิมอยู่ไฟล์ queries.py)

ของเดิมใน WebAppApprove.py จะเรียก pyodbc.connect(conn_str) กระจายอยู่ทุกที่
และเขียน SQL ปนกับ logic ตรงนี้เรารวบมาไว้ที่เดียว เพื่อให้:
  1. เปลี่ยน connection string / แก้ SQL ที่เดียวจบ
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


# ============================================================================
#  1) รัน query
# ============================================================================

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


def check_connection() -> bool:
    """เอาไว้เช็คตอน start ว่าต่อ SQL ติดไหม"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("เชื่อมต่อ SQL Server ไม่ได้: %s", exc)
        return False


# ============================================================================
#  2) กัน SQL injection ตอนต้องต่อชื่อคอลัมน์
# ============================================================================

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


# ============================================================================
#  3) ตัว SQL ทั้งหมด   (เดิมอยู่ไฟล์ queries.py -- ยุบมารวมให้เรื่อง SQL จบไฟล์เดียว)
#
#  router จะไม่เขียน SQL เอง แต่หยิบค่าคงที่พวกนี้ไปใช้ เช่น
#      database.fetch_dataframe(database.PATROL_PENDING)
# ============================================================================

# ---------------------------------------------------------------- Patrol Document
# เอกสารที่ยังอนุมัติไม่ครบ: Asst-FinalB ยังว่าง  หรือ  เป็น NG ที่ Manager ยังไม่เซ็น
PATROL_PENDING = """
    SELECT [Folder Name], [Path], [Time], [Status], [Date], [Line], [Model], [CostCenter],
           [CheckMan], [FM], [LD FI], [FM FI], [Asst-FinalB], [Manager]
    FROM [dbo].[Patrol_LTR_RawData]
    WHERE [Asst-FinalB] IS NULL OR [Status] = 'NG' AND [Manager] IS NULL
    ORDER BY [Date]
"""

# {column} จะถูกแทนด้วยชื่อคอลัมน์ที่ผ่าน safe_column() แล้วเท่านั้น
PATROL_APPROVE = """
    UPDATE [dbo].[Patrol_LTR_RawData]
    SET [{column}] = :value
    WHERE [Folder Name] = :document
"""

# ---------------------------------------------------------------- Verify Torque
# แกะ Month / Year / Period ออกจากชื่อไฟล์ด้วย SUBSTRING
VERIFY_TORQUE_PENDING = """
    SELECT
        [FileName],
        [FilePath],
        [Datetime],
        LEFT([FileName], 2) AS Month,
        SUBSTRING([FileName], 3, 4) AS Year,
        SUBSTRING(
            [FileName],
            CHARINDEX('_', [FileName]) + 1,
            CHARINDEX('_', [FileName], CHARINDEX('_', [FileName]) + 1)
                - CHARINDEX('_', [FileName]) - 1
        ) AS Period,
        [TotalTool], [Checking], [Unchecking], [NG],
        [FM], [Asst], [CostCenter], [Line]
    FROM [dbo].[LTR_Verify_Torque_Approve]
    WHERE [Asst] IS NULL
    ORDER BY [Datetime]
"""

VERIFY_TORQUE_APPROVE = """
    UPDATE [dbo].[LTR_Verify_Torque_Approve]
    SET [{column}] = :value
    WHERE [FileName] = :document
"""

# ---------------------------------------------------------------- Edit Verify Torque
EDIT_VERIFY_TORQUE_PENDING = """
    SELECT [CostCenter], [Line], [DetailChange], [Editor],
           FORMAT([Datetime], 'dd/MM/yyyy HH:mm') AS [Datetime],
           [FM], [Asst], [REGISTER_NUMBER], [PROCESS], [Reason]
    FROM [dbo].[LTR_Verify_Torque_ApproveEditTool]
    WHERE [Asst] IS NULL
      AND ([FM] IS NULL OR [FM] <> 'reject')
"""

EDIT_VERIFY_TORQUE_ACTION = """
    UPDATE [dbo].[LTR_Verify_Torque_ApproveEditTool]
    SET [{column}] = :value
    WHERE [REGISTER_NUMBER] = :tool_id
"""

# ============================================================================
#  การแปลง "ตำแหน่ง" ที่ user กด -> "ชื่อคอลัมน์" ใน SQL
# ============================================================================

# หลาย ๆ ตำแหน่งเขียนลงคอลัมน์เดียวกัน เช่น Manager-Final และ Manager-Mission
# ต่างก็เขียนลงคอลัมน์ [Manager]
PATROL_COLUMN_MAP = {
    "FM": "FM",
    "LD FI": "LD FI",
    "FM FI": "FM FI",
    "Asst-FinalB": "Asst-FinalB",
    "Manager-Final": "Manager",
    "Manager-Mission": "Manager",
}
PATROL_ALLOWED_COLUMNS = ("FM", "LD FI", "FM FI", "Asst-FinalB", "Manager")

TORQUE_COLUMN_MAP = {
    "FM": "FM",
    "Asst-FinalA": "Asst",
    "Asst-FinalB": "Asst",
    "Asst-MissionA": "Asst",
    "Asst-MissionB": "Asst",
}
TORQUE_ALLOWED_COLUMNS = ("FM", "Asst")


def resolve_column(position: str, column_map: dict[str, str]) -> str:
    """
    แปลงตำแหน่งเป็นชื่อคอลัมน์ ถ้าไม่เจอในตาราง map ให้ถือว่าเป็น 'FM'

    ทำไมต้อง default เป็น FM?
      เพราะ FM ของแต่ละไลน์จะส่งชื่อ Line ของตัวเองมา (เช่น 'CH', 'MSC')
      ซึ่งไม่ได้อยู่ใน column_map -- ตรงกับพฤติกรรมของโค้ดเดิม
    """
    return column_map.get(position.strip(), "FM")

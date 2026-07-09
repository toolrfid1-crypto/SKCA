"""
queries.py -- รวม SQL ทุกตัวไว้ที่เดียว

แยกออกมาจาก router เพื่อให้ router อ่านง่าย (router = จัดการ HTTP เท่านั้น)
และเวลาจะแก้ SQL ก็มาแก้ที่ไฟล์นี้ไฟล์เดียว
"""

# ---------------------------------------------------------------- Patrol Document
# เอกสารที่ยังอนุมัติไม่ครบ: Asst-FinalB ยังว่าง  หรือ  เป็น NG ที่ Manager ยังไม่เซ็น
PATROL_PENDING = """
    SELECT [Folder Name], [Path], [Time], [Status], [Date], [Line], [Model],
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

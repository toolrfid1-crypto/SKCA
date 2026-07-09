"""
permissions.py -- หัวใจของระบบ: "เอกสารใบนี้ user คนนี้กด approve ได้ไหม?"

ยกมาจาก class Function_LoadDataByUser (build_docs / build_edit_docs /
build_verify_docs / build_editverify_docs) ของ WebAppApprove.py

ลำดับการอนุมัติ (Approval Chain):

  Patrol Document        FM -> LD FI -> FM FI -> Asst-FinalB -> Manager (เฉพาะ NG)
  Edit Check Sheet       LD FI -> FM FI -> Asst-FinalB
  Verify Torque          FM -> Asst-{Zone}
  Edit Verify Torque     FM -> Asst-{Zone}

หลักการ: เอกสารจะ "โผล่" ให้ user เห็นก็ต่อเมื่อ
  1. คนก่อนหน้าในลำดับ approve ไปแล้ว  และ
  2. ตัว user เองยังไม่ได้ approve  และ
  3. user มีสิทธิ์ในตำแหน่งนั้น (ดูจาก Line / CostCenter / Zone)

ฟังก์ชันในไฟล์นี้เป็น "pure function" ทั้งหมด -- รับ data เข้า คืน list ออก
ไม่แตะ database ไม่แตะ session ทำให้อ่านและแก้ไขได้ง่าย
"""

from typing import Any

import pandas as pd

# ค่าที่ถือว่า "ยังไม่ได้ approve" (ช่องว่างใน SQL / Excel)
_EMPTY_VALUES = {"", "none", "nan", "nat", "null"}


def is_empty(value: Any) -> bool:
    """
    เช็คว่าช่องนี้ว่างอยู่ไหม (= ยังไม่มีใคร approve)

    ต้องเช็คหลายแบบเพราะค่าที่ได้มาอาจเป็น
      - None            (จาก SQL NULL)
      - float('nan')    (pandas แปลง NULL ให้)
      - "nan"           (โดนแปลงเป็น string ไปแล้ว)
      - ""              (ช่องว่างใน Excel)
    """
    if value is None:
        return True
    if isinstance(value, float) and pd.isna(value):
        return True
    return str(value).strip().lower() in _EMPTY_VALUES


def _norm(value: Any) -> str:
    """แปลงค่าเป็น string ตัวเล็ก ตัดช่องว่าง -- ใช้เทียบกับคำว่า 'approve'"""
    return str(value).strip().lower()


def _is_approved(value: Any) -> bool:
    return _norm(value) == "approve"


# ============================================================================
#  1) Patrol Document  (ข้อมูลมาจาก SQL: Patrol_LTR_RawData)
# ============================================================================

def build_patrol_docs(
    df: pd.DataFrame,
    is_admin: bool,
    allowed_lines: list[str],
    zone_line_map: dict[str, str],
) -> list[dict]:
    docs: list[dict] = []
    is_ldfi_user = "LD FI" in allowed_lines

    for idx, row in df.iterrows():
        row_line = str(row.get("Line", "")).strip()
        zone = zone_line_map.get(row_line, "")
        status = str(row.get("Status", "")).strip()

        fm = row.get("FM")
        ldfi = row.get("LD FI")
        fmfi = row.get("FM FI")
        asst = row.get("Asst-FinalB")
        manager = row.get("Manager")

        # can = ตำแหน่งที่ user คนนี้จะกด approve ได้ (None = กดไม่ได้ / ไม่เห็น)
        can: str | None = None

        # -------- admin เห็นทุกใบ และกดแทนได้ทุกตำแหน่งตามลำดับ --------
        if is_admin:
            if not _is_approved(fm):
                can = "FM"
            elif _is_approved(fm) and is_empty(ldfi):
                can = "LD FI"
            elif _is_approved(ldfi) and is_empty(fmfi):
                can = "FM FI"
            elif _is_approved(fmfi) and is_empty(asst):
                can = "Asst-FinalB"
            elif _is_approved(asst) and is_empty(manager):
                if "Final" in zone:
                    can = "Manager-Final"
                elif "Mission" in zone:
                    can = "Manager-Mission"

        # -------- user ทั่วไป: เช็คทีละตำแหน่ง --------
        if is_ldfi_user and _is_approved(fm) and is_empty(ldfi):
            can = "LD FI"

        if "FM FI" in allowed_lines and _is_approved(ldfi) and is_empty(fmfi):
            can = "FM FI"

        if "Asst-FinalB" in allowed_lines and _is_approved(fmfi) and is_empty(asst):
            can = "Asst-FinalB"

        # FM คือหัวหน้าไลน์ -- ดูจาก Line ของตัวเองตรง ๆ
        if (not is_admin) and row_line in allowed_lines and not _is_approved(fm):
            can = row_line

        # Manager จะเข้ามาก็ต่อเมื่อเอกสารเป็น NG เท่านั้น
        if (
            status == "NG"
            and any("Manager" in x for x in allowed_lines)
            and _is_approved(asst)
            and is_empty(manager)
        ):
            if "Mission" in zone and any("Mission" in x for x in allowed_lines):
                can = "Manager-Mission"
            if "Final" in zone and any("Final" in x for x in allowed_lines):
                can = "Manager-Final"

        if can:
            docs.append(
                {
                    "id": int(idx),
                    "title": str(row.get("Folder Name", "")),
                    "pdf_path": str(row.get("Path", "")),
                    "line": row_line,
                    "zone": zone,
                    "status": status,
                    "can_approve_column": can,
                }
            )

    return docs


# ============================================================================
#  2) Edit Check Sheet  (ข้อมูลมาจาก Excel: sheet EditCheckSheet)
# ============================================================================

#: ลำดับการอนุมัติของ Edit Check Sheet -> (ตำแหน่ง, ชื่อคอลัมน์ใน Excel)
EDIT_SHEET_STAGES = (
    ("LD FI", "LD FI"),
    ("FM FI", "FM FI"),
    ("Asst-FinalB", "Asst. FI"),
)


def _next_pending_stage(row: pd.Series) -> str | None:
    """
    หาว่าแถวนี้ค้างอยู่ที่ขั้นไหน (ขั้นแรกที่ยังไม่ถูก approve)
    ใช้กับ admin ที่กด approve แทนได้ทุกตำแหน่ง
    """
    for position, column in EDIT_SHEET_STAGES:
        if is_empty(row.get(column)):
            return position
    return None  # อนุมัติครบแล้ว


def build_edit_check_sheet_docs(
    df: pd.DataFrame,
    is_admin: bool,
    allowed_lines: list[str],
) -> list[dict]:
    docs: list[dict] = []

    for _, row in df.iterrows():
        can: str | None = None

        if is_admin:
            # โค้ดเดิมใส่คำว่า "Admin" ตรงนี้ แต่ endpoint ปลายทางรับแค่
            # LD FI / FM FI / Asst-FinalB ทำให้ admin กด approve ไม่ได้เลย
            # เราจึงแปลงเป็น "ขั้นที่ค้างอยู่จริง" แทน
            can = _next_pending_stage(row)
        elif "LD FI" in allowed_lines and is_empty(row.get("LD FI")):
            can = "LD FI"
        elif (
            "FM FI" in allowed_lines
            and row.get("LD FI") == "Approve"
            and is_empty(row.get("FM FI"))
        ):
            can = "FM FI"
        elif (
            "Asst-FinalB" in allowed_lines
            and row.get("FM FI") == "Approve"
            and is_empty(row.get("Asst. FI"))
        ):
            can = "Asst-FinalB"

        if can:
            # sheet EditCheckSheet มีแค่คอลัมน์ A:I และไม่มีคอลัมน์ Status
            # (โค้ดเดิมอ่าน row.get("Status") ซึ่งได้ค่าว่างเสมอ)
            docs.append(
                {
                    "no": _safe_int(row.get("No.")),
                    "file_name": str(row.get("File Name", "")).strip(),
                    "before_path": str(row.get("Before Edit Path", "")).strip(),
                    "after_path": str(row.get("After Edit Path", "")).strip(),
                    "line": str(row.get("Line", "")).strip(),
                    "model": str(row.get("Model", "")).strip(),
                    "can_approve_column": can,
                }
            )

    return docs


# ============================================================================
#  3) Verify Torque  +  4) Edit Verify Torque
#     สองตัวนี้ใช้ตรรกะสิทธิ์ชุดเดียวกัน เลยแยกออกมาเป็นฟังก์ชันกลาง
# ============================================================================

def _resolve_asst_by_zone(zone: str) -> str | None:
    """
    Zone บอกว่าเป็น Asst ตำแหน่งไหน
    ต้องเช็ค FinalB ก่อน FinalA เพราะ...  ที่จริงชื่อไม่ซ้อนกัน เช็คลำดับไหนก็ได้
    """
    for suffix in ("FinalA", "FinalB", "MissionA", "MissionB"):
        if suffix in zone:
            return f"Asst-{suffix}"
    return None


def _can_approve_torque(
    is_admin: bool,
    zone: str,
    row_costcenter: str,
    allowed_costcenters: list[str],
    allowed_positions: list[str],
    fm: Any,
    asst: Any,
) -> str | None:
    """ตรรกะร่วมของ Verify Torque และ Edit Verify Torque"""
    if is_admin:
        if not _is_approved(fm):
            return "FM"
        if _is_approved(fm) and is_empty(asst):
            return _resolve_asst_by_zone(zone)
        return None

    # FM ของ cost center นั้น ๆ
    if row_costcenter in allowed_costcenters and not _is_approved(fm):
        return "FM"

    # Asst -- ต้องรอ FM approve ก่อน และตำแหน่งต้องตรงกับ Zone
    if _is_approved(fm) and not _is_approved(asst):
        position = _resolve_asst_by_zone(zone)
        if position and any(position in x for x in allowed_positions):
            return position

    return None


def build_verify_torque_docs(
    df: pd.DataFrame,
    is_admin: bool,
    allowed_costcenters: list[str],
    allowed_positions: list[str],
    zone_costcenter_map: dict[str, str],
) -> list[dict]:
    docs: list[dict] = []

    for _, row in df.iterrows():
        row_costcenter = str(row.get("CostCenter", "")).strip()
        zone = zone_costcenter_map.get(row_costcenter, "")

        can = _can_approve_torque(
            is_admin=is_admin,
            zone=zone,
            row_costcenter=row_costcenter,
            allowed_costcenters=allowed_costcenters,
            allowed_positions=allowed_positions,
            fm=row.get("FM"),
            asst=row.get("Asst"),
        )
        if not can:
            continue

        total_tool = _safe_int(row.get("TotalTool"))
        checking = _safe_int(row.get("Checking"))
        # เช็คครบทุกตัวไหม
        complete = "Complete" if (total_tool > 0 and checking >= total_tool) else "Not Complete"

        docs.append(
            {
                "file_name": str(row.get("FileName", "")).strip(),
                "file_path": str(row.get("FilePath", "")).strip(),
                "month": str(row.get("Month", "")).strip(),
                "year": str(row.get("Year", "")).strip(),
                "period": str(row.get("Period", "")).strip(),
                "total_tool": total_tool,
                "checking": checking,
                "unchecking": _safe_int(row.get("Unchecking")),
                "ng": _safe_int(row.get("NG")),
                "cost_center": row_costcenter,
                "line": str(row.get("Line", "")).strip(),
                "status_checking": complete,
                "can_approve_column": can,
            }
        )

    return docs


def build_edit_verify_torque_docs(
    df: pd.DataFrame,
    is_admin: bool,
    allowed_costcenters: list[str],
    allowed_positions: list[str],
    zone_costcenter_map: dict[str, str],
) -> list[dict]:
    docs: list[dict] = []

    for _, row in df.iterrows():
        row_costcenter = str(row.get("CostCenter", "")).strip()
        zone = zone_costcenter_map.get(row_costcenter, "")

        can = _can_approve_torque(
            is_admin=is_admin,
            zone=zone,
            row_costcenter=row_costcenter,
            allowed_costcenters=allowed_costcenters,
            allowed_positions=allowed_positions,
            fm=row.get("FM"),
            asst=row.get("Asst"),
        )
        if not can:
            continue

        docs.append(
            {
                "line": str(row.get("Line", "")).strip(),
                "cost_center": row_costcenter,
                "detail_change": str(row.get("DetailChange", "")).strip(),
                "editor": str(row.get("Editor", "")).strip(),
                "datetime": str(row.get("Datetime", "")).strip(),
                "register_number": str(row.get("REGISTER_NUMBER", "")).strip(),
                "process": str(row.get("PROCESS", "")).strip(),
                "reason": str(row.get("Reason", "")).strip(),
                "can_approve_column": can,
            }
        )

    return docs


# ============================================================================
#  helper
# ============================================================================

def _safe_int(value: Any, default: int = 0) -> int:
    """แปลงเป็น int แบบไม่พัง ถ้าแปลงไม่ได้คืน default"""
    try:
        if is_empty(value):
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default

"""
routers/edit_sheets.py -- ตาราง Edit Check Sheet (Excel) และ Edit Verify Torque (SQL)

สังเกตว่าสองตารางนี้เก็บคนละที่:
  - Edit Check Sheet   -> sheet "EditCheckSheet" ในไฟล์ DataWebapp.xlsx
  - Edit Verify Torque -> ตาราง LTR_Verify_Torque_ApproveEditTool ใน SQL Server
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app import excel_store, permissions, queries
from app.database import execute, fetch_dataframe, safe_column
from app.excel_store import ExcelBusyError
from app.schemas import (
    ActionResponse,
    CurrentUser,
    EditCheckSheetDoc,
    EditSheetActionRequest,
    EditVerifyTorqueActionRequest,
    EditVerifyTorqueDoc,
)
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/edit-sheets", tags=["edit-sheets"])

VALID_ACTIONS = ("approve", "reject")


# ============================================================================
#  Edit Check Sheet  (Excel)
# ============================================================================

def _load_edit_check_sheet_docs(user: CurrentUser) -> list[dict]:
    df = excel_store.read_edit_check_sheet()
    return permissions.build_edit_check_sheet_docs(
        df,
        is_admin=user.is_admin,
        allowed_lines=user.lines,
    )


@router.get("/patrol", response_model=list[EditCheckSheetDoc])
def list_edit_check_sheet(user: CurrentUser = Depends(get_current_user)):
    if not user.can_see_edit_table:
        return []
    return _load_edit_check_sheet_docs(user)


@router.post("/patrol/{no}/action", response_model=ActionResponse)
def edit_check_sheet_action(
    no: int,
    payload: EditSheetActionRequest,
    user: CurrentUser = Depends(get_current_user),
) -> ActionResponse:
    """กด Approve / Reject ในตาราง Edit Patrol Check Sheet -> เขียนลง Excel"""
    if payload.action not in VALID_ACTIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Action ไม่ถูกต้อง")

    if payload.column not in excel_store.EDIT_SHEET_COLUMN_LETTERS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Column ไม่ถูกต้อง")

    # ตรวจสิทธิ์ฝั่ง server -- ห้ามเชื่อ column ที่ frontend ส่งมา
    allowed = any(
        doc["no"] == no and doc["can_approve_column"] == payload.column
        for doc in _load_edit_check_sheet_docs(user)
    )
    if not allowed:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail=f"คุณไม่มีสิทธิ์ดำเนินการรายการที่ {no} ในตำแหน่ง '{payload.column}'",
        )

    row_index = excel_store.find_row_index_by_no(no)
    if row_index is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="ไม่พบรายการ")

    try:
        result = excel_store.update_edit_check_sheet(row_index, payload.action, payload.column)
    except ExcelBusyError as exc:
        # 409 Conflict -- ไฟล์ถูกล็อกอยู่ ให้ผู้ใช้ลองใหม่
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    logger.info("[EDIT_SHEET] no=%s | user=%s | %s", no, user.username, result)
    return ActionResponse(message=f"{result} เรียบร้อย")


# ============================================================================
#  Edit Verify Torque  (SQL)
# ============================================================================

def _load_edit_verify_torque_docs(user: CurrentUser) -> list[dict]:
    df = fetch_dataframe(queries.EDIT_VERIFY_TORQUE_PENDING)
    return permissions.build_edit_verify_torque_docs(
        df,
        is_admin=user.is_admin,
        allowed_costcenters=user.costcenters,
        allowed_positions=user.lines,
        zone_costcenter_map=excel_store.load_zone_costcenter_map(),
    )


@router.get("/verify-torque", response_model=list[EditVerifyTorqueDoc])
def list_edit_verify_torque(user: CurrentUser = Depends(get_current_user)):
    return _load_edit_verify_torque_docs(user)


@router.post("/verify-torque/action", response_model=ActionResponse)
def edit_verify_torque_action(
    payload: EditVerifyTorqueActionRequest,
    user: CurrentUser = Depends(get_current_user),
) -> ActionResponse:
    """
    กด Approve / Reject เครื่องมือที่ขอแก้ไข
    ค่าที่เขียนลง SQL คือคำว่า 'approve' หรือ 'reject' ตรง ๆ
    """
    if payload.action not in VALID_ACTIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Action ไม่ถูกต้อง")

    allowed = any(
        doc["register_number"] == payload.tool_id and doc["can_approve_column"] == payload.column
        for doc in _load_edit_verify_torque_docs(user)
    )
    if not allowed:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail=f"คุณไม่มีสิทธิ์ดำเนินการเครื่องมือ '{payload.tool_id}'",
        )

    sql_column = queries.resolve_column(payload.column, queries.TORQUE_COLUMN_MAP)
    sql_column = safe_column(sql_column, queries.TORQUE_ALLOWED_COLUMNS)

    execute(
        queries.EDIT_VERIFY_TORQUE_ACTION.format(column=sql_column),
        {"value": payload.action, "tool_id": payload.tool_id},
    )

    logger.info(
        "[EDIT_VERIFY] %s | user=%s | position=%s | action=%s",
        payload.tool_id, user.username, payload.column, payload.action,
    )
    return ActionResponse(message="ดำเนินการเรียบร้อย")

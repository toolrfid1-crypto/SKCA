"""
routers/documents.py -- ตาราง Patrol Document และ Verify Torque

โครงของทุก endpoint จะเหมือนกันหมด:
  1. ดึงข้อมูลดิบจาก SQL      (database.fetch_dataframe + ค่า SQL ใน database.py)
  2. ส่งเข้า permissions.build_*_docs พร้อมสิทธิ์ของ user
  3. คืนเฉพาะแถวที่ user คนนั้นมีสิทธิ์เห็น
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app import database, excel_store, permissions
from app.schemas import (
    ActionResponse,
    ApproveMultiplePatrolRequest,
    ApprovePatrolRequest,
    ApproveVerifyTorqueRequest,
    CurrentUser,
    PatrolDoc,
    VerifyTorqueDoc,
)
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["documents"])


# ============================================================================
#  Patrol Document
# ============================================================================

def _load_patrol_docs(user: CurrentUser) -> list[dict]:
    """โหลด + กรองสิทธิ์ -- ใช้ร่วมกันทั้งตอน GET และตอนตรวจสิทธิ์ก่อน approve"""
    df = database.fetch_dataframe(database.PATROL_PENDING)
    return permissions.build_patrol_docs(
        df,
        is_admin=user.is_admin,
        allowed_lines=user.lines,
        zone_line_map=excel_store.load_zone_line_map(),
    )


@router.get("/patrol", response_model=list[PatrolDoc])
def list_patrol_documents(user: CurrentUser = Depends(get_current_user)):
    return _load_patrol_docs(user)


def _assert_can_approve_patrol(user: CurrentUser, document: str, column: str) -> None:
    """
    ตรวจสอบฝั่ง server ว่า user คนนี้กด approve เอกสารใบนี้ในตำแหน่งนี้ได้จริง

    สำคัญมาก: ห้ามเชื่อค่า column ที่ frontend ส่งมาเฉย ๆ
    ไม่งั้นใครก็ยิง request ตรงมา approve แทน Manager ได้
    """
    for doc in _load_patrol_docs(user):
        if doc["title"] == document and doc["can_approve_column"] == column:
            return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"คุณไม่มีสิทธิ์ approve เอกสาร '{document}' ในตำแหน่ง '{column}'",
    )


def _approve_patrol_row(document: str, position: str) -> None:
    sql_column = database.resolve_column(position, database.PATROL_COLUMN_MAP)
    sql_column = database.safe_column(sql_column, database.PATROL_ALLOWED_COLUMNS)

    database.execute(
        database.PATROL_APPROVE.format(column=sql_column),
        {"value": "approve", "document": document},
    )


@router.post("/patrol/approve", response_model=ActionResponse)
def approve_patrol(
    payload: ApprovePatrolRequest,
    user: CurrentUser = Depends(get_current_user),
) -> ActionResponse:
    """กดปุ่ม Approve ทีละใบ"""
    _assert_can_approve_patrol(user, payload.document, payload.column)
    _approve_patrol_row(payload.document, payload.column)

    logger.info("[PATROL] %s | user=%s | position=%s", payload.document, user.username, payload.column)
    return ActionResponse(message="อนุมัติเรียบร้อย")


@router.post("/patrol/approve-multiple", response_model=ActionResponse)
def approve_multiple_patrol(
    payload: ApproveMultiplePatrolRequest,
    user: CurrentUser = Depends(get_current_user),
) -> ActionResponse:
    """กดปุ่ม Approve หลายใบพร้อมกัน (ติ๊ก checkbox)"""
    # ตรวจสิทธิ์ทุกใบให้ครบก่อน แล้วค่อยเขียน -- กันกรณีอนุมัติไปครึ่งทางแล้วเจอ error
    for doc in payload.docs:
        _assert_can_approve_patrol(user, doc.document, doc.column)

    for doc in payload.docs:
        _approve_patrol_row(doc.document, doc.column)

    logger.info("[PATROL x%d] user=%s", len(payload.docs), user.username)
    return ActionResponse(message=f"อนุมัติเรียบร้อย {len(payload.docs)} รายการ")


# ============================================================================
#  Verify Torque
# ============================================================================

def _load_verify_torque_docs(user: CurrentUser) -> list[dict]:
    df = database.fetch_dataframe(database.VERIFY_TORQUE_PENDING)
    return permissions.build_verify_torque_docs(
        df,
        is_admin=user.is_admin,
        allowed_costcenters=user.costcenters,
        allowed_positions=user.lines,
        zone_costcenter_map=excel_store.load_zone_costcenter_map(),
    )


@router.get("/verify-torque", response_model=list[VerifyTorqueDoc])
def list_verify_torque(user: CurrentUser = Depends(get_current_user)):
    return _load_verify_torque_docs(user)


@router.post("/verify-torque/approve", response_model=ActionResponse)
def approve_verify_torque(
    payload: ApproveVerifyTorqueRequest,
    user: CurrentUser = Depends(get_current_user),
) -> ActionResponse:
    allowed = any(
        doc["file_name"] == payload.document and doc["can_approve_column"] == payload.column
        for doc in _load_verify_torque_docs(user)
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"คุณไม่มีสิทธิ์ approve '{payload.document}' ในตำแหน่ง '{payload.column}'",
        )

    sql_column = database.resolve_column(payload.column, database.TORQUE_COLUMN_MAP)
    sql_column = database.safe_column(sql_column, database.TORQUE_ALLOWED_COLUMNS)

    database.execute(
        database.VERIFY_TORQUE_APPROVE.format(column=sql_column),
        {"value": "approve", "document": payload.document},
    )

    logger.info("[VERIFY] %s | user=%s | position=%s", payload.document, user.username, payload.column)
    return ActionResponse(message="อนุมัติเรียบร้อย")

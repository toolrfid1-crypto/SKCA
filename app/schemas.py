"""
schemas.py -- "สัญญา" ระหว่าง Backend กับ Frontend

Pydantic model แต่ละตัวคือรูปร่างของ JSON ที่รับเข้า/ส่งออก
ข้อดี: FastAPI จะ validate ให้อัตโนมัติ + สร้างเอกสาร API ให้ที่ /docs
"""

from pydantic import BaseModel, Field

# ============================================================================
#  Auth
# ============================================================================

class LoginRequest(BaseModel):
    #: อีเมลของผู้ใช้ -- ตรงกับค่าในคอลัมน์ "User" ของ sheet Mail
    #: (คอลัมน์ชื่อ User แต่ข้อมูลข้างในเป็นอีเมล เช่น somchai.k@kubota.com)
    email: str

    #: ใช้เมื่อ REQUIRE_PASSWORD=true เท่านั้น ปกติหน้าเว็บไม่ส่งค่านี้มา
    password: str = ""


class AuthConfig(BaseModel):
    """
    บอกหน้าเว็บว่าต้องแสดงช่องรหัสผ่านไหม

    frontend เรียก endpoint นี้ก่อนวาดฟอร์ม login
    ทำให้เปิด/ปิดการใช้รหัสผ่านได้จาก .env ฝั่งเดียว ไม่ต้องแก้โค้ด React
    """
    require_password: bool


class CurrentUser(BaseModel):
    """ข้อมูล user ที่ decode ออกมาจาก JWT + เติมสิทธิ์จาก Excel"""
    username: str
    lines: list[str] = []
    costcenters: list[str] = []
    is_admin: bool = False

    @property
    def can_see_edit_table(self) -> bool:
        """เห็นตาราง Edit Check Sheet ได้ไหม (ยกมาจาก can_see_edit_table เดิม)"""
        return self.is_admin or any(
            role in self.lines for role in ("LD FI", "FM FI", "Asst-FinalB")
        )


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CurrentUser


# ============================================================================
#  เอกสารแต่ละประเภท (ส่งออกไปให้ตารางบนหน้าเว็บ)
# ============================================================================

class PatrolDoc(BaseModel):
    id: int
    title: str
    pdf_path: str
    line: str
    zone: str
    status: str
    can_approve_column: str


class EditCheckSheetDoc(BaseModel):
    no: int
    file_name: str
    before_path: str
    after_path: str
    line: str
    model: str
    can_approve_column: str


class VerifyTorqueDoc(BaseModel):
    file_name: str
    file_path: str
    month: str
    year: str
    period: str
    total_tool: int
    checking: int
    unchecking: int
    ng: int
    cost_center: str
    line: str
    status_checking: str
    can_approve_column: str


class EditVerifyTorqueDoc(BaseModel):
    line: str
    cost_center: str
    detail_change: str
    editor: str
    datetime: str
    register_number: str
    process: str
    reason: str
    can_approve_column: str


# ============================================================================
#  Request body ของปุ่มต่าง ๆ
# ============================================================================

class ApprovePatrolRequest(BaseModel):
    document: str = Field(..., description="ชื่อ Folder Name ของเอกสาร")
    column: str = Field(..., description="ตำแหน่งที่กด approve เช่น 'LD FI'")


class ApproveMultiplePatrolRequest(BaseModel):
    docs: list[ApprovePatrolRequest]


class ApproveVerifyTorqueRequest(BaseModel):
    document: str = Field(..., description="FileName ของเอกสาร")
    column: str


class EditSheetActionRequest(BaseModel):
    action: str = Field(..., description="'approve' หรือ 'reject'")
    column: str = Field(..., description="'LD FI' / 'FM FI' / 'Asst-FinalB'")


class EditVerifyTorqueActionRequest(BaseModel):
    tool_id: str = Field(..., description="REGISTER_NUMBER ของเครื่องมือ")
    column: str
    action: str = Field(..., description="'approve' หรือ 'reject'")


# ============================================================================
#  อื่น ๆ
# ============================================================================

class AppSettings(BaseModel):
    notify_ng_case: bool = True
    send_email_approve_document: bool = True
    send_email_edit_checksheet_approve: bool = True


class ActionResponse(BaseModel):
    success: bool = True
    message: str = ""

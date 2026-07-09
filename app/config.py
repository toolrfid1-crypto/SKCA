"""
config.py -- รวมค่า setting ทั้งหมดของโปรแกรมไว้ที่เดียว

แนวคิด: โค้ดไม่ควรรู้จัก "ค่าจริง" ของ password หรือ path
โค้ดรู้จักแค่ "ชื่อตัวแปร" ส่วนค่าจริงอ่านมาจากไฟล์ .env

pydantic-settings จะอ่านไฟล์ .env ให้อัตโนมัติ แล้วแปลงชนิดข้อมูลให้ด้วย
(เช่น REQUIRE_PASSWORD=false ใน .env จะกลายเป็น bool False ใน Python)
"""

import urllib.parse
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # บอก pydantic ว่าให้อ่านไฟล์ .env ที่อยู่ใน folder backend/
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------------------------------------------ SQL Server
    SQL_SERVER: str
    SQL_DATABASE: str
    SQL_USERNAME: str
    SQL_PASSWORD: str
    SQL_DRIVER: str = "ODBC Driver 18 for SQL Server"
    SQL_TRUST_SERVER_CERTIFICATE: str = "yes"

    # ------------------------------------------------------------ ไฟล์ Excel
    EXCEL_FILE_PATH: str
    EXCEL_MAIL_SHEET: str = "Mail"
    EXCEL_EDIT_SHEET: str = "EditCheckSheet"

    # ------------------------------------------------------------ Auth / JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    # false = ล็อกอินด้วย username อย่างเดียว (พฤติกรรมเดิม)
    # true  = ต้องกรอก password ให้ตรงกับใน sheet Mail ด้วย
    REQUIRE_PASSWORD: bool = False

    # ------------------------------------------------------------ ความปลอดภัย PDF
    # เก็บเป็น string ธรรมดา แล้วค่อย split เอง -- ง่ายกว่าให้ pydantic แปลง list
    PDF_ALLOWED_ROOTS: str = ""

    # ------------------------------------------------------------ CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # ------------------------------------------------------------ ลิงก์ภายนอก
    LINK_DASHBOARD: str = ""

    # ========================================================================
    #  ค่าที่คำนวณต่อจากค่าข้างบน (property = เรียกใช้เหมือนตัวแปรธรรมดา)
    # ========================================================================

    @property
    def odbc_connection_string(self) -> str:
        """สตริงสำหรับต่อ SQL Server ผ่าน pyodbc -- แทนที่ conn_str ตัวเดิม"""
        return (
            f"DRIVER={{{self.SQL_DRIVER}}};"
            f"SERVER={self.SQL_SERVER};"
            f"DATABASE={self.SQL_DATABASE};"
            f"UID={self.SQL_USERNAME};"
            f"PWD={self.SQL_PASSWORD};"
            f"TrustServerCertificate={self.SQL_TRUST_SERVER_CERTIFICATE};"
        )

    @property
    def sqlalchemy_url(self) -> str:
        """URL สำหรับ SQLAlchemy -- ต้อง url-encode odbc string ก่อน"""
        encoded = urllib.parse.quote_plus(self.odbc_connection_string)
        return f"mssql+pyodbc:///?odbc_connect={encoded}"

    @property
    def excel_lock_path(self) -> str:
        """ไฟล์ .lock กันคนสองคนเขียน Excel พร้อมกัน"""
        return self.EXCEL_FILE_PATH + ".lock"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def pdf_allowed_roots(self) -> list[Path]:
        """แปลง string ที่คั่นด้วย ; ให้เป็น list ของ Path ที่ resolve แล้ว"""
        roots = []
        for raw in self.PDF_ALLOWED_ROOTS.split(";"):
            raw = raw.strip()
            if raw:
                roots.append(Path(raw).resolve())
        return roots


@lru_cache
def get_settings() -> Settings:
    """
    ใช้ lru_cache เพื่อให้อ่าน .env แค่ครั้งเดียวตอนเรียกครั้งแรก
    ครั้งต่อ ๆ ไปจะได้ object เดิมกลับไป (ไม่ต้องอ่านไฟล์ซ้ำ)
    """
    return Settings()


settings = get_settings()

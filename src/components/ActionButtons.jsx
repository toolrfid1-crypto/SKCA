/**
 * ActionButtons.jsx -- ปุ่มมาตรฐานที่ใช้ซ้ำในตาราง
 *
 * สีของปุ่มยึดตามคู่มือหัวข้อ 3 (การกำหนดสีของ Widget):
 *   #4CAF50  Approve  -> Action เชิงบวก / อนุมัติ
 *   #ED4D4D  Reject   -> Action ยกเลิก / ปฏิเสธ
 *   #EDAA4D  Edit     -> Action แก้ไข
 *   #B6B6B6  Disabled -> ปุ่มที่กดไม่ได้
 *
 * VisibilityButton (ปุ่มไม่มีข้อความ) ใช้ในตารางเพื่อเปิดดูข้อมูล -- คู่มือหัวข้อ 2
 */

import { Button, Chip, IconButton, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import { oneUxColors } from "../styles/globaltheme";

export function ApproveButton({ onClick, disabled = false, label = "Approve" }) {
  return (
    <Button
      size="small"
      startIcon={<CheckCircleIcon />}
      onClick={onClick}
      disabled={disabled}
      sx={{
        backgroundColor: oneUxColors.success,
        "&:hover": { backgroundColor: oneUxColors.success },
      }}
    >
      {label}
    </Button>
  );
}

export function RejectButton({ onClick, disabled = false, label = "Reject" }) {
  return (
    <Button
      size="small"
      startIcon={<CloseIcon />}
      onClick={onClick}
      disabled={disabled}
      sx={{
        backgroundColor: oneUxColors.reject,
        "&:hover": { backgroundColor: oneUxColors.reject },
      }}
    >
      {label}
    </Button>
  );
}

/** ปุ่มไอคอนอย่างเดียว สำหรับเปิดไฟล์ PDF */
export function ViewPdfButton({ onClick, disabled = false, title = "เปิดไฟล์ PDF" }) {
  return (
    <Tooltip title={disabled ? "ไม่มีไฟล์แนบ" : title}>
      {/* span ครอบไว้ เพราะ Tooltip แสดงบนปุ่มที่ disabled ไม่ได้ */}
      <span>
        <IconButton onClick={onClick} disabled={disabled} sx={{ color: oneUxColors.primary }}>
          <PictureAsPdfIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** ป้ายสถานะ OK / NG หรือ Complete / Not Complete */
export function StatusChip({ value }) {
  const normalized = String(value ?? "").trim().toLowerCase();

  const isBad = normalized === "ng" || normalized === "not complete";
  const isGood = normalized === "ok" || normalized === "complete";

  let color = oneUxColors.disabled;
  if (isGood) color = oneUxColors.success;
  if (isBad) color = oneUxColors.reject;

  return (
    <Chip
      label={value || "-"}
      size="small"
      sx={{ backgroundColor: color, color: oneUxColors.white, fontWeight: 500 }}
    />
  );
}

/** ป้ายบอกว่าเอกสารใบนี้เรากด approve ในตำแหน่งไหน */
export function PositionChip({ value }) {
  return (
    <Chip
      label={value}
      size="small"
      variant="outlined"
      sx={{ borderColor: oneUxColors.primary, color: oneUxColors.primary, fontWeight: 500 }}
    />
  );
}

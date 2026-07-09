/**
 * ConfirmDialog.jsx -- Modal ยืนยันก่อนทำ Action สำคัญ
 *
 * ตามคู่มือหัวข้อ 9: "หากมีการทำ Action ที่สำคัญ ระบบต้องแสดง Modal
 * เพื่อยืนยันว่าต้องการทำจริง ๆ"
 *
 * ตามคู่มือหัวข้อ 2 (Button): Primary Button อยู่ซ้าย, Secondary Button อยู่ขวา
 */

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

import { oneUxColors } from "../styles/globaltheme";

/** สีของปุ่มยืนยัน ตามความหมายของ Action (คู่มือหัวข้อ 3) */
const CONFIRM_COLORS = {
  approve: oneUxColors.success, // #4CAF50 อนุมัติ / ยืนยัน
  reject: oneUxColors.reject, // #ED4D4D ยกเลิก / ปฏิเสธ
  edit: oneUxColors.edit, // #EDAA4D แก้ไข
  primary: oneUxColors.primary, // #00A8A9 ทั่วไป
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmColor = CONFIRM_COLORS[variant] ?? CONFIRM_COLORS.primary;

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ color: oneUxColors.textPrimary }}>{message}</DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {/* Primary (ยืนยัน) อยู่ซ้าย */}
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          sx={{
            backgroundColor: confirmColor,
            "&:hover": { backgroundColor: confirmColor },
          }}
        >
          {loading ? "กำลังดำเนินการ..." : confirmLabel}
        </Button>

        {/* Secondary (ยกเลิก) อยู่ขวา */}
        <Button variant="outlined" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

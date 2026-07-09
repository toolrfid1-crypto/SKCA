/**
 * useConfirmAction.js -- รวมขั้นตอน "ถามยืนยัน -> ยิง API -> แจ้งผล -> โหลดใหม่"
 *
 * ทุกตารางในระบบทำ 4 ขั้นตอนนี้เหมือนกันหมด เลยดึงออกมาไว้ที่เดียว
 *
 * วิธีใช้:
 *   const confirmAction = useConfirmAction(reload);
 *
 *   confirmAction.ask({
 *     title: "ยืนยันการอนุมัติ",
 *     message: `อนุมัติเอกสาร ${doc.title} หรือไม่?`,
 *     variant: "approve",
 *     successMessage: "อนุมัติเรียบร้อย",
 *     run: () => documentsApi.approvePatrol(doc.title, doc.can_approve_column),
 *   });
 *
 *   <ConfirmDialog {...confirmAction.dialogProps} />
 */

import { useCallback, useState } from "react";
import { useSnackbar } from "../context/SnackbarContext";

export function useConfirmAction(onSuccess) {
  const notify = useSnackbar();
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(false);

  const ask = useCallback((config) => setPending(config), []);

  const cancel = useCallback(() => {
    if (!loading) setPending(null); // กันปิดกลางคันตอนกำลังยิง API
  }, [loading]);

  const confirm = useCallback(async () => {
    if (!pending) return;

    setLoading(true);
    try {
      await pending.run();
      notify.success(pending.successMessage || "ดำเนินการเรียบร้อย");
      setPending(null);
      await onSuccess?.();
    } catch (error) {
      notify.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [pending, notify, onSuccess]);

  return {
    ask,
    // props ชุดนี้ส่งเข้า <ConfirmDialog /> ได้เลย
    dialogProps: {
      open: Boolean(pending),
      title: pending?.title ?? "",
      message: pending?.message ?? "",
      variant: pending?.variant ?? "primary",
      confirmLabel: pending?.confirmLabel,
      loading,
      onConfirm: confirm,
      onCancel: cancel,
    },
  };
}

/**
 * SnackbarContext.jsx -- แถบแจ้งเตือนเล็ก ๆ ที่มุมจอ
 *
 * แทนที่ SweetAlert แบบ toast ของเดิม
 * วิธีใช้:
 *   const notify = useSnackbar();
 *   notify.success("อนุมัติเรียบร้อย");
 *   notify.error("เกิดข้อผิดพลาด");
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [state, setState] = useState({ open: false, message: "", severity: "success" });

  const show = useCallback((message, severity) => {
    setState({ open: true, message, severity });
  }, []);

  const value = useMemo(
    () => ({
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error"),
      info: (message) => show(message, "info"),
    }),
    [show],
  );

  const handleClose = (_event, reason) => {
    if (reason === "clickaway") return; // อย่าปิดเวลาผู้ใช้คลิกที่อื่น
    setState((prev) => ({ ...prev, open: false }));
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleClose} severity={state.severity} variant="filled" sx={{ width: "100%" }}>
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar ต้องถูกเรียกใช้ภายใน <SnackbarProvider> เท่านั้น");
  }
  return context;
}

/**
 * main.jsx -- จุดเริ่มต้นของ Frontend
 *
 * ไล่จากนอกเข้าใน แต่ละชั้นห่อชั้นถัดไป:
 *
 *   ThemeProvider        ส่งสี/ฟอนต์/ขนาดตัวอักษร (globaltheme.js) ลงไปให้ทุก component
 *     LocalizationProvider  ให้ DatePicker รู้จัก dayjs
 *       BrowserRouter       ทำให้ URL เปลี่ยนได้โดยไม่ต้อง reload
 *         AuthProvider      บอกว่าใครล็อกอินอยู่
 *           SnackbarProvider แถบแจ้งเตือน
 *             <App />
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { BrowserRouter } from "react-router-dom";

// ฟอนต์ IBM Plex Sans Thai -- ต้อง import น้ำหนักที่ theme ใช้ให้ครบ (400/500/600)
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/500.css";
import "@fontsource/ibm-plex-sans-thai/600.css";

import App from "./App";
import globalstyles from "./styles/globalstyles";
import globaltheme from "./styles/globaltheme";
import { AuthProvider } from "./context/AuthContext";
import { SnackbarProvider } from "./context/SnackbarContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={globaltheme}>
      {/* CssBaseline = รีเซ็ต CSS ของเบราว์เซอร์ให้เหมือนกันทุกตัว */}
      <CssBaseline />
      {globalstyles}

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <AuthProvider> {/* เอาไว้ check ว่า user ล็อกอินแล้วหรือยัง */}
            <SnackbarProvider>
              <App />
            </SnackbarProvider>
          </AuthProvider>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>,
);


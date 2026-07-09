/**
 * App.jsx -- แผนผังเส้นทาง (Routing) ของทั้งเว็บ
 *
 *   /login                 หน้าเข้าสู่ระบบ (ไม่ต้องล็อกอิน)
 *   ------------------- ต้องล็อกอินก่อน -------------------
 *   /                      หน้าหลัก 4 ตาราง
 *   /settings              ตั้งค่าระบบ
 *
 * <ProtectedRoute /> ทำหน้าที่เหมือน @login_required
 * <AppLayout />      คือ AppBar + Sidebar ที่ครอบทุกหน้าด้านใน
 */

import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import ErrorPage from "./pages/ErrorPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/404" element={<ErrorPage code={404} />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

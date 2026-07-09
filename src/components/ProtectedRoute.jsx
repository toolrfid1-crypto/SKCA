/**
 * ProtectedRoute.jsx -- ยามเฝ้าประตู
 *
 * เทียบเท่ากับ decorator @login_required ของ Flask
 * ถ้ายังไม่ล็อกอิน -> เด้งไปหน้า /login
 */

import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // ระหว่างเช็ค token เดิม อย่าเพิ่งเด้งไปหน้า login (ไม่งั้นจะกระพริบ)
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // จำหน้าที่ผู้ใช้อยากไปไว้ เพื่อพากลับมาหลังล็อกอินสำเร็จ
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

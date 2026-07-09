/**
 * AppLayout.jsx -- โครงหน้าจอที่ใช้ร่วมกันทุกหน้า
 *
 *   +--------------------------------------------------+
 *   |  TopAppBar  (fixed)                              |
 *   +--------------------------------------------------+
 *   |                                                  |
 *   |   <Outlet />  = เนื้อหาของแต่ละหน้า               |
 *   |                                                  |
 *   +--------------------------------------------------+
 *
 * Sidebar เป็น Drawer แบบ overlay จึงไม่กินพื้นที่ layout
 *
 * ระยะห่างตามคู่มือหัวข้อ 4:
 *   ขอบซ้าย-ขวา 1.5rem, บน-ล่าง 1.25rem
 */

import { useEffect, useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import TopAppBar from "./TopAppBar";
import { settingsApi } from "../../api/client";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dashboardLink, setDashboardLink] = useState("");

  // ลิงก์ Dashboard เก็บอยู่ใน .env ฝั่ง backend -- ดึงมาตอนโหลดครั้งแรก
  useEffect(() => {
    settingsApi
      .links()
      .then((data) => setDashboardLink(data.dashboard))
      .catch(() => setDashboardLink("")); // ไม่มีลิงก์ก็แค่ไม่แสดงเมนู
  }, []);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <TopAppBar onBurgerClick={() => setDrawerOpen(true)} />

      <Sidebar
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        dashboardLink={dashboardLink}
      />

      <Box component="main" sx={{ flexGrow: 1, width: "100%", minWidth: 0 }}>
        {/* Toolbar เปล่า ๆ ตัวนี้ทำหน้าที่ "ดันเนื้อหาลงมา" ให้พ้น AppBar ที่ fixed อยู่ */}
        <Toolbar />

        <Box sx={{ px: "1.5rem", py: "1.25rem" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

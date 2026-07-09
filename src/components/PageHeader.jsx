/**
 * PageHeader.jsx -- หัวข้อของหน้า + Breadcrumbs
 *
 * ตามคู่มือหัวข้อ 10 และ 14:
 *   ทุกหน้าที่มาจากการกดจากหน้าอื่น ต้องมี Breadcrumbs ให้กดย้อนกลับได้
 *   ระยะห่างระหว่าง Header กับ Content = 2.5rem
 *
 * ขนาดตัวอักษรของ Breadcrumbs (1.75rem, ตัวหนา, สี primary)
 * ถูกกำหนดไว้แล้วใน globaltheme.js -> components.MuiBreadcrumbs
 */

import { Box, Breadcrumbs, Link, Typography } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Link as RouterLink } from "react-router-dom";

import { oneUxColors } from "../styles/globaltheme";

/**
 * @param {string} title  หัวข้อของหน้าปัจจุบัน (ตัวสุดท้าย กดไม่ได้)
 * @param {Array<{label: string, to: string}>} trail  หน้าก่อนหน้า (กดย้อนกลับได้)
 * @param {React.ReactNode} action  ปุ่มมุมขวา เช่น "รีเฟรช"
 */
export default function PageHeader({ title, trail = [], action = null }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
        mb: "2.5rem",
      }}
    >
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
        {trail.map((item) => (
          <Link
            key={item.to}
            component={RouterLink}
            to={item.to}
            underline="hover"
            sx={{ color: oneUxColors.textSecondary, fontSize: "1.75rem", fontWeight: 600 }}
          >
            {item.label}
          </Link>
        ))}

        {/* หน้าปัจจุบัน -- ไม่ใช่ลิงก์ */}
        <Typography component="h1" sx={{ fontSize: "1.75rem", fontWeight: 600, color: oneUxColors.primary }}>
          {title}
        </Typography>
      </Breadcrumbs>

      {action}
    </Box>
  );
}

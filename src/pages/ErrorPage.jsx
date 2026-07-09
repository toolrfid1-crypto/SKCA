/**
 * ErrorPage.jsx -- หน้าแสดง HTTP Status Code
 *
 * ตามคู่มือหัวข้อ 11 (การจัดการกับ HTTP Status Code):
 *   ต้องแสดงผลออกมาเป็นข้อความและภาพประกอบ ไม่ใช่โยน error ดิบ ๆ ใส่ผู้ใช้
 */

import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { oneUxColors } from "../styles/globaltheme";

const PRESETS = {
  403: {
    title: "403",
    heading: "ไม่มีสิทธิ์เข้าถึง",
    detail: "บัญชีของคุณไม่ได้รับอนุญาตให้เข้าหน้านี้ กรุณาติดต่อผู้ดูแลระบบ",
  },
  404: {
    title: "404",
    heading: "ไม่พบหน้าที่ต้องการ",
    detail: "หน้าที่คุณเรียกอาจถูกย้ายหรือลบไปแล้ว",
  },
  500: {
    title: "500",
    heading: "ระบบขัดข้อง",
    detail: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้งภายหลัง",
  },
};

export default function ErrorPage({ code = 404 }) {
  const navigate = useNavigate();
  const preset = PRESETS[code] ?? PRESETS[404];

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Typography sx={{ fontSize: "6rem", fontWeight: 600, color: oneUxColors.primary, lineHeight: 1 }}>
          {preset.title}
        </Typography>

        <Typography variant="h2">{preset.heading}</Typography>

        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
          {preset.detail}
        </Typography>

        <Button onClick={() => navigate("/")} sx={{ mt: 2 }}>
          กลับหน้าหลัก
        </Button>
      </Stack>
    </Box>
  );
}

/**
 * LoginPage.jsx -- หน้าเข้าสู่ระบบ
 *
 * ล็อกอินด้วย "อีเมล" อย่างเดียว
 * อีเมลต้องตรงกับคอลัมน์ User ใน sheet Mail ของไฟล์ DataWebapp.xlsx
 * (คอลัมน์ชื่อ User แต่ข้อมูลข้างในเป็นอีเมล เช่น somchai.k@kubota.com)
 *
 * ช่องรหัสผ่านจะโผล่มาก็ต่อเมื่อ backend ตั้ง REQUIRE_PASSWORD=true
 * หน้านี้ถาม /api/auth/config ก่อนวาดฟอร์ม จึงไม่ต้องแก้โค้ด React เวลาสลับโหมด
 */

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { oneUxColors } from "../styles/globaltheme";

/**
 * ตรวจรูปแบบอีเมลแบบหลวม ๆ (คู่มือหัวข้อ 7: บอกผู้ใช้ทันทีว่าผิดตรงไหน)
 *
 * ยกเว้น "admin" เพราะเป็น user พิเศษที่ไม่ได้อยู่ใน Excel และไม่ใช่อีเมล
 */
function validateEmail(value) {
  const email = value.trim();
  if (!email) return "กรุณากรอกอีเมล";
  if (email.toLowerCase() === "admin") return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "รูปแบบอีเมลไม่ถูกต้อง";
  return null;
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // null = ยังไม่รู้ว่าต้องใช้รหัสผ่านไหม (กำลังถาม backend อยู่)
  const [requirePassword, setRequirePassword] = useState(false);

  useEffect(() => {
    authApi
      .config()
      .then((config) => setRequirePassword(config.require_password))
      .catch(() => setRequirePassword(false)); // ถามไม่ได้ก็ถือว่าไม่ต้องใช้
  }, []);

  // ล็อกอินอยู่แล้วก็ไม่ต้องเห็นหน้านี้
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (requirePassword && !password) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        // พื้นหลัง 70% ขาว + แต้มสี primary เล็กน้อย (สัดส่วนสีตามคู่มือหัวข้อ 3)
        background: `linear-gradient(160deg, ${oneUxColors.pageBackground} 55%, ${oneUxColors.primary}22 100%)`,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 440 }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={1} sx={{ mb: 4, textAlign: "center" }}>
            <Typography variant="h1" sx={{ color: oneUxColors.primary }}>
              LTR Approve System
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ระบบอนุมัติเอกสาร Patrol และ Verify Torque
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/*
            noValidate = ปิดการตรวจฟอร์มของเบราว์เซอร์
            ถ้าไม่ปิด เบราว์เซอร์จะบล็อกการ submit ตั้งแต่ยังไม่ถึง handleSubmit
            ทำให้ล็อกอินด้วย "admin" (ซึ่งไม่ใช่อีเมล) ไม่ได้
          */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="อีเมล"
                // type="text" ไม่ใช่ "email" -- ต้องยอมให้พิมพ์ "admin" ที่ไม่มี @ ได้
                // การตรวจรูปแบบเป็นหน้าที่ของ validateEmail() ข้างบนแทน
                type="text"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="somchai.k@kubota.com"
                error={Boolean(error) && Boolean(validateEmail(email))}
                autoFocus
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* แสดงเฉพาะตอน backend เปิดโหมดตรวจรหัสผ่าน */}
              {requirePassword && (
                <TextField
                  label="รหัสผ่าน"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              <Button type="submit" size="large" disabled={submitting} fullWidth>
                {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

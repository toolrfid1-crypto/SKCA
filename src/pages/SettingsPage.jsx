/**
 * SettingsPage.jsx -- หน้าตั้งค่าระบบ
 *
 * เดิมเป็น global variable ใน Flask ที่ background job เอาไปอ่าน
 * ในเฟสนี้เรายังไม่ได้ย้าย background job มา ค่าจึงยังไม่มีผลกับการส่งอีเมลจริง
 * (โปรแกรม WebAppApprove.py ตัวเดิมยังทำหน้าที่นั้นอยู่)
 *
 * ตามคู่มือหัวข้อ 7 (Switch): ใช้กับตัวเลือกที่มีแค่ "เปิด" หรือ "ปิด"
 */

import { useState } from "react";
import {
  Alert,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";

import PageHeader from "../components/PageHeader";
import { settingsApi } from "../api/client";
import { useAsyncData } from "../hooks/useAsyncData";
import { usePermissions } from "../context/AuthContext";
import { useSnackbar } from "../context/SnackbarContext";

const SWITCHES = [
  { key: "notify_ng_case", label: "🔔 เปิดการแจ้งเตือน NG Case" },
  { key: "send_email_approve_document", label: "📧 ส่งอีเมลแจ้งเอกสารรออนุมัติ (PatrolMan + VerifyTorque)" },
  { key: "send_email_edit_checksheet_approve", label: "📧 ส่งอีเมลแจ้งอนุมัติ Edit Check Sheet" },
];

export default function SettingsPage() {
  const { isAdmin } = usePermissions();
  const notify = useSnackbar();

  const { data, loading, error, setData } = useAsyncData(settingsApi.get, []);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key) => {
    const next = { ...data, [key]: !data[key] };

    setData(next); // อัปเดตหน้าจอทันที ไม่ต้องรอ server (optimistic update)
    setSaving(true);
    try {
      await settingsApi.update(next);
      notify.success("บันทึกการตั้งค่าแล้ว");
    } catch (err) {
      setData(data); // ถ้าพัง ให้ย้อนค่ากลับ
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="ตั้งค่าระบบ" trail={[{ label: "หน้าหลัก", to: "/" }]} />

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          คุณดูการตั้งค่าได้ แต่แก้ไขไม่ได้ (เฉพาะ admin เท่านั้น)
        </Alert>
      )}

      <Paper sx={{ p: 3, maxWidth: 720 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          การแจ้งเตือน
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1}>
          {SWITCHES.map((item) => (
            <FormControlLabel
              key={item.key}
              control={
                <Switch
                  checked={Boolean(data?.[item.key])}
                  onChange={() => handleToggle(item.key)}
                  disabled={loading || saving || !isAdmin}
                />
              }
              label={item.label}
            />
          ))}
        </Stack>
      </Paper>
    </>
  );
}

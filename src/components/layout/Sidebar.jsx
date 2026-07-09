/**
 * Sidebar.jsx -- เมนูด้านข้าง (Drawer)
 *
 * ตามคู่มือ ONE UX/UI หัวข้อ 11 (Appbar & Drawer):
 *   - Drawer ใช้เมื่อมีเมนูเยอะ
 *   - โดย default จะ "ไม่แสดง" จนกว่าจะกดปุ่ม Burger
 *   - เมื่อเปิดแล้วจะ Overlay ทับหน้าจอ  ->  จึงใช้ variant="temporary"
 *   - บนจอ Tablet/Mobile ให้ย้ายชื่อผู้ใช้มาไว้ใน Drawer แทน AppBar
 */

import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";

import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import SettingsIcon from "@mui/icons-material/Settings";

import { useAuth, usePermissions } from "../../context/AuthContext";
import { oneUxColors } from "../../styles/globaltheme";

export const DRAWER_WIDTH = 280;

/**
 * รายการเมนูทั้งหมด
 * `visible` = ฟังก์ชันที่บอกว่าเมนูนี้ user คนนี้เห็นไหม
 */
const MENU_ITEMS = [
  {
    label: "หน้าหลัก (รออนุมัติ)",
    path: "/",
    icon: <AssignmentTurnedInIcon />,
    visible: () => true,
  },
  {
    label: "ตั้งค่าระบบ",
    path: "/settings",
    icon: <SettingsIcon />,
    visible: () => true,
  },
];

export default function Sidebar({ open, onClose, dashboardLink }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user } = useAuth();
  const permissions = usePermissions();

  // md = 900px ขึ้นไปถือว่าเป็น Desktop (ตาม breakpoint ในคู่มือ)
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      // ช่วยให้เปิด/ปิดลื่นขึ้นบนมือถือ
      ModalProps={{ keepMounted: true }}
      sx={{
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
        },
      }}
    >
      {/* เว้นที่ให้เท่ากับความสูงของ AppBar */}
      <Toolbar />

      {/* บน Tablet/Mobile: แสดงชื่อผู้ใช้ใน Drawer แทน AppBar */}
      {!isDesktop && user && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 2 }}>
            <Avatar sx={{ bgcolor: oneUxColors.primary }}>
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body1" fontWeight={600}>
                {user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.is_admin ? "Administrator" : user.lines.join(", ") || "ผู้ใช้งาน"}
              </Typography>
            </Box>
          </Box>
          <Divider />
        </>
      )}

      <List sx={{ px: 1, py: 1 }}>
        {MENU_ITEMS.filter((item) => item.visible(permissions)).map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => handleNavigate(item.path)}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              "&.Mui-selected": {
                backgroundColor: oneUxColors.primary,
                color: oneUxColors.white,
                "& .MuiListItemIcon-root": { color: oneUxColors.white },
                "&:hover": { backgroundColor: oneUxColors.primary },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}

        {/* ลิงก์ออกไปเว็บภายนอก (Dashboard) -- แยกออกมาเพราะไม่ใช่ route ของเรา */}
        {dashboardLink && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItemButton
              component="a"
              href={dashboardLink}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <InsertChartIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard Patrol" />
            </ListItemButton>
          </>
        )}
      </List>
    </Drawer>
  );
}

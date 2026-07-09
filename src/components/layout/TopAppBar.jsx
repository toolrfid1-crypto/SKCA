/**
 * TopAppBar.jsx -- แถบด้านบนสุดของทุกหน้า
 *
 * ตามคู่มือ ONE UX/UI หัวข้อ 11:
 *   ซ้าย  : ปุ่ม Burger (มีได้เพราะเราใช้ Drawer) + โลโก้ + ชื่อระบบ
 *   ขวา   : ชื่อ-นามสกุลผู้ใช้ + Appbar Menu (ปุ่มออกจากระบบ)
 *   บนจอเล็ก ให้ซ่อนชื่อผู้ใช้ แล้วไปแสดงใน Drawer แทน
 */

import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { oneUxColors } from "../../styles/globaltheme";

export default function TopAppBar({ onBurgerClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    // position="fixed" -> AppBar ลอยอยู่ข้างบนเสมอ ไม่เลื่อนตามเนื้อหา
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton edge="start" onClick={onBurgerClick} aria-label="เปิดเมนู" sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h3"
          component="div"
          sx={{ flexGrow: 1, fontWeight: 600, color: oneUxColors.white }}
        >
          Webapp Approve System LTR
        </Typography>

        {user && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* ซ่อนชื่อผู้ใช้บนจอเล็กกว่า md -- ไปแสดงใน Drawer แทน */}
            <Typography
              variant="body1"
              sx={{ display: { xs: "none", md: "block" }, color: oneUxColors.white }}
            >
              {user.username}
            </Typography>

            <Tooltip title="เมนูผู้ใช้งาน">
              <IconButton onClick={(event) => setAnchorEl(event.currentTarget)}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: alpha(oneUxColors.white, 0.25),
                    color: oneUxColors.white,
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem disabled sx={{ opacity: "1 !important" }}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {user.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.is_admin ? "Administrator" : user.lines.join(", ") || "ผู้ใช้งาน"}
                  </Typography>
                </Box>
              </MenuItem>

              <Divider />

              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" sx={{ color: oneUxColors.reject }} />
                </ListItemIcon>
                <Typography color={oneUxColors.reject}>ออกจากระบบ</Typography>
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

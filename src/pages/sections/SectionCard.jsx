/**
 * SectionCard.jsx -- กรอบของแต่ละตารางบนหน้าหลัก
 *
 * SubHeader ใช้ขนาด 1.5rem ตัวหนา (คู่มือหัวข้อ 2: FontSubHeader)
 */

import { Badge, Box, Stack, Typography } from "@mui/material";

import { oneUxColors } from "../../styles/globaltheme";

export default function SectionCard({ title, count = 0, actions = null, children }) {
  return (
    <Box component="section" sx={{ mb: 5 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h2" sx={{ color: oneUxColors.textPrimary }}>
            {title}
          </Typography>

          <Badge
            badgeContent={count}
            showZero
            sx={{
              "& .MuiBadge-badge": {
                backgroundColor: oneUxColors.primary,
                color: oneUxColors.white,
                position: "static",
                transform: "none",
              },
            }}
          />
        </Stack>

        {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
      </Stack>

      {children}
    </Box>
  );
}

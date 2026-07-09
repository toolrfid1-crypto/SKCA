/**
 * DataTable.jsx -- ตารางกลางที่ทุกหน้าเอาไปใช้ซ้ำ
 *
 * ตามคู่มือหัวข้อ 12 และ 13:
 *   - ถ้ามีปุ่ม Action ให้อยู่ "ขวาสุด" ของแถวเสมอ
 *   - จอเล็กกว่า Desktop ให้เพิ่ม scroll แนวนอน
 *   - "ถ้าหากว่ามี Table ต้องมี Pagination" -> ตัวนี้จึงมี Pagination ในตัว
 *
 * นิยามคอลัมน์ (columns):
 *   {
 *     id: "line",                       // key ที่ใช้ดึงค่าจาก row
 *     label: "Line",                    // ข้อความหัวตาราง
 *     align: "center",                  // left | center | right
 *     render: (row) => <Chip ... />,    // (ไม่บังคับ) อยากวาดเองก็ใส่
 *   }
 */

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const ROWS_PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function DataTable({
  columns,
  rows,
  getRowKey,
  loading = false,
  error = null,
  emptyMessage = "ไม่มีข้อมูล",
  // --- สำหรับตารางที่เลือกได้หลายแถว (checkbox) ---
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  /**
   * แบ่งหน้าฝั่ง server (ไม่ใส่ = แบ่งหน้าเองในหน้าเว็บ)
   * { page, totalPages, totalRows, rowsPerPage, onPageChange, onRowsPerPageChange }
   *
   * ใช้ตอนข้อมูลเยอะเกินกว่าจะโหลดมาทั้งหมด เช่นหน้า Search PDF
   */
  pagination = null,
}) {
  const [page, setPage] = useState(1); // MUI Pagination เริ่มนับที่ 1
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const safeRows = rows ?? [];
  const isServerSide = Boolean(pagination);

  const effectiveRowsPerPage = isServerSide ? pagination.rowsPerPage : rowsPerPage;
  const totalRows = isServerSide ? pagination.totalRows : safeRows.length;
  const totalPages = isServerSide
    ? Math.max(1, pagination.totalPages)
    : Math.max(1, Math.ceil(safeRows.length / rowsPerPage));

  // ถ้าลบข้อมูลจนหน้าปัจจุบันเกินจำนวนหน้า ให้ดึงกลับมาหน้าสุดท้าย
  const currentPage = isServerSide ? pagination.page : Math.min(page, totalPages);

  // โหมด server: backend ตัดหน้ามาให้แล้ว จึงแสดงทุกแถวที่ได้รับมา
  const visibleRows = useMemo(() => {
    if (isServerSide) return safeRows;
    const start = (currentPage - 1) * rowsPerPage;
    return safeRows.slice(start, start + rowsPerPage);
  }, [isServerSide, safeRows, currentPage, rowsPerPage]);

  const handlePageChange = (_event, value) => {
    if (isServerSide) pagination.onPageChange(value);
    else setPage(value);
  };

  const handleRowsPerPageChange = (event) => {
    const value = Number(event.target.value);
    if (isServerSide) {
      pagination.onRowsPerPageChange(value);
    } else {
      setRowsPerPage(value);
      setPage(1); // เปลี่ยนจำนวนต่อหน้าแล้วต้องกลับไปหน้าแรก
    }
  };

  // ติ๊ก "เลือกทั้งหมด" = เลือกเฉพาะแถวที่มองเห็นในหน้านี้
  const visibleKeys = visibleRows.map(getRowKey);
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.includes(key));
  const someVisibleSelected =
    visibleKeys.some((key) => selectedKeys.includes(key)) && !allVisibleSelected;

  const handleSelectAllVisible = (event) => {
    if (event.target.checked) {
      onSelectionChange([...new Set([...selectedKeys, ...visibleKeys])]);
    } else {
      onSelectionChange(selectedKeys.filter((key) => !visibleKeys.includes(key)));
    }
  };

  const handleToggleRow = (key) => {
    if (selectedKeys.includes(key)) {
      onSelectionChange(selectedKeys.filter((item) => item !== key));
    } else {
      onSelectionChange([...selectedKeys, key]);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (safeRows.length === 0) {
    return <Alert severity="success">{emptyMessage}</Alert>;
  }

  return (
    <Paper elevation={1} sx={{ overflow: "hidden" }}>
      {/* overflowX: auto -> จอเล็กเลื่อนตารางแนวนอนได้ */}
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={handleSelectAllVisible}
                    sx={{ color: "white", "&.Mui-checked": { color: "white" } }}
                  />
                </TableCell>
              )}

              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || "left"}
                  sx={{ whiteSpace: "nowrap", minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {visibleRows.map((row) => {
              const key = getRowKey(row);
              return (
                <TableRow key={key} hover selected={selectedKeys.includes(key)}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedKeys.includes(key)}
                        onChange={() => handleToggleRow(key)}
                      />
                    </TableCell>
                  )}

                  {columns.map((column) => (
                    <TableCell key={column.id} align={column.align || "left"}>
                      {column.render ? column.render(row) : String(row[column.id] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ---------------- Pagination ---------------- */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          px: 2,
          py: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            แสดงต่อหน้า
          </Typography>
          <Select value={effectiveRowsPerPage} onChange={handleRowsPerPageChange} size="small">
            {ROWS_PER_PAGE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
          <Typography variant="body2" color="text.secondary">
            ทั้งหมด {totalRows} รายการ
          </Typography>
        </Box>

        <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} shape="rounded" />
      </Box>
    </Paper>
  );
}

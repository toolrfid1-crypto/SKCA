/**
 * PatrolSection.jsx -- ตาราง "Patrol Document Waiting Approve"
 *
 * ความสามารถ:
 *   - กด Approve ทีละใบ
 *   - ติ๊ก checkbox แล้ว Approve หลายใบพร้อมกัน (เฉพาะผู้มีสิทธิ์)
 *   - เปิดดูไฟล์ PDF
 */

import { useState } from "react";
import { Button } from "@mui/material";
import DoneAllIcon from "@mui/icons-material/DoneAll";

import ConfirmDialog from "../../components/ConfirmDialog";
import DataTable from "../../components/DataTable";
import SectionCard from "./SectionCard";
import { ApproveButton, PositionChip, StatusChip, ViewPdfButton } from "../../components/ActionButtons";
import { documentsApi, openPdf } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useConfirmAction } from "../../hooks/useConfirmAction";
import { usePermissions } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";

export default function PatrolSection() {
  const { canSelectAll } = usePermissions();
  const notify = useSnackbar();

  const { data, loading, error, reload } = useAsyncData(documentsApi.listPatrol, []);
  const [selectedIds, setSelectedIds] = useState([]);

  // หลัง approve สำเร็จ ให้ล้าง selection แล้วโหลดตารางใหม่
  const confirmAction = useConfirmAction(async () => {
    setSelectedIds([]);
    await reload();
  });

  const docs = data ?? [];

  const handleOpenPdf = async (path) => {
    try {
      await openPdf(path);
    } catch (err) {
      notify.error(err.message);
    }
  };

  /* กด Approve แบบเดียวๆ */
  const handleApproveOne = (doc) => {
    confirmAction.ask({
      title: "ยืนยันการอนุมัติ",
      message: `ต้องการอนุมัติเอกสาร "${doc.title}" ในตำแหน่ง ${doc.can_approve_column} หรือไม่?`,
      variant: "approve",
      confirmLabel: "อนุมัติ",
      successMessage: "อนุมัติเรียบร้อย",
      run: () => documentsApi.approvePatrol(doc.title, doc.can_approve_column),
    });
  };

  /* กด Approve แบบ Select */
  const handleApproveSelected = () => {
    const selectedDocs = docs.filter((doc) => selectedIds.includes(doc.id));

    confirmAction.ask({
      title: "ยืนยันการอนุมัติหลายรายการ",
      message: `ต้องการอนุมัติเอกสารทั้งหมด ${selectedDocs.length} รายการหรือไม่?`,
      variant: "approve",
      confirmLabel: `อนุมัติ ${selectedDocs.length} รายการ`,
      successMessage: `อนุมัติเรียบร้อย ${selectedDocs.length} รายการ`,
      run: () =>
        documentsApi.approveManyPatrol(
          selectedDocs.map((doc) => ({
            document: doc.title,
            column: doc.can_approve_column,
          })),
        ),
    });
  };

  const columns = [
    { id: "title", label: "Document", minWidth: 240 },
    {
      id: "pdf",
      label: "PDF",
      align: "center",
      render: (row) => (
        <ViewPdfButton disabled={!row.pdf_path} onClick={() => handleOpenPdf(row.pdf_path)} />
      ),
    },
    { id: "line", label: "Line", align: "center" },
    { id: "zone", label: "Zone", align: "center" },
    {
      id: "status",
      label: "Status",
      align: "center",
      render: (row) => <StatusChip value={row.status} />,
    },
    {
      id: "can_approve_column",
      label: "Position",
      align: "center",
      render: (row) => <PositionChip value={row.can_approve_column} />,
    },
    // ปุ่ม Action อยู่ขวาสุดเสมอ (คู่มือหัวข้อ 12)
    {
      id: "action",
      label: "Action",
      align: "right",
      render: (row) => <ApproveButton onClick={() => handleApproveOne(row)} />,
    },
  ];

  return (
    <SectionCard
      title="Patrol Document Waiting Approve"
      count={docs.length}
      actions={
        canSelectAll && selectedIds.length > 0 ? (
          <Button startIcon={<DoneAllIcon />} onClick={handleApproveSelected}>
            อนุมัติที่เลือก ({selectedIds.length})
          </Button>
        ) : null
      }
    >
      <DataTable
        columns={columns}
        rows={docs}
        getRowKey={(row) => row.id}
        loading={loading}
        error={error}
        emptyMessage="ไม่มีเอกสาร Patrol ที่ต้อง Approve"
        selectable={canSelectAll}
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <ConfirmDialog {...confirmAction.dialogProps} />
    </SectionCard>
  );
}

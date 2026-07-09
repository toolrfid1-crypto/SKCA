/**
 * EditCheckSheetSection.jsx -- ตาราง "Edit Patrol Check Sheet Approve"
 *
 * ข้อมูลตารางนี้มาจาก sheet "EditCheckSheet" ในไฟล์ DataWebapp.xlsx
 * (ไม่ใช่ SQL) การกด Approve/Reject จะไปเขียนทับช่องใน Excel โดยตรง
 */

import { Stack } from "@mui/material";

import ConfirmDialog from "../../components/ConfirmDialog";
import DataTable from "../../components/DataTable";
import SectionCard from "./SectionCard";
import {
  ApproveButton,
  PositionChip,
  RejectButton,
  ViewPdfButton,
} from "../../components/ActionButtons";
import { editSheetsApi, openPdf } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useConfirmAction } from "../../hooks/useConfirmAction";
import { useSnackbar } from "../../context/SnackbarContext";

export default function EditCheckSheetSection() {
  const notify = useSnackbar();

  const { data, loading, error, reload } = useAsyncData(editSheetsApi.listPatrol, []);
  const confirmAction = useConfirmAction(reload);

  const docs = data ?? [];

  const handleOpenPdf = async (path) => {
    try {
      await openPdf(path);
    } catch (err) {
      notify.error(err.message);
    }
  };

  /** ใช้ร่วมกันทั้งปุ่ม Approve และ Reject -- ต่างกันแค่ข้อความและสี */
  const handleAction = (doc, action) => {
    const isApprove = action === "approve";

    confirmAction.ask({
      title: isApprove ? "ยืนยันการอนุมัติ" : "ยืนยันการปฏิเสธ",
      message: `ต้องการ${isApprove ? "อนุมัติ" : "ปฏิเสธ"}รายการที่ ${doc.no} (${doc.file_name}) หรือไม่?`,
      variant: isApprove ? "approve" : "reject",
      confirmLabel: isApprove ? "อนุมัติ" : "ปฏิเสธ",
      successMessage: isApprove ? "อนุมัติเรียบร้อย" : "ปฏิเสธเรียบร้อย",
      run: () => editSheetsApi.actionPatrol(doc.no, action, doc.can_approve_column),
    });
  };

  const columns = [
    { id: "no", label: "No", align: "center" },
    { id: "file_name", label: "File Name", minWidth: 200 },
    {
      id: "before_path",
      label: "Before",
      align: "center",
      render: (row) => (
        <ViewPdfButton
          disabled={!row.before_path}
          title="เปิดไฟล์ก่อนแก้ไข"
          onClick={() => handleOpenPdf(row.before_path)}
        />
      ),
    },
    {
      id: "after_path",
      label: "After",
      align: "center",
      render: (row) => (
        <ViewPdfButton
          disabled={!row.after_path}
          title="เปิดไฟล์หลังแก้ไข"
          onClick={() => handleOpenPdf(row.after_path)}
        />
      ),
    },
    { id: "line", label: "Line", align: "center" },
    { id: "model", label: "Model", align: "center" },
    {
      id: "can_approve_column",
      label: "Position",
      align: "center",
      render: (row) => <PositionChip value={row.can_approve_column} />,
    },
    {
      id: "action",
      label: "Action",
      align: "right",
      minWidth: 220,
      render: (row) => (
        // Primary (Approve) ซ้าย, Secondary (Reject) ขวา -- คู่มือหัวข้อ 2
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <ApproveButton onClick={() => handleAction(row, "approve")} />
          <RejectButton onClick={() => handleAction(row, "reject")} />
        </Stack>
      ),
    },
  ];

  return (
    <SectionCard title="Edit Patrol Check Sheet Approve" count={docs.length}>
      <DataTable
        columns={columns}
        rows={docs}
        getRowKey={(row) => row.no}
        loading={loading}
        error={error}
        emptyMessage="ไม่มีรายการขอแก้ไข Check Sheet ที่ต้อง Approve"
      />

      <ConfirmDialog {...confirmAction.dialogProps} />
    </SectionCard>
  );
}

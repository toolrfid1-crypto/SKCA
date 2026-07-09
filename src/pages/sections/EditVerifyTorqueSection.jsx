/**
 * EditVerifyTorqueSection.jsx -- ตาราง "Edit Verify Torque Tool Approve"
 *
 * รายการขอแก้ไขข้อมูลเครื่องมือวัดแรงบิด อนุมัติหรือปฏิเสธก็ได้
 * ค่าที่เขียนลง SQL คือคำว่า approve / reject ตรง ๆ
 */

import { Stack, Tooltip, Typography } from "@mui/material";

import ConfirmDialog from "../../components/ConfirmDialog";
import DataTable from "../../components/DataTable";
import SectionCard from "./SectionCard";
import { ApproveButton, PositionChip, RejectButton } from "../../components/ActionButtons";
import { editSheetsApi } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useConfirmAction } from "../../hooks/useConfirmAction";

/** ข้อความยาว ๆ ให้ตัดท้ายด้วย ... แล้วโชว์เต็มตอน hover */
function TruncatedText({ value, maxWidth = 220 }) {
  if (!value) return "-";

  return (
    <Tooltip title={value}>
      <Typography
        variant="body2"
        sx={{
          maxWidth,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
    </Tooltip>
  );
}

export default function EditVerifyTorqueSection() {
  const { data, loading, error, reload } = useAsyncData(editSheetsApi.listVerifyTorque, []);
  const confirmAction = useConfirmAction(reload);

  const docs = data ?? [];

  const handleAction = (doc, action) => {
    const isApprove = action === "approve";

    confirmAction.ask({
      title: isApprove ? "ยืนยันการอนุมัติ" : "ยืนยันการปฏิเสธ",
      message: `ต้องการ${isApprove ? "อนุมัติ" : "ปฏิเสธ"}การแก้ไขเครื่องมือ "${doc.register_number}" หรือไม่?`,
      variant: isApprove ? "approve" : "reject",
      confirmLabel: isApprove ? "อนุมัติ" : "ปฏิเสธ",
      successMessage: isApprove ? "อนุมัติเรียบร้อย" : "ปฏิเสธเรียบร้อย",
      run: () => editSheetsApi.actionVerifyTorque(doc.register_number, doc.can_approve_column, action),
    });
  };

  const columns = [
    { id: "register_number", label: "Register No.", minWidth: 140 },
    { id: "process", label: "Process", align: "center" },
    { id: "line", label: "Line", align: "center" },
    { id: "cost_center", label: "CostCenter", align: "center" },
    {
      id: "detail_change",
      label: "Detail Change",
      render: (row) => <TruncatedText value={row.detail_change} />,
    },
    {
      id: "reason",
      label: "Reason",
      render: (row) => <TruncatedText value={row.reason} maxWidth={180} />,
    },
    { id: "editor", label: "Editor", align: "center" },
    { id: "datetime", label: "Datetime", align: "center", minWidth: 140 },
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
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <ApproveButton onClick={() => handleAction(row, "approve")} />
          <RejectButton onClick={() => handleAction(row, "reject")} />
        </Stack>
      ),
    },
  ];

  return (
    <SectionCard title="Edit Verify Torque Tool Approve" count={docs.length}>
      <DataTable
        columns={columns}
        rows={docs}
        getRowKey={(row) => row.register_number}
        loading={loading}
        error={error}
        emptyMessage="ไม่มีรายการขอแก้ไขเครื่องมือที่ต้อง Approve"
      />

      <ConfirmDialog {...confirmAction.dialogProps} />
    </SectionCard>
  );
}

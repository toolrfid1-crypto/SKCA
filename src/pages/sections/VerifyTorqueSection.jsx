/**
 * VerifyTorqueSection.jsx -- ตาราง "Verify Torque Document Waiting Approve"
 *
 * ลำดับอนุมัติ: FM -> Asst ของ Zone นั้น ๆ (มีแค่ Approve ไม่มี Reject)
 */

import ConfirmDialog from "../../components/ConfirmDialog";
import DataTable from "../../components/DataTable";
import SectionCard from "./SectionCard";
import { ApproveButton, PositionChip, StatusChip, ViewPdfButton } from "../../components/ActionButtons";
import { documentsApi, openPdf } from "../../api/client";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useConfirmAction } from "../../hooks/useConfirmAction";
import { useSnackbar } from "../../context/SnackbarContext";
import { oneUxColors } from "../../styles/globaltheme";

export default function VerifyTorqueSection() {
  const notify = useSnackbar();
  const { data, loading, error, reload } = useAsyncData(documentsApi.listVerifyTorque, []);
  const confirmAction = useConfirmAction(reload);

  const docs = data ?? [];

  const handleOpenPdf = async (path) => {
    try {
      await openPdf(path);
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleApprove = (doc) => {
    confirmAction.ask({
      title: "ยืนยันการอนุมัติ",
      message: `ต้องการอนุมัติเอกสาร "${doc.file_name}" ในตำแหน่ง ${doc.can_approve_column} หรือไม่?`,
      variant: "approve",
      confirmLabel: "อนุมัติ",
      successMessage: "อนุมัติเรียบร้อย",
      run: () => documentsApi.approveVerifyTorque(doc.file_name, doc.can_approve_column),
    });
  };

  const columns = [
    { id: "file_name", label: "File Name", minWidth: 220 },
    {
      id: "pdf",
      label: "PDF",
      align: "center",
      render: (row) => (
        <ViewPdfButton disabled={!row.file_path} onClick={() => handleOpenPdf(row.file_path)} />
      ),
    },
    { id: "month", label: "Month", align: "center" },
    { id: "year", label: "Year", align: "center" },
    { id: "period", label: "Period", align: "center" },
    { id: "line", label: "Line", align: "center" },
    { id: "cost_center", label: "CostCenter", align: "center" },
    { id: "total_tool", label: "Total", align: "center" },
    { id: "checking", label: "Checked", align: "center" },
    { id: "unchecking", label: "Unchecked", align: "center" },
    {
      id: "ng",
      label: "NG",
      align: "center",
      // เน้นสีแดงเมื่อมี NG มากกว่า 0
      render: (row) => (
        <span style={{ color: row.ng > 0 ? oneUxColors.reject : "inherit", fontWeight: row.ng > 0 ? 600 : 400 }}>
          {row.ng}
        </span>
      ),
    },
    {
      id: "status_checking",
      label: "Checking",
      align: "center",
      render: (row) => <StatusChip value={row.status_checking} />,
    },
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
      render: (row) => <ApproveButton onClick={() => handleApprove(row)} />,
    },
  ];

  return (
    <SectionCard title="Verify Torque Document Waiting Approve" count={docs.length}>
      <DataTable
        columns={columns}
        rows={docs}
        getRowKey={(row) => row.file_name}
        loading={loading}
        error={error}
        emptyMessage="ไม่มีเอกสาร Verify Torque ที่ต้อง Approve"
      />

      <ConfirmDialog {...confirmAction.dialogProps} />
    </SectionCard>
  );
}

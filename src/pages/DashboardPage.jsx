/**
 * DashboardPage.jsx -- หน้าหลัก รวม 4 ตารางที่รออนุมัติ
 *
 * เทียบกับของเดิม: route "/" ที่ render CONTENT_TEMPLATE
 *
 * แต่ละ Section โหลดข้อมูลของตัวเอง (เรียก API แยกกัน)
 * ข้อดี: ถ้าตารางหนึ่งพัง อีกสามตารางยังใช้งานได้ตามปกติ
 */

import PageHeader from "../components/PageHeader";
import EditCheckSheetSection from "./sections/EditCheckSheetSection";
import EditVerifyTorqueSection from "./sections/EditVerifyTorqueSection";
import PatrolSection from "./sections/PatrolSection";
import VerifyTorqueSection from "./sections/VerifyTorqueSection";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="รายการรออนุมัติ" />

      <PatrolSection />
      <EditCheckSheetSection />
      <VerifyTorqueSection />
      <EditVerifyTorqueSection />
    </>
  );
}

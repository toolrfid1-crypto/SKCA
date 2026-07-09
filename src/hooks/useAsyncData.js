/**
 * useAsyncData.js -- hook สำหรับโหลดข้อมูลจาก API
 *
 * แก้ปัญหาที่เขียนซ้ำ ๆ ทุกหน้า: loading / error / reload
 *
 * วิธีใช้:
 *   const { data, loading, error, reload } = useAsyncData(documentsApi.listPatrol, []);
 */

import { useCallback, useEffect, useState } from "react";

export function useAsyncData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * isActive บอกว่ายัง "ควรเขียนค่าลง state" อยู่ไหม
   *
   * ตอนโหลดครั้งแรก useEffect จะส่งตัวเช็คมาให้ กันไม่ให้ setState หลัง component
   * ถูก unmount ไปแล้ว (ผู้ใช้เปลี่ยนหน้าก่อน API ตอบกลับ)
   * ส่วน reload() ไม่ต้องส่งอะไรมา เพราะผู้ใช้กดปุ่มอยู่หน้าเดิมแน่ ๆ
   */
  const load = useCallback(async (isActive = () => true) => {
    setLoading(true);
    setError(null);
    try {
      // fetcher รับมาจาก Section หลัก เช่น fetcher = documentsApi.listPatrol
      const result = await fetcher();
      if (isActive()) setData(result);
    } catch (err) {
      if (isActive()) setError(err.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      if (isActive()) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // ทำงาน หลัง React วาดจอเสร็จเท่านั้น จึงไม่บล็อกการแสดงผล
  useEffect(() => {
    let cancelled = false;
    load(() => !cancelled);

    return () => {
      cancelled = true;
    };
  }, [load]);

  // ห่อให้ไม่รับอาร์กิวเมนต์ กันเคส onClick={reload} ที่ React จะยัด event object มาเป็น isActive
  const reload = useCallback(() => load(), [load]);

  return { data, loading, error, reload, setData };
}

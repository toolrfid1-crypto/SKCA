/**
 * AuthContext.jsx -- เก็บสถานะ "ใครกำลังล็อกอินอยู่" ให้ทุกหน้าเรียกใช้ได้
 *
 * React Context = ตัวแปรกลางที่ส่งค่าลงไปให้ component ลูกทุกตัว
 * โดยไม่ต้องส่ง props ไล่ทีละชั้น
 *
 * วิธีใช้ในหน้าอื่น:
 *   const { user, logout } = useAuth();
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi, setUnauthorizedHandler, tokenStorage } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading = true ระหว่างเช็ค token ตอนเปิดเว็บครั้งแรก
  const [loading, setLoading] = useState(true);

  // ตอนเปิดเว็บ: ถ้ามี token เก่าอยู่ ลองถาม backend ว่ายังใช้ได้ไหม
  useEffect(() => {
    async function restoreSession() {
      if (!tokenStorage.get()) {
        setLoading(false);
        return;
      }
      try {
        setUser(await authApi.me());
      } catch {
        tokenStorage.clear(); // token หมดอายุ หรือ user ถูกลบไปแล้ว
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // บอก api client ว่าถ้าเจอ 401 ระหว่างใช้งาน ให้เคลียร์ user ทิ้ง
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),

      async login(email, password = "") {
        const data = await authApi.login(email, password);
        tokenStorage.set(data.access_token);
        setUser(data.user);
        return data.user;
      },

      logout() {
        tokenStorage.clear();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth ต้องถูกเรียกใช้ภายใน <AuthProvider> เท่านั้น");
  }
  return context;
}

/**
 * สิทธิ์ที่คำนวณจากข้อมูล user
 * (ตรงกับตัวแปร can_see_edit_table / can_select_all ของโค้ด Flask เดิม)
 */
export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return { isAdmin: false, canSeeEditTable: false, canSelectAll: false };

    const editRoles = ["LD FI", "FM FI", "Asst-FinalB"];
    const canSeeEditTable =
      user.is_admin || editRoles.some((role) => user.lines.includes(role));

    return {
      isAdmin: user.is_admin,
      canSeeEditTable,
      canSelectAll: canSeeEditTable, // เลือกหลายรายการพร้อมกันได้เฉพาะกลุ่มนี้
    };
  }, [user]);
}

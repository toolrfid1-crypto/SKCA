/**
 * client.js -- ตัวกลางในการคุยกับ Backend
 *
 * ไฟล์นี้มีสองส่วน:
 *   ส่วนบน  = กลไกส่ง request (fetch + token + error)
 *   ส่วนล่าง = รายการ path ของ API ทุกตัว (ดูหัวข้อ "รายการ API" ท้ายไฟล์)
 *
 * ทุก request จะผ่านฟังก์ชัน request() ตัวเดียว เพื่อให้:
 *   1. แนบ token ให้อัตโนมัติ
 *   2. แปลง error ของ FastAPI ({"detail": "..."}) ให้เป็น Error object เดียวกันหมด
 *   3. ถ้าเจอ 401 (token หมดอายุ) ให้เตะกลับหน้า login
 */

// ตอน dev ค่านี้ว่าง -> เรียก /api/... ผ่าน proxy ของ Vite
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const TOKEN_KEY = "ltr_access_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Error ที่มี status code ติดมาด้วย เพื่อให้หน้าเว็บเลือกแสดงข้อความได้ถูก */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** ให้ AuthContext มาลงทะเบียนไว้ ว่าจะทำอะไรเมื่อ token หมดอายุ */
let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function buildUrl(path, params) {
  const url = new URL(BASE_URL + path, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => {
    // ข้ามค่าว่าง จะได้ไม่ส่ง ?line= ไปเปล่า ๆ
    if (value !== "" && value !== null && value !== undefined) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function request(path, { method = "GET", body, params } = {}) {
  const token = tokenStorage.get();

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    tokenStorage.clear();
    onUnauthorized();
    throw new ApiError("กรุณาเข้าสู่ระบบใหม่", 401);
  }

  if (!response.ok) {
    // FastAPI ส่ง error กลับมาในรูป {"detail": "ข้อความ"}
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(payload.detail || `เกิดข้อผิดพลาด (${response.status})`, response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
};

/**
 * เปิดไฟล์ PDF ในแท็บใหม่
 *
 * ทำไมไม่ใช้ window.open ตรง ๆ?
 *   เพราะ endpoint ต้องการ header Authorization ซึ่ง window.open แนบให้ไม่ได้
 *   เลยต้อง fetch มาเป็น blob ก่อน แล้วสร้าง URL ชั่วคราวให้เบราว์เซอร์เปิด
 */
export async function openPdf(path) {
  const token = tokenStorage.get();
  const response = await fetch(buildUrl("/api/files/pdf", { path }), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(payload.detail || "เปิดไฟล์ PDF ไม่ได้", response.status);
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  window.open(blobUrl, "_blank", "noopener");

  // คืนหน่วยความจำหลังเบราว์เซอร์โหลดไฟล์เสร็จ
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/* ============================================================
 * รายการ API -- รวม path ทุกตัวไว้ที่เดียว
 *
 * ทำแบบนี้เพื่อไม่ให้มีสตริง "/api/documents/patrol" กระจายอยู่ตามหน้าต่าง ๆ
 * เวลา backend เปลี่ยน path ก็มาแก้ที่นี่ที่เดียว
 * ============================================================ */

export const authApi = {
  // ถามก่อนว่าหน้า login ต้องมีช่องรหัสผ่านไหม (ไม่ต้องแนบ token)
  config: () => api.get("/api/auth/config"),

  // เข้าสู่ระบบด้วยอีเมล -- password ส่งไปก็ต่อเมื่อ require_password = true
  login: (email, password = "") => api.post("/api/auth/login", { email, password }),

  me: () => api.get("/api/auth/me"),
};

export const documentsApi = {
  listPatrol: () => api.get("/api/documents/patrol"),
  approvePatrol: (document, column) =>
    api.post("/api/documents/patrol/approve", { document, column }),
  approveManyPatrol: (docs) =>
    api.post("/api/documents/patrol/approve-multiple", { docs }),

  listVerifyTorque: () => api.get("/api/documents/verify-torque"),
  approveVerifyTorque: (document, column) =>
    api.post("/api/documents/verify-torque/approve", { document, column }),
};

export const editSheetsApi = {
  listPatrol: () => api.get("/api/edit-sheets/patrol"),
  actionPatrol: (no, action, column) =>
    api.post(`/api/edit-sheets/patrol/${no}/action`, { action, column }),

  listVerifyTorque: () => api.get("/api/edit-sheets/verify-torque"),
  actionVerifyTorque: (toolId, column, action) =>
    api.post("/api/edit-sheets/verify-torque/action", {
      tool_id: toolId,
      column,
      action,
    }),
};

export const settingsApi = {
  get: () => api.get("/api/settings"),
  update: (payload) => api.put("/api/settings", payload),
  links: () => api.get("/api/settings/links"),
};

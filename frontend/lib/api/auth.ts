import { api, type ApiEnvelope } from "./client";

export type AuthRole = "CUSTOMER" | "SELLER" | "DELIVERY_PARTNER" | "ADMIN" | "SUPER_ADMIN";

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user_id: number;
  role: AuthRole;
  phone: string;
  name?: string | null;
  is_new_user: boolean;
};

export type CustomerRegisterData = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
};

export type SellerRegisterData = {
  name: string;
  phone: string;
  email?: string;
  business_name: string;
  business_address?: string;
  city?: string;
  pincode?: string;
  gst_number?: string;
  description?: string;
};

export type DeliveryPartnerRegisterData = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  vehicle_type?: string;
  vehicle_number?: string;
};

// ── UNIFIED MOBILE-ONLY LOGIN ──────────────────────────────────────────────
export async function sendLoginOtp(phone: string) {
  const { data } = await api.post<ApiEnvelope<{ phone: string; message: string; dev_otp?: string }>>(
    "/auth/send-otp",
    { phone }
  );
  return data.data;
}

export async function verifyLoginOtp(phone: string, otp: string) {
  const { data } = await api.post<ApiEnvelope<TokenResponse>>(
    "/auth/verify-otp",
    { phone, otp }
  );
  return data.data;
}

// ── ROLE-BASED REGISTRATION ─────────────────────────────────────────────────
export async function registerCustomer(payload: CustomerRegisterData) {
  const { data } = await api.post<ApiEnvelope<{ message: string; user_id: number; role: string }>>(
    "/auth/register/customer",
    payload
  );
  return data.data;
}

export async function registerSeller(payload: SellerRegisterData) {
  const { data } = await api.post<ApiEnvelope<{ message: string; user_id: number; role: string }>>(
    "/auth/register/seller",
    payload
  );
  return data.data;
}

export async function registerDeliveryPartner(payload: DeliveryPartnerRegisterData) {
  const { data } = await api.post<ApiEnvelope<{ message: string; user_id: number; role: string }>>(
    "/auth/register/delivery-partner",
    payload
  );
  return data.data;
}

export type UnifiedRegisterData = {
  name: string;
  phone: string;
  password: string;
  role: AuthRole;
  email?: string;
  city?: string;
  pincode?: string;
  address?: string;
  business_name?: string;
  vehicle_type?: string;
  vehicle_number?: string;
};

// ── UNIFIED PASSWORD AUTHENTICATION ─────────────────────────────────────────
export async function loginWithPassword(phone: string, password: string, role?: AuthRole) {
  const { data } = await api.post<ApiEnvelope<TokenResponse>>(
    "/auth/login",
    { phone, password, role }
  );
  return data.data;
}

export async function registerUser(payload: UnifiedRegisterData) {
  const { data } = await api.post<ApiEnvelope<{ message: string; user_id: number; role: string }>>(
    "/auth/register",
    payload
  );
  return data.data;
}

// ── LEGACY PORTAL-SPECIFIC CALLS (Backward Compatibility) ───────────────────
export async function sendOtp(role: "customer" | "seller" | "delivery" | "admin", phone: string) {
  const { data } = await api.post<ApiEnvelope<{ phone: string; message: string }>>(`/auth/${role}/send-otp`, { phone });
  return data.data;
}

export async function verifyOtp(role: "customer" | "seller" | "delivery" | "admin", phone: string, otp: string, name?: string) {
  const { data } = await api.post<ApiEnvelope<TokenResponse>>(`/auth/${role}/verify-otp`, { phone, otp, name: name || undefined });
  return data.data;
}

// ── SESSION MANAGEMENT (DUAL STORAGE: localStorage + sessionStorage) ────────
export function saveSession(session: TokenResponse) {
  if (typeof window === "undefined") return;
  const items: Record<string, string> = {
    "vegito.access-token": session.access_token,
    "vegito.user-role": session.role,
    "vegito.user-name": session.name ?? "",
    "vegito.user-id": String(session.user_id),
    "vegito.user-phone": session.phone ?? "",
  };
  Object.entries(items).forEach(([k, v]) => {
    localStorage.setItem(k, v);
    sessionStorage.setItem(k, v);
  });
}

export function getStoredRole(): AuthRole | null {
  if (typeof window === "undefined") return null;
  const role = localStorage.getItem("vegito.user-role") || sessionStorage.getItem("vegito.user-role");
  return role && ["CUSTOMER", "SELLER", "DELIVERY_PARTNER", "ADMIN", "SUPER_ADMIN"].includes(role)
    ? (role as AuthRole)
    : null;
}

export function getStoredUserName(): string {
  if (typeof window === "undefined") return "Customer";
  return localStorage.getItem("vegito.user-name") || sessionStorage.getItem("vegito.user-name") || "Customer";
}

export function setStoredUserName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("vegito.user-name", name);
  sessionStorage.setItem("vegito.user-name", name);
}

export function getStoredPhone(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("vegito.user-phone") || sessionStorage.getItem("vegito.user-phone") || "";
}

export function clearSession() {
  if (typeof window === "undefined") return;
  const keys = [
    "vegito.access-token",
    "vegito.user-role",
    "vegito.user-name",
    "vegito.user-id",
    "vegito.user-phone",
  ];
  keys.forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vegito.access-token") || sessionStorage.getItem("vegito.access-token");
}

export const getStoredToken = getAuthToken;

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!(localStorage.getItem("vegito.access-token") || sessionStorage.getItem("vegito.access-token"));
}

export function getRoleRedirectPath(role: AuthRole | null): string {
  switch (role) {
    case "CUSTOMER":
      return "/customer";
    case "SELLER":
      return "/seller";
    case "DELIVERY_PARTNER":
      return "/delivery";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    default:
      return "/";
  }
}


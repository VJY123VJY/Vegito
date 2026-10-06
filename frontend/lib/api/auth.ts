import { api, type ApiEnvelope } from "./client";
import { Capacitor } from "@capacitor/core";

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
  authorized_roles?: AuthRole[];
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
  const maskedPhone = phone.length > 4 ? `${"•".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}` : "[masked]";
  // Safe diagnostics are useful in the debug APK as well as the dev server;
  // no credentials, OTP, JWT, or complete phone number are ever logged.
  const diagnostics = Capacitor.isNativePlatform() || process.env.NODE_ENV !== "production";
  if (diagnostics) {
    console.info("[VEGITO AUTH] Continue pressed");
    console.info("[VEGITO AUTH] Phone:", maskedPhone);
    const endpoint = `${api.defaults.baseURL ?? ""}/auth/send-otp`;
    console.info("[VEGITO AUTH] Platform:", Capacitor.isNativePlatform() ? "native" : "web");
    console.info("[VEGITO AUTH] API Base URL:", api.defaults.baseURL);
    console.info("[VEGITO AUTH] Send OTP URL:", endpoint);
    console.info("[VEGITO AUTH] API function called");
    console.info("[VEGITO AUTH] Sending OTP request");
  }
  try {
    console.info("[VEGITO AUTH] Request started");
    const response = await api.post<ApiEnvelope<{ phone: string; message: string; dev_otp?: string }>>(
      "/auth/send-otp",
      { phone }
    );
    if (diagnostics) {
      console.info("[VEGITO AUTH] OTP request successful");
      console.info("[VEGITO AUTH] Status:", response.status);
      console.info("[VEGITO AUTH] Response body received (sensitive values omitted)");
    }
    return response.data.data;
  } catch (error: any) {
    if (diagnostics) {
      console.error("[VEGITO AUTH] OTP request failed");
      console.error("[VEGITO AUTH] Error:", error?.message ?? "Unknown error");
      console.error("[VEGITO AUTH] Code:", error?.code ?? "none");
      console.error("[VEGITO AUTH] Response:", error?.response ? {
        status: error.response.status,
        data: { message: error.response.data?.message, error: error.response.data?.error },
      } : "no HTTP response");
    }
    throw error;
  }
}

export async function verifyLoginOtp(phone: string, otp: string, role?: string) {
  const { data } = await api.post<ApiEnvelope<TokenResponse>>(
    "/auth/verify-otp",
    { phone, otp, role: role || undefined }
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
  // Send only fields supported by the selected role. Empty seller/delivery
  // fields were previously included by some clients and obscured validation
  // errors even though CUSTOMER registration does not use them.
  const cleanPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ) as UnifiedRegisterData;
  try {
    const { data } = await api.post<ApiEnvelope<{ message: string; user_id: number; role: string }>>(
      "/auth/register",
      cleanPayload
    );
    return data.data;
  } catch (error: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[VEGITO REGISTER] failed", {
        status: error?.response?.status,
        response: error?.response?.data,
      });
    }
    throw error;
  }
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

// ── CURRENT AUTHENTICATED USER VERIFICATION (/auth/me) ──────────────────────
export async function getMe(): Promise<any | null> {
  const token = getAuthToken();
  if (!token) {
    clearSession();
    return null;
  }
  try {
    const { data } = await api.get<ApiEnvelope<any>>("/auth/me");
    if (data?.data) {
      const user = data.data;
      if (user.name) setStoredUserName(user.name);
      return user;
    }
    return null;
  } catch (err: any) {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      clearSession();
    }
    return null;
  }
}

// ── SESSION MANAGEMENT (DUAL STORAGE: localStorage + sessionStorage) ────────
export function saveSession(session: TokenResponse) {
  if (typeof window === "undefined") return;
  const authRoles = session.authorized_roles && session.authorized_roles.length > 0
    ? session.authorized_roles
    : [session.role];

  const items: Record<string, string> = {
    "vegito.access-token": session.access_token,
    "vegito.user-role": session.role,
    "vegito.user-name": session.name ?? "",
    "vegito.user-id": String(session.user_id),
    "vegito.user-phone": session.phone ?? "",
    "vegito.authorized-roles": JSON.stringify(authRoles),
  };
  Object.entries(items).forEach(([k, v]) => {
    localStorage.setItem(k, v);
    sessionStorage.setItem(k, v);
  });
  window.dispatchEvent(
    new CustomEvent("vegito:auth_state_changed", {
      detail: { loggedIn: true, role: session.role, authorized_roles: authRoles },
    })
  );

  if (session.role === "CUSTOMER") {
    import("./cart").then(({ syncGuestCartToBackend }) => {
      syncGuestCartToBackend().catch((err) => {
        console.warn("Auto-sync guest cart notice:", err);
      });
    });
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vegito.access-token") || sessionStorage.getItem("vegito.access-token");
}

export const getStoredToken = getAuthToken;

export function getStoredRole(): AuthRole | null {
  if (typeof window === "undefined") return null;
  const token = getAuthToken();
  if (!token) return null;
  const role = localStorage.getItem("vegito.user-role") || sessionStorage.getItem("vegito.user-role");
  return role && ["CUSTOMER", "SELLER", "DELIVERY_PARTNER", "ADMIN", "SUPER_ADMIN"].includes(role)
    ? (role as AuthRole)
    : null;
}

export function getStoredAuthorizedRoles(): AuthRole[] {
  if (typeof window === "undefined") return [];
  const token = getAuthToken();
  if (!token) return [];
  const stored = localStorage.getItem("vegito.authorized-roles") || sessionStorage.getItem("vegito.authorized-roles");
  if (!stored) {
    const current = getStoredRole();
    return current ? [current] : [];
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const current = getStoredRole();
    return current ? [current] : [];
  }
}

export async function switchWorkspace(targetRole: AuthRole): Promise<TokenResponse> {
  const { data } = await api.post<ApiEnvelope<TokenResponse>>("/auth/switch-workspace", {
    target_role: targetRole,
  });
  if (data?.data) {
    saveSession(data.data);
  }
  return data.data;
}

export async function sendCustomerOtp(phone: string) {
  const { data } = await api.post<ApiEnvelope<{ phone: string; message: string; dev_otp?: string }>>(
    "/auth/customer/send-otp",
    { phone }
  );
  return data.data;
}

export async function verifyCustomerOtp(phone: string, otp: string, name?: string) {
  const { data } = await api.post<ApiEnvelope<TokenResponse>>(
    "/auth/customer/verify-otp",
    { phone, otp, name: name || undefined }
  );
  return data.data;
}

export function getStoredUserName(): string {
  if (typeof window === "undefined") return "";
  const token = getAuthToken();
  if (!token) return "";
  return localStorage.getItem("vegito.user-name") || sessionStorage.getItem("vegito.user-name") || "";
}

export function setStoredUserName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("vegito.user-name", name);
  sessionStorage.setItem("vegito.user-name", name);
}

export function getStoredPhone(): string {
  if (typeof window === "undefined") return "";
  const token = getAuthToken();
  if (!token) return "";
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
    "vegito.authorized-roles",
    "vegito_read_notifications",
    "vegito.customer.location",
    "vegito.selected_location",
    "vegito.saved_address",
    "vegito.smart_location_state",
    "vegito.smart_location_timestamp",
    "vegito.smart_location_accuracy",
    "vegito.location_selected",
  ];
  keys.forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  window.dispatchEvent(new CustomEvent("vegito:auth_state_changed", { detail: { loggedIn: false } }));
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!getAuthToken();
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

import { api, type ApiEnvelope } from "./client";
export type AuthRole = "CUSTOMER" | "SELLER" | "DELIVERY_PARTNER" | "ADMIN" | "SUPER_ADMIN";
export type TokenResponse = { access_token: string; token_type: "bearer"; expires_in: number; user_id: number; role: AuthRole; phone: string; name?: string | null; is_new_user: boolean };
export async function sendOtp(role: "customer" | "seller" | "delivery" | "admin", phone: string) { const { data } = await api.post<ApiEnvelope<{ phone: string; message: string }>>(`/auth/${role}/send-otp`, { phone }); return data.data; }
export async function verifyOtp(role: "customer" | "seller" | "delivery" | "admin", phone: string, otp: string, name?: string) { const { data } = await api.post<ApiEnvelope<TokenResponse>>(`/auth/${role}/verify-otp`, { phone, otp, name: name || undefined }); return data.data; }
export function saveSession(session: TokenResponse) {
  sessionStorage.setItem("vegito.access-token", session.access_token);
  sessionStorage.setItem("vegito.user-role", session.role);
  sessionStorage.setItem("vegito.user-name", session.name ?? "");
  sessionStorage.setItem("vegito.user-id", String(session.user_id));
}
export function getStoredRole(): AuthRole | null {
  if (typeof window === "undefined") return null;
  const role = sessionStorage.getItem("vegito.user-role");
  return role && ["CUSTOMER", "SELLER", "DELIVERY_PARTNER", "ADMIN", "SUPER_ADMIN"].includes(role)
    ? (role as AuthRole)
    : null;
}
export function clearSession() {
  sessionStorage.removeItem("vegito.access-token");
  sessionStorage.removeItem("vegito.user-role");
  sessionStorage.removeItem("vegito.user-name");
  sessionStorage.removeItem("vegito.user-id");
}
export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("vegito.access-token");
}
export function getRoleRedirectPath(role: AuthRole | null) {
  switch (role) {
    case "CUSTOMER":
      return "/customer";
    case "SELLER":
      return "/seller";
    case "DELIVERY_PARTNER":
      return "/delivery";
    case "ADMIN":
      return "/admin";
    case "SUPER_ADMIN":
      return "/super-admin";
    default:
      return "/";
  }
}

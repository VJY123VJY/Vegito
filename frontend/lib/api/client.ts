import axios, { AxiosError } from "axios";
import { Capacitor } from "@capacitor/core";

const webApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
const androidApiUrl = process.env.NEXT_PUBLIC_ANDROID_API_URL;
const apiDebugEnabled = process.env.NEXT_PUBLIC_API_DEBUG === "true";

// Static-exported web assets use the normal web/production URL. Native
// Capacitor builds may opt into a LAN FastAPI URL for local device testing.
// Production Android builds leave NEXT_PUBLIC_ANDROID_API_URL unset and use
// the existing HTTPS NEXT_PUBLIC_API_URL value.
const apiBaseUrl = Capacitor.isNativePlatform() && androidApiUrl ? androidApiUrl : webApiUrl;

/**
 * Returns the correct base API URL for the current platform.
 * Use this instead of process.env.NEXT_PUBLIC_API_URL directly,
 * because on Android (Capacitor) the LAN IP must be used.
 */
export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

if (apiDebugEnabled && typeof window !== "undefined") {
  console.info("[Vegito API] Base URL:", apiBaseUrl);
  console.info("[Vegito API] Platform:", Capacitor.getPlatform());
}

export const api = axios.create({ baseURL: apiBaseUrl, timeout: 10000 });
export type ApiEnvelope<T> = { data: T; message?: string };
export type ApiError = { success: false; error?: { code?: string; message?: string; details?: unknown } };
export type PaginatedResponse<T> = { items: T[]; meta: { total_items: number; page: number; total_pages: number; has_next: boolean } };

export function createRequestId() {
  return `vegito-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createIdempotencyKey(scope: string) {
  return `${scope}-${createRequestId()}`;
}

api.interceptors.request.use((config) => {
  config.headers["X-Request-ID"] = createRequestId();
  if (apiDebugEnabled) {
    console.info("[Vegito API] Request:", config.method?.toUpperCase(), `${config.baseURL ?? ""}${config.url ?? ""}`);
  }
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("vegito.access-token") || window.sessionStorage.getItem("vegito.access-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (apiDebugEnabled) console.info("[Vegito API] Status:", response.status, response.config.url);
    return response;
  },
  (error: AxiosError) => {
    if (apiDebugEnabled) {
      if (error.response) console.info("[Vegito API] Status:", error.response.status, error.config?.url);
      else console.error("[Vegito API] Network error:", error.code ?? "unknown", error.message);
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiError | undefined;
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (error.response?.status === 401) return "Authentication failed. Please log in again.";
    if (error.response?.status === 403) return "Your account is inactive or you don’t have permission.";
    if (error.response?.status === 404) return "Account not found. Please register first.";
    if (error.response?.status === 409) return "This mobile number is already registered. Please login instead.";
    if (error.response?.status === 422) return "Invalid input. Please check the entered details.";
    if (error.response?.status === 429) return "Too many requests. Please wait a moment and try again.";
    if (error.response?.status && error.response.status >= 500) return "Vegito server error. Please try again.";
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "Vegito server request timed out. Check Wi-Fi and backend.";
    if (error.message?.includes("Network Error") || error.code === "ERR_NETWORK") return "Cannot reach Vegito server. Check Wi-Fi and backend.";
    return "We couldn’t complete that request. Please try again.";
  }
  return "Unable to connect to server. Please try again.";
}

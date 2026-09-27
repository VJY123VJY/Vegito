import axios, { AxiosError } from "axios";
import { Capacitor } from "@capacitor/core";

const webApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const androidApiUrl = process.env.NEXT_PUBLIC_ANDROID_API_URL ?? "http://localhost:8000/api/v1";
const apiDebugEnabled = process.env.NEXT_PUBLIC_API_DEBUG === "true";

/**
 * Returns the correct base API URL for the current platform.
 * Allows runtime override via localStorage ("vegito.custom_api_url") for flexible LAN testing.
 * Automatically clears known stale LAN IP values (e.g. 10.41.45.29 / 10.56.190.29).
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const custom = window.localStorage.getItem("vegito.custom_api_url");
      if (custom) {
        if (custom.includes("10.41.45.29") || custom.includes("10.56.190.29")) {
          console.warn("[Vegito API] Purging stale custom API URL override from localStorage:", custom);
          window.localStorage.removeItem("vegito.custom_api_url");
        } else if (custom.trim()) {
          if (apiDebugEnabled) console.info("[Vegito API] Using custom API URL:", custom.trim());
          return custom.trim();
        }
      }
    } catch {
      // Ignore localStorage access restrictions in restricted WebView contexts
    }
  }

  if (Capacitor.isNativePlatform()) {
    return androidApiUrl || "http://localhost:8000/api/v1";
  }
  return webApiUrl || "http://localhost:8000/api/v1";
}

const apiBaseUrl = getApiBaseUrl();

if (apiDebugEnabled && typeof window !== "undefined") {
  console.info("[Vegito API] Initial Base URL:", apiBaseUrl);
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
  // Ensure baseURL is dynamically verified on every request
  const currentBase = getApiBaseUrl();
  config.baseURL = currentBase;
  config.headers["X-Request-ID"] = createRequestId();
  if (apiDebugEnabled) {
    console.info("[Vegito API] Request:", config.method?.toUpperCase(), `${currentBase}${config.url ?? ""}`);
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
    if (error.response?.status && error.response.status >= 500) return "Unable to connect to Vegito server. Please try again later.";
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.message?.includes("Network Error") || error.code === "ERR_NETWORK") {
      return "Unable to connect to Vegito server. Check that your phone and PC are connected to the same Wi-Fi.";
    }
    return "We couldn’t complete that request. Please try again.";
  }
  return "Unable to connect to Vegito server. Check that your phone and PC are connected to the same Wi-Fi.";
}

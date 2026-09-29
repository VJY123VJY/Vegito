import axios, { AxiosError } from "axios";
import { Capacitor } from "@capacitor/core";

const DEFAULT_PROD_API_URL = "https://vegito-git-main-vijaydhavan04-1868s-projects.vercel.app/api/v1";
const DEFAULT_LOCAL_API_URL = "http://localhost:8000/api/v1";

function normalizeApiUrl(url?: string | null): string {
  if (!url) return DEFAULT_LOCAL_API_URL;
  let trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_LOCAL_API_URL;
  if (!trimmed.endsWith("/api/v1")) {
    trimmed = `${trimmed}/api/v1`;
  }
  return trimmed;
}

const rawWebApiUrl = process.env.NEXT_PUBLIC_API_URL;
const rawAndroidApiUrl = process.env.NEXT_PUBLIC_ANDROID_API_URL;
const apiDebugEnabled = process.env.NEXT_PUBLIC_API_DEBUG === "true";

/**
 * Returns the correct base API URL for the current platform.
 * Allows runtime override via localStorage ("vegito.custom_api_url") for flexible LAN testing.
 * Automatically clears known stale LAN IP values or any HTTP/LAN values when running on HTTPS.
 */
export function getApiBaseUrl(): string {
  const isBrowser = typeof window !== "undefined";
  const isHttps = isBrowser && window.location.protocol === "https:";

  if (isBrowser) {
    try {
      const custom = window.localStorage.getItem("vegito.custom_api_url");
      if (custom) {
        const trimmedCustom = custom.trim();
        const isInsecureLocal =
          trimmedCustom.startsWith("http://") ||
          trimmedCustom.includes("localhost") ||
          trimmedCustom.includes("127.0.0.1") ||
          trimmedCustom.includes("10.") ||
          trimmedCustom.includes("192.168.") ||
          trimmedCustom.includes("172.");

        // On HTTPS web (e.g. Vercel), browsers block HTTP requests as Mixed Content,
        // and private LAN IPs cannot be reached over the public internet.
        if (isHttps && isInsecureLocal) {
          console.warn("[Vegito API] Purging insecure/unreachable local API URL override from localStorage on HTTPS:", custom);
          window.localStorage.removeItem("vegito.custom_api_url");
        } else if (trimmedCustom) {
          if (apiDebugEnabled) console.info("[Vegito API] Using custom API URL:", trimmedCustom);
          return normalizeApiUrl(trimmedCustom);
        }
      }
    } catch {
      // Ignore localStorage access restrictions in restricted WebView contexts
    }
  }

  if (Capacitor.isNativePlatform()) {
    const raw = rawAndroidApiUrl || rawWebApiUrl;
    return raw ? normalizeApiUrl(raw) : DEFAULT_LOCAL_API_URL;
  }

  if (rawWebApiUrl) {
    const normalized = normalizeApiUrl(rawWebApiUrl);
    if (isHttps && normalized.startsWith("http://")) {
      return DEFAULT_PROD_API_URL;
    }
    return normalized;
  }

  if (isHttps) {
    return DEFAULT_PROD_API_URL;
  }

  return DEFAULT_LOCAL_API_URL;
}

const apiBaseUrl = getApiBaseUrl();

if (apiDebugEnabled && typeof window !== "undefined") {
  console.info("[Vegito API] Initial Base URL:", apiBaseUrl);
  console.info("[Vegito API] Platform:", Capacitor.getPlatform());
}

export const api = axios.create({ baseURL: apiBaseUrl, timeout: 15000 });
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
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const keys = [
          "vegito.access-token",
          "vegito.user-role",
          "vegito.user-name",
          "vegito.user-id",
          "vegito.user-phone",
          "vegito_read_notifications",
        ];
        keys.forEach((k) => {
          window.localStorage.removeItem(k);
          window.sessionStorage.removeItem(k);
        });
        window.dispatchEvent(new CustomEvent("vegito:auth_state_changed", { detail: { loggedIn: false } }));
      }
    }
    if (apiDebugEnabled) {
      if (error.response) console.info("[Vegito API] Status:", error.response.status, error.config?.url);
      else console.error("[Vegito API] Network error:", error.code ?? "unknown", error.message);
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";

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
      if (isHttps) {
        return "Unable to connect to Vegito server. Please check your internet connection or try again later.";
      }
      return "Unable to connect to Vegito server. Check that your phone and PC are connected to the same Wi-Fi.";
    }
    return "We couldn’t complete that request. Please try again.";
  }
  if (isHttps) {
    return "Unable to connect to Vegito server. Please check your internet connection or try again later.";
  }
  return "Unable to connect to Vegito server. Check that your phone and PC are connected to the same Wi-Fi.";
}

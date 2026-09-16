import axios, { AxiosError } from "axios";
export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1", timeout: 8000 });
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
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("vegito.access-token") || window.sessionStorage.getItem("vegito.access-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiError | undefined;
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (error.response?.status === 401) return "Your session has expired. Please log in again.";
    if (error.response?.status === 403) return "Your account is inactive or you don’t have permission.";
    if (error.response?.status === 404) return "Account not found. Please register first.";
    if (error.response?.status === 409) return "This mobile number is already registered. Please login instead.";
    if (error.response?.status === 422) return "Invalid input. Please check the entered details.";
    if (error.response?.status === 429) return "Too many requests. Please wait a moment and try again.";
    if (error.response?.status && error.response.status >= 500) return "Unable to connect to server. Please try again later.";
    if (error.code === "ECONNABORTED" || (error.message && error.message.includes("Network Error"))) {
      return "Unable to connect to server. Please check if the backend is running.";
    }
    return "We couldn’t complete that request. Please try again.";
  }
  return "Unable to connect to server. Please try again.";
}


import axios, { AxiosError } from "axios";
export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1", timeout: 8000 });
export type ApiEnvelope<T> = { data: T; message?: string };
export type ApiError = { success: false; error?: { code?: string; message?: string; details?: unknown } };

export function createRequestId() {
  return `vegito-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createIdempotencyKey(scope: string) {
  return `${scope}-${createRequestId()}`;
}

api.interceptors.request.use((config) => {
  config.headers["X-Request-ID"] = createRequestId();
  if (typeof window !== "undefined") {
    const token = window.sessionStorage.getItem("vegito.access-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiError | undefined;
    if (error.response?.status === 401) return "Your session has expired. Please log in again.";
    if (error.response?.status === 403) return "You don’t have permission to do that.";
    if (error.response?.status === 429) return "Too many requests. Please wait a moment and try again.";
    const requestId = error.response?.headers?.["x-request-id"];
    if (requestId) return `${payload?.error?.message ?? "We couldn’t complete that request."} (Request ${requestId})`;
    return payload?.error?.message ?? "We couldn’t complete that request. Please try again.";
  }
  return "You’re offline or the service is unavailable. Please try again.";
}

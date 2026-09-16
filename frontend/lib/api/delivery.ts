import { api, type ApiEnvelope } from "./client";

export type DeliveryTask = { id: number; order_id: number; order_number?: string | null; customer_name?: string | null; customer_phone?: string | null; delivery_address?: { address_line1: string; city: string; pincode: string } | null; status: string; notes?: string | null };

export async function listDeliveryTasks(status?: string) {
  const { data } = await api.get<ApiEnvelope<DeliveryTask[]>>("/delivery/tasks", { params: { status: status || undefined } });
  return data.data ?? [];
}

export async function updateDeliveryTask(taskId: number, status: "STARTED" | "FAILED" | "CANCELLED") {
  const { data } = await api.patch<ApiEnvelope<boolean>>(`/delivery/tasks/${taskId}/status`, { status });
  return data.data;
}

export async function completeDelivery(taskId: number, deliveryOtp: string, notes?: string) {
  const { data } = await api.post<ApiEnvelope<boolean>>(`/delivery/tasks/${taskId}/verify-otp`, { delivery_otp: deliveryOtp, notes });
  return data.data;
}

export async function postPartnerGpsLocation(payload: {
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  heading?: number;
  speed_kmh?: number;
}) {
  const { data } = await api.post<ApiEnvelope<any>>("/delivery/location", payload);
  return data.data;
}

export async function getPartnerLocationHistory(partnerId?: number, limit = 50) {
  const { data } = await api.get<ApiEnvelope<any[]>>("/delivery/location/history", {
    params: { partner_id: partnerId, limit },
  });
  return data.data;
}


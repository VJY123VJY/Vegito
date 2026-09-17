import { api, type ApiEnvelope } from "./client";
export * from "./delivery-socket";

export type DeliveryTask = {
  id: number;
  order_id: number;
  order_number?: string | null;
  order_status?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: { address_line1: string; city: string; pincode: string } | null;
  customer_latitude?: number | null;
  customer_longitude?: number | null;
  shop_name?: string | null;
  shop_address?: string | null;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  status: string;
  pickup_otp?: string | null;
  pickup_otp_verified_at?: string | null;
  notes?: string | null;
};

export async function listDeliveryTasks(status?: string) {
  const { data } = await api.get<ApiEnvelope<DeliveryTask[]>>("/delivery/tasks", { params: { status: status || undefined } });
  return data.data ?? [];
}

export async function acceptDeliveryOrder(orderId: number) {
  const { data } = await api.post<ApiEnvelope<boolean>>(`/delivery/orders/${orderId}/accept`);
  return data.data;
}

export async function verifyPickupOtp(orderId: number, otp: string) {
  const { data } = await api.post<ApiEnvelope<{
    message: string;
    order_id: number;
    order_number: string;
    status: string;
    pickup_otp_verified_at?: string | null;
  }>>(`/delivery/orders/${orderId}/verify-pickup-otp`, { otp });
  return data;
}

export async function pickupDeliveryOrder(orderId: number) {
  const { data } = await api.post<ApiEnvelope<boolean>>(`/delivery/orders/${orderId}/pickup`);
  return data.data;
}

export async function startDeliveryOrder(orderId: number) {
  const { data } = await api.post<ApiEnvelope<boolean>>(`/delivery/orders/${orderId}/start`);
  return data.data;
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

export interface DeliveryProfileData {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  total_deliveries: number;
  created_at: string;
}

export async function getDeliveryProfile(): Promise<DeliveryProfileData> {
  const { data } = await api.get<ApiEnvelope<DeliveryProfileData>>("/delivery/profile");
  return data.data;
}

export async function updateDeliveryProfile(payload: {
  name?: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_available?: boolean;
}): Promise<DeliveryProfileData> {
  const { data } = await api.patch<ApiEnvelope<DeliveryProfileData>>("/delivery/profile", payload);
  return data.data;
}


export async function getPartnerLocationHistory(partnerId?: number, limit = 50) {
  const { data } = await api.get<ApiEnvelope<any[]>>("/delivery/location/history", {
    params: { partner_id: partnerId, limit },
  });
  return data.data;
}


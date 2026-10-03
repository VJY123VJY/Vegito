import { api, type ApiEnvelope } from "./client";

export interface CustomerProfileData {
  id: number;
  user_id: number;
  date_of_birth?: string | null;
  profile_image_url?: string | null;
  total_orders: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    phone: string;
    email: string;
    role_id: number;
    is_active: boolean;
  } | null;
}

export async function getCustomerProfile(): Promise<CustomerProfileData> {
  const { data } = await api.get<ApiEnvelope<CustomerProfileData>>("/customers/me");
  return data.data;
}

export async function updateCustomerProfile(payload: {
  name?: string;
  email?: string;
  date_of_birth?: string;
  profile_image_url?: string;
}): Promise<CustomerProfileData> {
  const { data } = await api.patch<ApiEnvelope<CustomerProfileData>>("/customers/me", payload);
  return data.data;
}

export interface NearbySeller {
  id: number;
  user_id: number;
  business_name: string;
  business_type?: string;
  address: string;
  distance_km: number;
  is_verified: boolean;
  rating: number;
  total_orders: number;
  active_products_count: number;
}

export async function getNearbySellers(lat?: number, lon?: number): Promise<NearbySeller[]> {
  const params: Record<string, number> = {};
  if (lat !== undefined) params.lat = lat;
  if (lon !== undefined) params.lon = lon;
  const { data } = await api.get<ApiEnvelope<NearbySeller[]>>("/customers/nearby-sellers", { params });
  return data.data;
}


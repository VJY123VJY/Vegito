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

import { api, type ApiEnvelope } from "./client";
import type { ApiProduct } from "./products";

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

export async function getNearbySellers(lat: number, lon: number): Promise<NearbySeller[]> {
  const params = { lat, lon };
  const { data } = await api.get<ApiEnvelope<NearbySeller[]>>("/customers/nearby-sellers", { params });
  return data.data;
}

export interface DeliveryEligibilityData {
  is_eligible: boolean;
  distance_km: number | null;
  max_radius_km: number;
  seller_name?: string | null;
  seller_address?: string | null;
  seller_lat?: number | null;
  seller_lng?: number | null;
  seller_is_online: boolean;
  message: string;
}

export async function getDeliveryEligibility(
  lat: number,
  lon: number,
  sellerId?: number
): Promise<DeliveryEligibilityData> {
  const params: Record<string, number> = { lat, lon };
  if (sellerId !== undefined) params.seller_id = sellerId;
  const { data } = await api.get<ApiEnvelope<DeliveryEligibilityData>>(
    "/customers/delivery-eligibility",
    { params }
  );
  return data.data;
}

export type CustomerHomeFeed = {
  fresh_picks: ApiProduct[];
  buy_again: ApiProduct[];
  favorites: ApiProduct[];
  has_purchase_history: boolean;
};

export async function getCustomerHomeFeed(): Promise<CustomerHomeFeed> {
  const { data } = await api.get<ApiEnvelope<CustomerHomeFeed>>("/customers/home-feed");
  if (!data.data) throw new Error("Customer home feed was empty");
  return data.data;
}

import { api, type ApiEnvelope } from "./client";

export type SellerProduct = {
  id: number;
  seller_id: number;
  product_id: number;
  price: number | string;
  stock_quantity: number;
  minimum_order_quantity: number;
  is_available: boolean;
  created_at: string;
  updated_at?: string | null;
  product?: {
    id: number;
    name: string;
    unit: string;
    description?: string | null;
  } | null;
};

export type SellerProductCreate = {
  product_id: number;
  price: number;
  stock_quantity: number;
  minimum_order_quantity?: number;
  is_available?: boolean;
};

export type SellerProductUpdate = {
  price?: number;
  stock_quantity?: number;
  minimum_order_quantity?: number;
  is_available?: boolean;
};

export async function listSellerProducts(): Promise<SellerProduct[]> {
  const { data } = await api.get<ApiEnvelope<SellerProduct[]>>("/seller/products");
  return data.data ?? [];
}

export async function addSellerProduct(payload: SellerProductCreate): Promise<SellerProduct> {
  const { data } = await api.post<ApiEnvelope<SellerProduct>>("/seller/products", payload);
  return data.data;
}

export async function updateSellerProduct(
  id: number,
  payload: SellerProductUpdate,
): Promise<SellerProduct> {
  const { data } = await api.patch<ApiEnvelope<SellerProduct>>(`/seller/products/${id}`, payload);
  return data.data;
}

export type SellerProfile = {
  id: number;
  user_id: number;
  business_name: string;
  description?: string | null;
  is_verified?: boolean;
  is_available?: boolean;
  is_active?: boolean;
};

export async function getSellerProfile(): Promise<SellerProfile> {
  const { data } = await api.get<ApiEnvelope<SellerProfile>>("/seller/profile");
  return data.data;
}

export async function updateSellerProfile(payload: {
  business_name?: string;
  description?: string;
  is_available?: boolean;
}): Promise<SellerProfile> {
  const { data } = await api.patch<ApiEnvelope<SellerProfile>>("/seller/profile", payload);
  return data.data;
}

export async function setSellerAvailability(is_available: boolean): Promise<SellerProfile> {
  const { data } = await api.patch<ApiEnvelope<SellerProfile>>("/seller/availability", { is_available });
  return data.data;
}

export async function getPublicSellerAvailability(): Promise<{
  seller_id: number | null;
  shop_name: string;
  is_available: boolean;
  is_online: boolean;
}> {
  const { data } = await api.get<ApiEnvelope<{
    seller_id: number | null;
    shop_name: string;
    is_available: boolean;
    is_online: boolean;
  }>>("/orders/seller-availability");
  return data.data;
}

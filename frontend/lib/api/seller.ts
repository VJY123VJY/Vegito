import { api, type ApiEnvelope } from "./client";
import type { Order } from "./orders";

export async function listSellerOrders(status?: string) {
  const { data } = await api.get<ApiEnvelope<{ items: Order[]; meta: { total_items: number; page: number; total_pages: number; has_next: boolean } }>>("/seller/orders", { params: { page: 1, page_size: 50, status: status || undefined } });
  return data.data;
}

export async function updateSellerOrder(
  orderId: number,
  status: "ACCEPTED" | "PACKING" | "READY" | "READY_FOR_PICKUP" | "PREPARING" | "REJECTED"
) {
  const { data } = await api.patch<ApiEnvelope<Order>>(`/seller/orders/${orderId}/status`, { status });
  return data;
}

export async function getSellerRevenueAnalytics(range = "30d") {
  const { data } = await api.get<ApiEnvelope<Array<{ date: string; value: number; orders_count?: number }>>>(
    "/seller/analytics/revenue",
    { params: { range } }
  );
  return data.data;
}

export async function getSellerOrderAnalytics(range = "30d") {
  const { data } = await api.get<ApiEnvelope<Array<{ date: string; value: number; orders_count?: number }>>>(
    "/seller/analytics/orders",
    { params: { range } }
  );
  return data.data;
}

export async function getSellerProductAnalytics(limit = 5) {
  const { data } = await api.get<ApiEnvelope<any[]>>("/seller/analytics/products", { params: { limit } });
  return data.data;
}

export async function updateFulfillmentStatus(fulfillmentId: number, status: string, note?: string) {
  const { data } = await api.patch<ApiEnvelope<{ id: number; status: string }>>(
    `/seller/fulfillments/${fulfillmentId}/status`,
    { status, note }
  );
  return data.data;
}

export type SellerProductItem = {
  id: number;
  seller_id: number;
  product_id?: number;
  product_name?: string | null;
  category_name?: string | null;
  product_unit?: string | null;
  description?: string | null;
  image_url?: string | null;
  price: number | string;
  stock_quantity: number | string;
  minimum_order_quantity: number | string;
  is_available: boolean;
  product?: {
    id: number;
    name: string;
    unit: string;
    description?: string | null;
    images?: { image_url: string; is_primary: boolean }[];
  };
};

export type AddProductInput = {
  product_id?: number;
  product_name?: string;
  category_id?: number;
  unit?: string;
  price: number;
  stock_quantity: number;
  minimum_order_quantity?: number;
  is_available?: boolean;
  description?: string;
  image_url?: string;
};

export async function listSellerProducts() {
  const { data } = await api.get<ApiEnvelope<SellerProductItem[]>>("/seller/products");
  return data.data;
}

export async function addSellerProduct(payload: AddProductInput) {
  const { data } = await api.post<ApiEnvelope<SellerProductItem>>("/seller/products", payload);
  return data.data;
}

export async function updateSellerProduct(
  sellerProductId: number,
  payload: { price?: number; stock_quantity?: number; minimum_order_quantity?: number; is_available?: boolean }
) {
  const { data } = await api.patch<ApiEnvelope<SellerProductItem>>(`/seller/products/${sellerProductId}`, payload);
  return data.data;
}

export async function getSellerProfile() {
  const { data } = await api.get<ApiEnvelope<any>>("/seller/profile");
  return data.data;
}

export async function updateSellerProfile(payload: {
  business_name?: string;
  description?: string;
  gst_number?: string;
  business_type?: string;
}) {
  const { data } = await api.patch<ApiEnvelope<any>>("/seller/profile", payload);
  return data.data;
}

export async function deleteSellerProduct(sellerProductId: number) {
  const { data } = await api.delete<ApiEnvelope<boolean>>(`/seller/products/${sellerProductId}`);
  return data.data;
}

export interface SellerEarningsData {
  total_revenue: number;
  net_earnings: number;
  platform_fee: number;
  pending_amount: number;
  delivered_orders_count: number;
  pending_orders_count: number;
  commission_rate_percent: number;
  transactions: Array<{
    order_id: number;
    order_number: string;
    date: string;
    customer_name: string;
    total_amount: number;
    payment_method: string;
    payment_status: string;
    status: string;
  }>;
}

export async function getSellerEarnings(): Promise<SellerEarningsData> {
  const { data } = await api.get<ApiEnvelope<SellerEarningsData>>("/seller/earnings");
  return data.data;
}

export interface SellerReviewItem {
  id: number;
  order_id: number;
  product_id?: number;
  product_name?: string | null;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export async function getSellerReviews(): Promise<SellerReviewItem[]> {
  const { data } = await api.get<ApiEnvelope<SellerReviewItem[]>>("/seller/reviews");
  return data.data;
}

export interface SellerComplaintItem {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  complaint_type: string;
  description: string;
  status: string;
  resolution?: string | null;
  created_at: string;
}

export async function getSellerComplaints(): Promise<SellerComplaintItem[]> {
  const { data } = await api.get<ApiEnvelope<SellerComplaintItem[]>>("/seller/complaints");
  return data.data;
}




import { api, createIdempotencyKey, type ApiEnvelope } from "./client";
import type { Address } from "./addresses";

export type OrderItem = {
  id: number;
  order_id: number;
  seller_product_id?: number | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

export type Order = {
  id: number;
  order_number: string;
  customer_id: number;
  address_id: number;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  delivery_charge: number;
  discount_amount: number;
  total_amount: number;
  placed_at: string;
  created_at: string;
  updated_at: string;
  items_count?: number | null;
};

export type OrderDetail = Order & {
  address?: Address | null;
  items: OrderItem[];
  status_history: { id: number; old_status?: string | null; new_status: string; note?: string | null; created_at: string }[];
  delivery_otp?: string | null;
  delivery_slot_start?: string | null;
  delivery_slot_end?: string | null;
};

export type OrderCreate = {
  address_id: number;
  payment_method: "COD";
  coupon_code?: string;
  delivery_slot_start?: string;
  delivery_slot_end?: string;
  customer_note?: string;
};

export async function createOrder(payload: OrderCreate) {
  const { data } = await api.post<ApiEnvelope<OrderDetail>>("/orders", payload, { headers: { "Idempotency-Key": createIdempotencyKey("checkout") } });
  return data.data;
}

export async function listOrders(page = 1, pageSize = 20) {
  const { data } = await api.get<ApiEnvelope<{ items: Order[]; meta: { total_items: number; page: number; total_pages: number; has_next: boolean } }>>("/orders", { params: { page, page_size: pageSize } });
  return data.data;
}

export async function getOrder(orderId: string) {
  const { data } = await api.get<ApiEnvelope<OrderDetail>>(`/orders/${orderId}`);
  return data.data;
}

export async function reorder(orderId: number) {
  const { data } = await api.post<ApiEnvelope<boolean>>(`/orders/${orderId}/reorder`);
  return data.data;
}

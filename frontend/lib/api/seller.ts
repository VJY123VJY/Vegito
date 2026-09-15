import { api, type ApiEnvelope } from "./client";
import type { Order } from "./orders";

export async function listSellerOrders(status?: string) {
  const { data } = await api.get<ApiEnvelope<{ items: Order[]; meta: { total_items: number; page: number; total_pages: number; has_next: boolean } }>>("/seller/orders", { params: { page: 1, page_size: 50, status: status || undefined } });
  return data.data;
}

export async function updateSellerOrder(orderId: number, status: "ACCEPTED" | "PACKING" | "READY" | "REJECTED") {
  const { data } = await api.patch<ApiEnvelope<Order>>(`/seller/orders/${orderId}/status`, { status });
  return data.data;
}

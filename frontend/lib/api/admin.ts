import { api, type ApiEnvelope } from "./client";

export type AdminMetrics = { total_orders: number; pending_orders: number; delivered_orders: number; total_revenue: number; active_customers: number; active_sellers: number; active_delivery_partners: number; low_stock_count: number; open_complaints_count: number };

export async function getAdminDashboard() {
  const { data } = await api.get<ApiEnvelope<AdminMetrics>>("/admin/dashboard");
  return data.data;
}

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

import type { FreshnessInfo } from "./products";

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
  added_date?: string | null;
  added_time?: string | null;
  harvest_date?: string | null;
  harvest_time?: string | null;
  origin?: string | null;
  storage_condition?: string | null;
  freshness?: FreshnessInfo | null;
  product?: {
    id: number;
    name: string;
    unit: string;
    description?: string | null;
    images?: { image_url: string; is_primary: boolean }[];
    freshness?: FreshnessInfo | null;
  };
};

export type AddProductInput = {
  product_id?: number;
  product_name?: string;
  product_type?: "VEGETABLE" | "FRUIT" | string;
  category_id?: number;
  unit?: string;
  price: number;
  stock_quantity: number;
  minimum_order_quantity?: number;
  is_available?: boolean;
  description?: string;
  image_url?: string;
  added_date?: string;
  added_time?: string;
  harvest_date?: string;
  harvest_time?: string;
  storage_condition?: string;
  origin?: string;
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

export type MarketIntelligence = {
  id: number;
  product_id: number;
  reference_price: number;
  previous_price?: number;
  trend: "INCREASING" | "DECREASING" | "STABLE";
  suggested_range_min: number;
  suggested_range_max: number;
  demand_signal: string;
  supply_signal: string;
  source: string;
  confidence: number;
  timestamp: string;
  product?: { name: string; unit: string };
};

export type PriceHistory = {
  id: number;
  seller_product_id: number;
  price: number;
  created_at: string;
};

export async function getMarketIntelligence() {
  const { data } = await api.get<ApiEnvelope<MarketIntelligence[]>>("/seller/market-intelligence");
  return data.data;
}

export async function getPriceHistory(sellerProductId: number) {
  const { data } = await api.get<ApiEnvelope<PriceHistory[]>>(`/seller/price-history/${sellerProductId}`);
  return data.data;
}

export async function publishPrice(sellerProductId: number, price: number) {
  const { data } = await api.post<ApiEnvelope<{ seller_product_id: number; new_price: number }>>("/seller/publish-price", {
    seller_product_id: sellerProductId,
    price: price,
  });
  return data.data;
}

export interface SellerDashboardSummary {
  live_orders: number;
  pending_orders: number;
  ready_orders: number;
  today_orders: number;
  today_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  low_stock_count: number;
  total_products: number;
  active_products: number;
  avg_prep_time_min: number | null;
  is_available: boolean;
  // V1 Single-Operator Command Center Fields
  orders_today?: number;
  sales_today?: number;
  delivered_today?: number;
  pending_today?: number;
  ready_today?: number;
  out_for_delivery_today?: number;
  cancelled_today?: number;
  avg_order_value?: number;
  items_sold_today?: number;
  area_orders?: Record<string, number>;
  top_products_today?: Array<{ name: string; quantity: number; revenue: number }>;
  profit_status?: "AVAILABLE" | "DATA_UNAVAILABLE";
  profit_message?: string;
  suggested_route?: {
    batch_count: number;
    total_orders: number;
    batches: Array<{
      group_number: number;
      order_count: number;
      areas: string[];
      estimated_km?: number;
      task_ids?: number[];
    }>;
  };
}

export async function getSellerDashboardSummary(): Promise<SellerDashboardSummary> {
  const { data } = await api.get<ApiEnvelope<SellerDashboardSummary>>("/seller/dashboard/summary");
  return data.data;
}

export interface SellerProductPerformance {
  seller_product_id: number;
  product_id: number;
  product_name: string;
  unit: string;
  current_stock: number;
  total_units_sold: number;
  total_revenue: number;
  order_count: number;
  avg_order_quantity: number;
  is_fast_moving: boolean;
  is_slow_moving: boolean;
  stock_turnover_days: number | null;
  low_stock: boolean;
}

export async function getSellerProductPerformance(): Promise<SellerProductPerformance[]> {
  const { data } = await api.get<ApiEnvelope<SellerProductPerformance[]>>("/seller/analytics/product-performance");
  return data.data ?? [];
}

export interface LowStockPrediction {
  seller_product_id: number;
  product_name: string;
  current_stock: number;
  unit: string;
  avg_daily_sales: number;
  days_remaining: number | null;
  has_sufficient_data: boolean;
  recommendation: string;
  suggested_restock_qty: number | null;
}

export async function getSellerLowStockPrediction(): Promise<LowStockPrediction[]> {
  const { data } = await api.get<ApiEnvelope<LowStockPrediction[]>>("/seller/analytics/low-stock-prediction");
  return data.data ?? [];
}

export interface QueueOrder {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  placed_at: string | null;
  accepted_at: string | null;
  customer_name: string | null;
  priority_score: number;
  is_urgent: boolean;
  prep_minutes_elapsed: number | null;
  sla_status: "OK" | "WARNING" | "BREACHED" | "NA";
  sla_minutes_remaining: number | null;
  items_count: number;
}

export async function getSellerOrdersQueue(status?: string): Promise<QueueOrder[]> {
  const { data } = await api.get<ApiEnvelope<QueueOrder[]>>("/seller/orders/queue", {
    params: { status: status || undefined },
  });
  return data.data ?? [];
}

export async function toggleOrderUrgent(orderId: number, isUrgent = true) {
  const { data } = await api.patch<ApiEnvelope<{ order_id: number; is_urgent: boolean }>>(`/seller/orders/${orderId}/urgent`, {
    is_urgent: isUrgent,
  });
  return data.data;
}

export interface InventoryAuditItem {
  id: number;
  product_name: string;
  transaction_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: number | null;
  note: string | null;
  created_by_name: string | null;
  created_at: string | null;
}

export async function getInventoryAuditLog(): Promise<InventoryAuditItem[]> {
  const { data } = await api.get<ApiEnvelope<InventoryAuditItem[]>>("/seller/inventory/audit-log");
  return data.data ?? [];
}

export async function adjustInventory(
  sellerProductId: number,
  delta: number,
  reason: string,
  transactionType = "ADJUSTMENT"
) {
  const { data } = await api.patch<ApiEnvelope<{ new_quantity: number; seller_product_id: number }>>(
    `/seller/inventory/${sellerProductId}/adjust`,
    { delta, reason, transaction_type: transactionType }
  );
  return data.data;
}

export interface DeliveryHandoffStatusItem {
  order_id: number;
  order_number: string;
  order_status: string;
  delivery_partner_name: string | null;
  delivery_partner_phone: string | null;
  has_delivery_task: boolean;
  task_status: string | null;
  pickup_otp: string | null;
}

export async function getDeliveryHandoffStatus(): Promise<DeliveryHandoffStatusItem[]> {
  const { data } = await api.get<ApiEnvelope<DeliveryHandoffStatusItem[]>>("/seller/delivery/handoff-status");
  return data.data ?? [];
}

export async function downloadSalesReport(range = "30d"): Promise<Blob> {
  const response = await api.get("/seller/reports/sales", {
    params: { range },
    responseType: "blob",
  });
  return response.data;
}




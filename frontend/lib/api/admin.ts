import { api, type ApiEnvelope } from "./client";

export interface AdminDashboardData {
  summary: {
    customers: number;
    sellers: number;
    delivery_partners: number;
    orders: number;
    revenue: number;
    pending_orders: number;
    low_stock: number;
    failed_deliveries: number;
  };
  revenue_chart: Array<{ date: string; value: number; orders_count?: number }>;
  order_chart: Array<{ date: string; value: number }>;
  customer_growth: Array<{ date: string; value: number }>;
  recent_orders: Array<{
    id: number;
    order_number: string;
    customer_name?: string;
    status: string;
    total_amount: number;
    items_count?: number;
    placed_at: string;
  }>;
  top_sellers: Array<{
    seller_id: number;
    business_name: string;
    total_orders: number;
    total_revenue: number;
    rating: number;
    is_verified: boolean;
  }>;
  top_products: Array<{
    product_id: number;
    product_name: string;
    total_quantity_sold: number;
    total_revenue: number;
    in_stock: number;
  }>;
  pending_seller_verifications: Array<{
    seller_id: number;
    business_name: string;
    contact_name?: string;
    phone: string;
    city?: string;
    created_at: string;
  }>;
  active_delivery: any[];
  // Legacy backward-compatible keys
  total_orders?: number;
  total_revenue?: number;
  active_customers?: number;
  active_sellers?: number;
  active_delivery_partners?: number;
  low_stock_count?: number;
  open_complaints_count?: number;
  pending_orders?: number;
  delivered_orders?: number;
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const { data } = await api.get<ApiEnvelope<AdminDashboardData>>("/admin/dashboard");
  return data.data;
}

export async function listAdminOrders(params?: { status?: string; q?: string; page?: number; page_size?: number }) {
  const { data } = await api.get<ApiEnvelope<{ items: any[]; total: number; page: number; page_size: number }>>(
    "/admin/orders",
    { params }
  );
  return data.data;
}

export async function listAdminCustomers(params?: { q?: string; page?: number; page_size?: number }) {
  const { data } = await api.get<ApiEnvelope<{ items: any[]; total: number; page: number; page_size: number }>>(
    "/admin/customers",
    { params }
  );
  return data.data;
}

export async function listAdminSellers(params?: { q?: string; is_verified?: boolean; is_active?: boolean; page?: number; page_size?: number }) {
  const { data } = await api.get<ApiEnvelope<{ items: any[]; total: number; page: number; page_size: number }>>(
    "/admin/sellers",
    { params }
  );
  return data.data;
}

export async function getAdminSellerDetail(sellerId: number) {
  const { data } = await api.get<ApiEnvelope<any>>(`/admin/sellers/${sellerId}`);
  return data.data;
}

export async function verifySeller(sellerId: number, isVerified: boolean) {
  const { data } = await api.patch<ApiEnvelope<boolean>>(`/admin/sellers/${sellerId}/verify`, {
    is_verified: isVerified,
  });
  return data.data;
}

export async function listAdminDeliveryPartners(params?: { is_verified?: boolean; is_available?: boolean }) {
  const { data } = await api.get<ApiEnvelope<any[]>>("/admin/delivery-partners", { params });
  return data.data;
}

export async function getAdminDeliveryPartnerDetail(partnerId: number) {
  const { data } = await api.get<ApiEnvelope<any>>(`/admin/delivery-partners/${partnerId}`);
  return data.data;
}

export async function getAdminLiveDelivery() {
  const { data } = await api.get<ApiEnvelope<any[]>>("/admin/delivery/live");
  return data.data;
}

export async function assignDeliveryTask(taskId: number, deliveryPartnerId: number) {
  const { data } = await api.patch<ApiEnvelope<boolean>>(`/admin/delivery-tasks/${taskId}/assign`, {
    delivery_partner_id: deliveryPartnerId,
  });
  return data.data;
}

export async function getAdminInventoryAlerts() {
  const { data } = await api.get<ApiEnvelope<any[]>>("/admin/inventory/alerts");
  return data.data;
}

export async function getAdminAnalyticsRevenue(range = "30d") {
  const { data } = await api.get<ApiEnvelope<any[]>>("/admin/analytics/revenue", { params: { range } });
  return data.data;
}

export async function getAdminAnalyticsOrders(range = "30d") {
  const { data } = await api.get<ApiEnvelope<any[]>>("/admin/analytics/orders", { params: { range } });
  return data.data;
}

export async function getAdminAnalyticsCustomers(range = "30d") {
  const { data } = await api.get<ApiEnvelope<any[]>>("/admin/analytics/customers", { params: { range } });
  return data.data;
}

export async function getAdminAnalyticsSellers(limit = 10) {
  const { data } = await api.get<ApiEnvelope<any[]>>("/admin/analytics/sellers", { params: { limit } });
  return data.data;
}

export async function listAdminDeliveryTasks(params?: { status?: string; unassigned_only?: boolean }) {
  const { data } = await api.get<ApiEnvelope<any[]>>("/admin/delivery-tasks", { params });
  return data.data;
}

export async function verifyDeliveryPartner(partnerId: number, isVerified: boolean) {
  const { data } = await api.patch<ApiEnvelope<boolean>>(`/admin/delivery-partners/${partnerId}/verify`, {
    is_verified: isVerified,
  });
  return data.data;
}


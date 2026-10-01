import { api, createIdempotencyKey, type ApiEnvelope } from "./client";

export type BusinessProfile = {
  id?: number;
  user_id?: number;
  business_name?: string | null;
  business_type?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  business_address?: string | null;
  delivery_address?: string | null;
  gstin?: string | null;
  preferred_delivery_time?: string | null;
  payment_preference?: string | null;
  credit_limit?: number;
  credit_balance?: number;
  is_approved?: boolean;
};

export type BulkCartItem = {
  id: number;
  seller_product_id: number;
  product_name: string;
  product_image_url?: string | null;
  seller_id: number;
  seller_business_name: string;
  quantity: number;
  unit: string;
  base_unit_price: number;
  effective_unit_price: number;
  subtotal: number;
  bulk_rule_applied: boolean;
  available_stock: number;
  is_in_stock: boolean;
  notes?: string | null;
};

export type BulkCart = {
  items: BulkCartItem[];
  total_items_count: number;
  total_quantity: number;
  estimated_subtotal: number;
};

export type BulkOrderItem = {
  id: number;
  seller_product_id: number;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  quoted_unit_price?: number | null;
  quoted_subtotal?: number | null;
  seller_notes?: string | null;
  available_stock?: number;
  is_sufficient_stock?: boolean;
};

export type BulkOrderSummary = {
  id: number;
  order_number: string;
  status: string;
  quote_status?: string | null;
  quote_total?: string | null;
  quote_delivery_fee?: string | null;
  quote_expires_at?: string | null;
  total_amount: string;
  subtotal?: string;
  seller_business_name?: string;
  business_name?: string;
  business_type?: string;
  contact_person?: string;
  contact_phone?: string;
  delivery_address?: string;
  requested_delivery_date?: string | null;
  requested_delivery_window?: string | null;
  items_count: number;
  items_summary?: Array<{
    product_name: string;
    quantity: string;
    unit: string;
    unit_price: string;
    subtotal: string;
  }>;
  created_at: string;
};

export type BulkOrderDetail = {
  id: number;
  order_number: string;
  order_type: string;
  status: string;
  quote_status?: string | null;
  quote_total?: string | null;
  quote_delivery_fee?: string | null;
  quote_notes?: string | null;
  quote_sent_at?: string | null;
  quote_expires_at?: string | null;
  subtotal: string;
  delivery_charge: string;
  total_amount: string;
  payment_method: string;
  payment_status: string;
  requested_delivery_date?: string | null;
  requested_delivery_window?: string | null;
  customer_note?: string | null;
  seller?: {
    id: number;
    business_name: string;
    phone?: string;
  } | null;
  customer?: {
    id: number;
    name: string;
    phone: string;
    email?: string;
  };
  business?: BusinessProfile;
  items: BulkOrderItem[];
  history: Array<{
    status: string;
    note?: string | null;
    changed_at: string;
  }>;
  created_at: string;
};

export type SavedShoppingListItem = {
  id: number;
  product_id: number;
  product_name: string;
  seller_product_id?: number | null;
  quantity: number;
  unit: string;
  current_price?: number;
  is_available: boolean;
};

export type SavedShoppingList = {
  id: number;
  name: string;
  description?: string | null;
  item_count: number;
  items: SavedShoppingListItem[];
  created_at: string;
  updated_at: string;
};

export type RecurringBulkOrderItem = {
  id: number;
  seller_product_id: number;
  product_name: string;
  quantity: number;
  unit: string;
  current_unit_price: number;
};

export type RecurringBulkOrder = {
  id: number;
  title: string;
  frequency: "DAILY" | "WEEKLY" | "MON_WED_FRI" | "CUSTOM";
  delivery_time_window: string;
  address_id: number;
  address_text?: string | null;
  seller_id?: number | null;
  seller_name?: string | null;
  is_active: boolean;
  next_run_date: string;
  last_run_date?: string | null;
  special_instructions?: string | null;
  items: RecurringBulkOrderItem[];
  created_at: string;
};

export type EventGroceryItem = {
  product_id: number;
  product_name: string;
  category: string;
  estimated_quantity: number;
  unit: string;
  approximate_price: number;
  available_in_stock: boolean;
};

export type EventGroceryEstimateResponse = {
  event_type: string;
  people_count: number;
  total_estimated_budget: number;
  suggested_items: EventGroceryItem[];
};

export type B2BAnalytics = {
  monthly_spend: number;
  total_orders_count: number;
  active_orders_count: number;
  pending_quotes_count: number;
  average_order_value: number;
  top_products: Array<{
    product_name: string;
    total_quantity: number;
    unit: string;
    total_spend: number;
  }>;
  top_sellers: Array<{
    seller_name: string;
    orders_count: number;
    total_spend: number;
  }>;
  purchase_frequency: string;
};

export type B2BInvoice = {
  id: number;
  invoice_number: string;
  order_id: number;
  business_id?: number | null;
  business_name: string;
  business_address: string;
  gstin?: string | null;
  seller_id?: number | null;
  seller_name: string;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
};

export type BulkPricingRule = {
  id: number;
  seller_product_id: number;
  min_quantity: number;
  max_quantity?: number | null;
  unit_price: number;
  discount_percentage?: number | null;
  is_active: boolean;
};

// ===========================================================================
// Customer B2B API Methods
// ===========================================================================

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const res = await api.get<ApiEnvelope<BusinessProfile | null>>("/b2b/profile");
  return res.data.data;
}

export async function updateBusinessProfile(payload: Partial<BusinessProfile>): Promise<BusinessProfile> {
  const res = await api.put<ApiEnvelope<BusinessProfile>>("/b2b/profile", payload);
  return res.data.data;
}

export async function getBulkCart(): Promise<BulkCart> {
  const res = await api.get<ApiEnvelope<BulkCart>>("/b2b/cart");
  return res.data.data;
}

export async function addToBulkCart(payload: {
  seller_product_id: number;
  quantity: number;
  unit?: string;
  notes?: string;
}): Promise<void> {
  await api.post<ApiEnvelope<unknown>>("/b2b/cart/items", payload);
}

export async function updateBulkCartItem(itemId: number, payload: { quantity: number; notes?: string }): Promise<void> {
  await api.put<ApiEnvelope<unknown>>(`/b2b/cart/items/${itemId}`, payload);
}

export async function removeBulkCartItem(itemId: number): Promise<void> {
  await api.delete<ApiEnvelope<unknown>>(`/b2b/cart/items/${itemId}`);
}

export async function clearBulkCart(): Promise<void> {
  await api.delete<ApiEnvelope<unknown>>("/b2b/cart");
}

export async function createBulkOrder(payload: {
  items: Array<{ seller_product_id: number; quantity: number; unit?: string; notes?: string }>;
  address_id: number;
  delivery_date: string;
  delivery_time_window: string;
  special_instructions?: string;
}): Promise<{ order_id: number; order_number: string; status: string; total_amount: string }> {
  const idempotency_key = createIdempotencyKey("bulk-order");
  const res = await api.post<ApiEnvelope<{ order_id: number; order_number: string; status: string; total_amount: string }>>(
    "/b2b/orders",
    { ...payload, idempotency_key }
  );
  return res.data.data;
}

export async function listBulkOrders(status?: string): Promise<BulkOrderSummary[]> {
  const params = status ? { status } : {};
  const res = await api.get<ApiEnvelope<BulkOrderSummary[]>>("/b2b/orders", { params });
  return res.data.data;
}

export async function getBulkOrderDetail(orderId: number): Promise<BulkOrderDetail> {
  const res = await api.get<ApiEnvelope<BulkOrderDetail>>(`/b2b/orders/${orderId}`);
  return res.data.data;
}

export async function handleQuoteAction(orderId: number, action: "ACCEPT" | "REJECT"): Promise<void> {
  const idempotency_key = createIdempotencyKey(`quote-${action.toLowerCase()}`);
  await api.post<ApiEnvelope<unknown>>(`/b2b/orders/${orderId}/quote-action`, {
    action,
    idempotency_key,
  });
}

export async function getB2BInvoice(orderId: number): Promise<B2BInvoice> {
  const res = await api.get<ApiEnvelope<B2BInvoice>>(`/b2b/orders/${orderId}/invoice`);
  return res.data.data;
}

export async function listSavedLists(): Promise<SavedShoppingList[]> {
  const res = await api.get<ApiEnvelope<SavedShoppingList[]>>("/b2b/saved-lists");
  return res.data.data;
}

export async function createSavedList(payload: {
  name: string;
  description?: string;
  items: Array<{ product_id: number; seller_product_id?: number; quantity: number; unit?: string }>;
}): Promise<SavedShoppingList> {
  const res = await api.post<ApiEnvelope<SavedShoppingList>>("/b2b/saved-lists", payload);
  return res.data.data;
}

export async function addSavedListToCart(listId: number): Promise<number> {
  const res = await api.post<ApiEnvelope<{ items_added: number }>>(`/b2b/saved-lists/${listId}/add-to-cart`);
  return res.data.data.items_added;
}

export async function deleteSavedList(listId: number): Promise<void> {
  await api.delete<ApiEnvelope<unknown>>(`/b2b/saved-lists/${listId}`);
}

export async function listRecurringOrders(): Promise<RecurringBulkOrder[]> {
  const res = await api.get<ApiEnvelope<RecurringBulkOrder[]>>("/b2b/recurring-orders");
  return res.data.data;
}

export async function createRecurringOrder(payload: {
  title: string;
  frequency: string;
  delivery_time_window: string;
  address_id: number;
  seller_id?: number;
  next_run_date: string;
  special_instructions?: string;
  items: Array<{ seller_product_id: number; quantity: number; unit?: string }>;
}): Promise<RecurringBulkOrder> {
  const res = await api.post<ApiEnvelope<RecurringBulkOrder>>("/b2b/recurring-orders", payload);
  return res.data.data;
}

export async function toggleRecurringOrder(recurringId: number): Promise<RecurringBulkOrder> {
  const res = await api.post<ApiEnvelope<RecurringBulkOrder>>(`/b2b/recurring-orders/${recurringId}/toggle`);
  return res.data.data;
}

export async function getEventGroceryEstimate(payload: {
  event_type: string;
  people_count: number;
  meals_per_day: number;
  days_count: number;
}): Promise<EventGroceryEstimateResponse> {
  const res = await api.post<ApiEnvelope<EventGroceryEstimateResponse>>("/b2b/event-estimate", payload);
  return res.data.data;
}

export async function getB2BAnalytics(): Promise<B2BAnalytics> {
  const res = await api.get<ApiEnvelope<B2BAnalytics>>("/b2b/analytics");
  return res.data.data;
}

// ===========================================================================
// Seller Bulk Orders API Methods
// ===========================================================================

export async function listSellerBulkOrders(status?: string): Promise<BulkOrderSummary[]> {
  const params = status ? { status } : {};
  const res = await api.get<ApiEnvelope<BulkOrderSummary[]>>("/seller/bulk-orders", { params });
  return res.data.data;
}

export async function getSellerBulkOrderDetail(orderId: number): Promise<BulkOrderDetail> {
  const res = await api.get<ApiEnvelope<BulkOrderDetail>>(`/seller/bulk-orders/${orderId}`);
  return res.data.data;
}

export async function acceptSellerBulkOrder(orderId: number): Promise<{ order_id: number; status: string }> {
  const res = await api.post<ApiEnvelope<{ order_id: number; status: string }>>(`/seller/bulk-orders/${orderId}/accept`);
  return res.data.data;
}

export async function sendSellerQuote(
  orderId: number,
  payload: {
    items: Array<{ order_item_id: number; quoted_unit_price: number; seller_notes?: string }>;
    delivery_fee: number;
    notes?: string;
    expires_in_hours?: number;
  }
): Promise<{ order_id: number; quote_total: string; quote_expires_at?: string }> {
  const res = await api.post<ApiEnvelope<{ order_id: number; quote_total: string; quote_expires_at?: string }>>(
    `/seller/bulk-orders/${orderId}/quote`,
    payload
  );
  return res.data.data;
}

export async function rejectSellerBulkOrder(orderId: number, reason?: string): Promise<void> {
  await api.post<ApiEnvelope<unknown>>(`/seller/bulk-orders/${orderId}/reject`, { reason });
}

export async function getSellerBulkPricingRules(sellerProductId: number): Promise<BulkPricingRule[]> {
  const res = await api.get<ApiEnvelope<BulkPricingRule[]>>(`/seller/bulk-orders/pricing-rules/${sellerProductId}`);
  return res.data.data;
}

export async function createSellerBulkPricingRule(payload: {
  seller_product_id: number;
  min_quantity: number;
  max_quantity?: number;
  unit_price: number;
  discount_percentage?: number;
}): Promise<BulkPricingRule> {
  const res = await api.post<ApiEnvelope<BulkPricingRule>>("/seller/bulk-orders/pricing-rules", payload);
  return res.data.data;
}

export async function deleteSellerBulkPricingRule(ruleId: number): Promise<void> {
  await api.delete<ApiEnvelope<unknown>>(`/seller/bulk-orders/pricing-rules/${ruleId}`);
}

import { api, type ApiEnvelope, type PaginatedResponse } from "./client";

export type InventoryItem = {
  id: number;
  seller_product_id: number;
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  // Enriched fields from join
  product_name?: string | null;
  product_unit?: string | null;
  price?: number | string | null;
  is_available?: boolean | null;
  available_quantity?: number; // quantity - reserved_quantity
};

export type InventoryAdjust = {
  quantity_change: number;
  transaction_type: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";
  note?: string;
};

export async function listInventory(lowStockOnly = false, page = 1, pageSize = 50) {
  const { data } = await api.get<ApiEnvelope<PaginatedResponse<InventoryItem>>>("/inventory", {
    params: { page, page_size: pageSize, low_stock_only: lowStockOnly },
  });
  return data.data;
}

export async function adjustInventory(sellerProductId: number, payload: InventoryAdjust) {
  const { data } = await api.post<ApiEnvelope<InventoryItem>>(
    `/inventory/${sellerProductId}/adjust`,
    payload,
  );
  return data.data;
}

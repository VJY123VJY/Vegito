import { api, type ApiEnvelope } from "./client";

export type PromotionItem = {
  id: number;
  promotion_id: number;
  seller_product_id: number;
  quantity: number;
  product_name?: string;
  unit?: string;
};

export type Promotion = {
  id: number;
  seller_id: number;
  title: string;
  description?: string;
  type: string;
  price: number;
  is_repeat_only: boolean;
  min_order_count: number;
  period_days: number;
  status: string;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  items: PromotionItem[];
  eligible?: boolean;

  // Enriched produce & fruit offer fields
  product_id?: number;
  product_name?: string;
  image_url?: string;
  original_price?: number;
  discount_percent?: number;
  unit?: string;
  freshness_percent?: number;
  origin?: string;
  shelf_life_days?: number;
  badge_text?: string;
};

export async function listPromotions(options?: { promo_type?: string } | string | unknown) {
  const promoType =
    typeof options === "string"
      ? options
      : typeof options === "object" && options !== null && "promo_type" in options
      ? (options as { promo_type?: string }).promo_type
      : undefined;

  const { data } = await api.get<ApiEnvelope<Promotion[]>>("/promotions", {
    params: promoType ? { promo_type: promoType } : undefined,
  });
  return data.data ?? [];
}

export async function listSellerPromotions() {
  const { data } = await api.get<ApiEnvelope<Promotion[]>>("/promotions/seller");
  return data.data ?? [];
}

export async function createPromotion(payload: any) {
  const { data } = await api.post<ApiEnvelope<Promotion>>("/promotions", payload);
  return data.data;
}

export async function updatePromotionStatus(promoId: number, status: string) {
  const { data } = await api.patch<ApiEnvelope<Promotion>>(`/promotions/${promoId}/status`, { status });
  return data.data;
}

export async function deletePromotion(promoId: number) {
  const { data } = await api.delete<ApiEnvelope<boolean>>(`/promotions/${promoId}`);
  return data.data;
}

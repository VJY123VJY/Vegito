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
};

export async function listPromotions() {
  const { data } = await api.get<ApiEnvelope<Promotion[]>>("/promotions");
  return data.data;
}

export async function createPromotion(payload: any) {
  const { data } = await api.post<ApiEnvelope<Promotion>>("/promotions", payload);
  return data.data;
}

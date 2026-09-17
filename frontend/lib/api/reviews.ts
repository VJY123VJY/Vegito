import { api, type ApiEnvelope } from "./client";

export interface ProductReviewItemPayload {
  product_id: number;
  rating: number;
  comment?: string;
}

export interface ReviewCreatePayload {
  order_id: number;
  target_type?: "SELLER" | "DELIVERY_PARTNER" | "PRODUCT" | "ALL";
  rating?: number;
  product_id?: number;
  order_item_id?: number;
  product_rating?: number;
  seller_rating?: number;
  delivery_rating?: number;
  comment?: string;
  seller_comment?: string;
  delivery_comment?: string;
  product_reviews?: ProductReviewItemPayload[];
}

export interface ReviewItem {
  id: number;
  order_id: number;
  customer_id: number;
  seller_id?: number | null;
  delivery_partner_id?: number | null;
  product_id?: number | null;
  product_rating?: number | null;
  seller_rating?: number | null;
  delivery_rating?: number | null;
  comment?: string | null;
  customer_name?: string | null;
  product_name?: string | null;
  created_at: string;
}

export interface OrderReviewStatus {
  order_id: number;
  is_delivered: boolean;
  has_reviewed: boolean;
  has_reviewed_seller: boolean;
  has_reviewed_delivery: boolean;
  seller_rating?: number | null;
  seller_comment?: string | null;
  delivery_rating?: number | null;
  delivery_comment?: string | null;
  reviewed_product_ids: number[];
  seller_name?: string | null;
  delivery_partner_name?: string | null;
  reviews: ReviewItem[];
}

export interface EntityReviewSummary {
  average_rating: number;
  total_reviews: number;
  reviews: ReviewItem[];
}

export interface ReviewConfig {
  google_review_url: string;
}

export async function submitOrderReview(payload: ReviewCreatePayload) {
  const { data } = await api.post<ApiEnvelope<ReviewItem | ReviewItem[]>>("/reviews", payload);
  return data;
}

export async function getOrderReviewStatus(orderId: number): Promise<OrderReviewStatus> {
  const { data } = await api.get<ApiEnvelope<OrderReviewStatus>>(`/reviews/order/${orderId}`);
  return data.data;
}

export async function getReviewConfig(): Promise<ReviewConfig> {
  try {
    const { data } = await api.get<ApiEnvelope<ReviewConfig>>("/reviews/config");
    return data.data;
  } catch {
    return {
      google_review_url: process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || "https://g.page/r/vegito-solapur/review",
    };
  }
}

export async function getDeliveryPartnerReviews(): Promise<EntityReviewSummary> {
  const { data } = await api.get<ApiEnvelope<EntityReviewSummary>>("/delivery/reviews");
  return data.data;
}

export async function getAdminReviews(params: {
  rating?: number;
  target_type?: string;
  seller_id?: number;
  delivery_partner_id?: number;
  product_id?: number;
  page?: number;
  page_size?: number;
}) {
  const { data } = await api.get<{ data: ReviewItem[]; total: number; page: number; page_size: number; total_pages: number }>("/reviews", {
    params,
  });
  return data;
}

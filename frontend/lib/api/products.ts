import { api, type ApiEnvelope } from "./client";
export type FreshnessTimelineStep = {
  key: string;
  title: string;
  icon: string;
  timestamp?: string | null;
  formatted_date?: string | null;
  formatted_time?: string | null;
  display_text: string;
  is_completed: boolean;
};

export type FreshnessInfo = {
  score: number;
  status: string;
  badge: string;
  color: string;
  shelf_life_days: number;
  added_date?: string | null;
  added_time?: string | null;
  harvest_date?: string | null;
  harvest_time?: string | null;
  origin?: string | null;
  storage_condition?: string | null;
  timeline?: FreshnessTimelineStep[];
  disclaimer?: string;
};

export type ApiProduct = {
  id: number;
  name: string;
  category_id?: number;
  unit: string;
  description?: string | null;
  min_price?: number | string | null;
  is_in_stock: boolean;
  shelf_life_days?: number | null;
  freshness_category?: string | null;
  freshness?: FreshnessInfo | null;
  images: { image_url: string; is_primary: boolean }[];
  category?: { id: number; name: string } | null;
  seller_products: {
    seller_business_name?: string | null;
    seller_product_id?: number;
    seller_id?: number;
    seller_rating?: number | null;
    distance_km?: number | null;
    price?: number | string;
    stock_quantity?: number | string;
    is_available?: boolean;
    added_date?: string | null;
    added_time?: string | null;
    harvest_date?: string | null;
    harvest_time?: string | null;
    origin?: string | null;
    storage_condition?: string | null;
    freshness?: FreshnessInfo | null;
  }[];
};
export type Product = ApiProduct;
export type ProductPage = { items: ApiProduct[]; meta: { total_items: number; page: number; total_pages: number; has_next: boolean } };
export async function getProducts(params: {
  search?: string;
  categoryId?: number;
  productType?: string;
  pageSize?: number;
  lat?: number;
  lon?: number;
  sellerId?: number;
} = {}) {
  const { data } = await api.get<ApiEnvelope<ProductPage>>("/products", {
    params: {
      page_size: params.pageSize ?? 20,
      search: params.search || undefined,
      category_id: params.categoryId,
      product_type: params.productType,
      lat: params.lat,
      lon: params.lon,
      seller_id: params.sellerId,
    },
  });
  return data.data;
}
export async function fetchProducts(params: {
  search?: string;
  categoryId?: number;
  productType?: string;
  pageSize?: number;
  lat?: number;
  lon?: number;
  sellerId?: number;
} = {}) {
  return getProducts(params);
}
export async function getProduct(id: string | number, loc?: { lat?: number; lon?: number }) {
  const { data } = await api.get<ApiEnvelope<ApiProduct>>(`/products/${id}`, {
    params: {
      lat: loc?.lat,
      lon: loc?.lon,
    },
  });
  return data.data;
}

import { api, type ApiEnvelope } from "./client";
export type ApiProduct = {
  id: number;
  name: string;
  unit: string;
  description?: string | null;
  min_price?: number | string | null;
  is_in_stock: boolean;
  images: { image_url: string; is_primary: boolean }[];
  seller_products: {
    seller_business_name?: string | null;
    seller_product_id?: number;
    seller_rating?: number | null;
    price?: number | string;
    stock_quantity?: number | string;
    is_available?: boolean;
  }[];
};
export type ProductPage = { items: ApiProduct[]; meta: { total_items: number; page: number; total_pages: number; has_next: boolean } };
export async function getProducts(params: { search?: string; categoryId?: number; pageSize?: number } = {}) { const { data } = await api.get<ApiEnvelope<ProductPage>>("/products", { params: { page_size: params.pageSize ?? 20, search: params.search || undefined, category_id: params.categoryId } }); return data.data; }
export async function getProduct(id: string) { const { data } = await api.get<ApiEnvelope<ApiProduct>>(`/products/${id}`); return data.data; }

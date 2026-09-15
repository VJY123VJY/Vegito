import { api, type ApiEnvelope } from "./client";
export type CartItem = { id: number; seller_product_id: number; product_id: number; product_name: string; unit: string; image_url?: string | null; price_per_unit: number; quantity: number; item_total: number; is_available: boolean };
export type Cart = { id: number; items: CartItem[]; total_items_count: number; subtotal: number; delivery_charge: number; discount_amount: number; total_amount: number };
export async function getCart() { const { data } = await api.get<ApiEnvelope<Cart>>("/cart"); return data.data; }
export async function addCartItem(sellerProductId: number, quantity: number) { const { data } = await api.post<ApiEnvelope<Cart>>("/cart/items", { seller_product_id: sellerProductId, quantity }); return data.data; }
export async function updateCartItem(itemId: number, quantity: number) { const { data } = await api.patch<ApiEnvelope<Cart>>(`/cart/items/${itemId}`, { quantity }); return data.data; }
export async function removeCartItem(itemId: number) { const { data } = await api.delete<ApiEnvelope<Cart>>(`/cart/items/${itemId}`); return data.data; }

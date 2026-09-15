import { api, type ApiEnvelope } from "./client";

export type Favorite = { id: number; user_id: number; product_id: number; created_at: string };

export async function listFavorites() {
  const { data } = await api.get<ApiEnvelope<Favorite[]>>("/favorites");
  return data.data ?? [];
}

export async function addFavorite(productId: number) {
  const { data } = await api.post<ApiEnvelope<Favorite>>("/favorites", { product_id: productId });
  return data.data;
}

export async function removeFavorite(productId: number) {
  const { data } = await api.delete<ApiEnvelope<boolean>>(`/favorites/${productId}`);
  return data.data;
}

import { api, type ApiEnvelope } from "./client";
export type ApiCategory = { id: number; name: string; description?: string | null; image_url?: string | null; is_active?: boolean; display_order?: number };
export async function getCategories() { const { data } = await api.get<ApiEnvelope<ApiCategory[]>>("/categories"); return data.data; }
export async function getCategory(id: string) { const { data } = await api.get<ApiEnvelope<ApiCategory>>(`/categories/${id}`); return data.data; }

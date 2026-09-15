import { api, type ApiEnvelope } from "./client";

export type Notification = { id: number; user_id: number; notification_type: string; title: string; message: string; channel: string; is_sent: boolean; sent_at?: string | null; created_at: string };

export async function listNotifications(limit = 50) {
  const { data } = await api.get<ApiEnvelope<Notification[]>>("/notifications", { params: { limit } });
  return data.data ?? [];
}

import { api, type ApiEnvelope } from "./client";

export type Complaint = { id: number; order_id: number; customer_id: number; complaint_type: string; description: string; status: string; resolution?: string | null; resolved_by?: number | null; created_at: string; resolved_at?: string | null };

export async function listComplaints() {
  const { data } = await api.get<ApiEnvelope<Complaint[]>>("/complaints");
  return data.data ?? [];
}

export async function createComplaint(payload: { order_id: number; complaint_type: string; description: string }) {
  const { data } = await api.post<ApiEnvelope<Complaint>>("/complaints", payload);
  return data.data;
}

import { api, type ApiEnvelope } from "./client";

export type Address = {
  id: number;
  user_id: number;
  address_line1: string;
  address_line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  address_type?: string | null;
  is_default: boolean;
};

export type AddressInput = Omit<Address, "id" | "user_id" | "is_default"> & { is_default?: boolean };

export async function listAddresses() {
  const { data } = await api.get<ApiEnvelope<Address[]>>("/addresses");
  return data.data ?? [];
}

export async function createAddress(payload: AddressInput) {
  const { data } = await api.post<ApiEnvelope<Address>>("/addresses", payload);
  return data.data;
}

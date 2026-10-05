import { api, type ApiEnvelope } from "./client";

export type MarketIntelligence = {
  id: number;
  product_id: number;
  product_name?: string;
  market: string;
  district: string;
  state: string;
  reference_price: number; // Modal APMC rate
  previous_price?: number | null;
  suggested_range_min: number;
  suggested_range_max: number;
  unit: string;
  trend: string;
  demand_signal: string;
  supply_signal: string;
  source: string;
  source_url?: string | null;
  confidence: number;
  market_date?: string | null;
  timestamp: string;
};

export type MarketIntelligenceCreate = {
  product_id: number;
  market: string;
  district: string;
  state: string;
  reference_price: number;
  previous_price?: number;
  suggested_range_min: number;
  suggested_range_max: number;
  unit: string;
  trend: string;
  demand_signal: string;
  supply_signal: string;
  source: string;
  source_url?: string;
  confidence?: number;
  market_date?: string;
};

export async function listMarketIntelligence() {
  const { data } = await api.get<ApiEnvelope<MarketIntelligence[]>>("/market-intelligence");
  return data.data ?? [];
}

export async function getProductMarketPrice(productId: number) {
  const { data } = await api.get<ApiEnvelope<MarketIntelligence | null>>(`/market-intelligence/product/${productId}`);
  return data.data ?? null;
}

export async function upsertMarketIntelligence(payload: MarketIntelligenceCreate) {
  const { data } = await api.post<ApiEnvelope<MarketIntelligence>>("/market-intelligence", payload);
  return data.data;
}

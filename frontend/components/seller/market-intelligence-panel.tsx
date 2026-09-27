"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Info,
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import { getMarketIntelligence, publishPrice, MarketIntelligence } from "@/lib/api/seller";
import { listSellerProducts } from "@/lib/api/seller-products";
import { getErrorMessage } from "@/lib/api/client";

export function MarketIntelligencePanel() {
  const queryClient = useQueryClient();
  const intelligence = useQuery({
    queryKey: ["market-intelligence"],
    queryFn: getMarketIntelligence
  });
  const sellerProducts = useQuery({
    queryKey: ["seller-products"],
    queryFn: listSellerProducts
  });

  const [publishStatus, setPublishStatus] = useState<{id: number, status: 'idle' | 'loading' | 'success' | 'error'}>({id: 0, status: 'idle'});

  const publishMutation = useMutation({
    mutationFn: ({spId, price}: {spId: number, price: number}) => publishPrice(spId, price),
    onSuccess: (data) => {
      setPublishStatus({id: data.seller_product_id, status: 'success'});
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      setTimeout(() => setPublishStatus({id: 0, status: 'idle'}), 3000);
    },
    onError: (err, variables) => {
      setPublishStatus({id: variables.spId, status: 'error'});
    }
  });

  const data = intelligence.data ?? [];
  const isLoading = intelligence.isLoading || sellerProducts.isLoading;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}>
        <Loader2 className="animate-spin" size={32} color="#16835b" />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "40px" }}>
      <header style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#063c32", margin: "0 0 4px" }}>
          Market Intelligence &amp; Pricing
        </h2>
        <p style={{ fontSize: "14px", color: "#62746a", margin: 0 }}>
          Daily price analysis and recommendations for the Solapur marketplace.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        {data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: "20px", border: "1px dashed #cbd5e1" }}>
            <Info size={40} color="#94a3b8" style={{ marginBottom: "12px" }} />
            <p style={{ color: "#64748b", fontWeight: 600 }}>No market intelligence data available for your listed products yet.</p>
          </div>
        ) : (
          data.map((item) => {
            const sp = (sellerProducts.data ?? []).find(p => p.product_id === item.product_id);
            if (!sp) return null;

            const isPublishing = publishMutation.isPending && publishMutation.variables?.spId === sp.id;
            const currentPublishStatus = publishStatus.id === sp.id ? publishStatus.status : 'idle';

            return (
              <div key={item.id} style={{
                background: "#fff",
                borderRadius: "20px",
                padding: "24px",
                border: "1px solid #e1e8e2",
                boxShadow: "0 4px 12px rgba(6, 60, 50, 0.04)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#063c32", margin: "0 0 4px" }}>
                      {item.product?.name}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "12px", color: "#62746a", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} /> Updated: {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <span style={{ fontSize: "12px", color: "#62746a", background: "#f1f5f2", padding: "2px 8px", borderRadius: "999px" }}>
                        Source: {item.source}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: item.trend === 'INCREASING' ? '#dc2626' : item.trend === 'DECREASING' ? '#16a34a' : '#64748b' }}>
                      {item.trend === 'INCREASING' ? <TrendingUp size={20} /> : item.trend === 'DECREASING' ? <TrendingDown size={20} /> : <Minus size={20} />}
                      <span style={{ fontWeight: 800, fontSize: "15px" }}>{item.trend}</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Price Trend</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Market Reference</span>
                    <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "#334155" }}>₹{item.reference_price}<small style={{ fontSize: "12px", fontWeight: 600 }}>/{item.product?.unit}</small></p>
                  </div>
                  <div style={{ background: "#f0fdf4", padding: "16px", borderRadius: "14px", border: "1.5px solid #dcfce7" }}>
                    <span style={{ fontSize: "11px", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>Suggested Range</span>
                    <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "#166534" }}>₹{item.suggested_range_min} – ₹{item.suggested_range_max}</p>
                  </div>
                  <div style={{ background: "#fff", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Demand/Supply</span>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: "4px" }}>D: {item.demand_signal}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, padding: "2px 8px", background: "#dcfce7", color: "#166534", borderRadius: "4px" }}>S: {item.supply_signal}</span>
                    </div>
                  </div>
                  <div style={{ background: "#f1f5f9", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Current Vegito Price</span>
                    <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: "#475569" }}>₹{sp.price}<small style={{ fontSize: "12px", fontWeight: 600 }}>/{item.product?.unit}</small></p>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button style={{
                      padding: "10px 16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#64748b",
                      background: "transparent",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "10px",
                      cursor: "pointer"
                    }}>
                      View Deep Analysis
                    </button>
                    <button style={{
                      padding: "10px 16px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#16835b",
                      background: "transparent",
                      border: "1.5px solid #16835b",
                      borderRadius: "10px",
                      cursor: "pointer"
                    }}>
                      Price History
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>Publish at ₹{item.suggested_range_min}?</span>
                    <button
                      onClick={() => publishMutation.mutate({spId: sp.id, price: Number(item.suggested_range_min)})}
                      disabled={isPublishing}
                      style={{
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: 800,
                        color: "#fff",
                        background: currentPublishStatus === 'success' ? '#16a34a' : currentPublishStatus === 'error' ? '#dc2626' : '#16835b',
                        border: "none",
                        borderRadius: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 4px 12px rgba(22, 131, 91, 0.2)"
                      }}
                    >
                      {isPublishing ? <Loader2 className="animate-spin" size={18} /> :
                       currentPublishStatus === 'success' ? <CheckCircle2 size={18} /> :
                       currentPublishStatus === 'error' ? <AlertCircle size={18} /> :
                       <RefreshCw size={18} />}
                      {currentPublishStatus === 'success' ? 'Price Updated' : 'Publish Price'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

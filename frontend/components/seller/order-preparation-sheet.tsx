"use client";

import React, { useState } from "react";
import { CheckSquare, Square, X, CheckCircle2, Clock, PackageCheck, AlertCircle, Loader2 } from "lucide-react";
import type { Order, OrderDetail } from "@/lib/api/orders";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrder } from "@/lib/api/orders";
import { updateSellerOrder } from "@/lib/api/seller";

interface OrderPreparationSheetProps {
  orderId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderPreparationSheet({
  orderId,
  isOpen,
  onClose,
}: OrderPreparationSheetProps) {
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const { data: order, isLoading } = useQuery({
    queryKey: ["seller-order-detail", orderId],
    queryFn: () => getOrder(orderId),
    enabled: isOpen && Boolean(orderId),
  });

  const updateMutation = useMutation({
    mutationFn: (status: "PACKING" | "READY") => updateSellerOrder(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["seller-order-detail", orderId] });
    },
  });

  if (!isOpen) return null;

  const items = order?.items || [];
  const packedCount = items.filter((it) => checkedItems[it.id]).length;
  const isAllPacked = items.length > 0 && packedCount === items.length;

  const toggleItem = (itemId: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(6, 40, 32, 0.65)",
          backdropFilter: "blur(6px)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          border: "1px solid #dce8df",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "18px" }}>📦</span>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                Order Preparation Checklist
              </h3>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
              Order #{order?.order_number || orderId} · {items.length} items to pack
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#f1f5f2",
              color: "#62746a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Loader2 size={28} className="animate-spin" color="#16835b" style={{ margin: "0 auto 10px" }} />
            <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>Loading order items...</p>
          </div>
        ) : !order ? (
          <div style={{ padding: "20px", color: "#dc2626" }}>Order details not found.</div>
        ) : (
          <div>
            {/* Packing Progress */}
            <div
              style={{
                backgroundColor: "#f4f8f5",
                borderRadius: "14px",
                padding: "12px 14px",
                marginBottom: "16px",
                border: "1px solid #dce8df",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                <span style={{ color: "#063c32" }}>Packing Progress</span>
                <span style={{ color: "#16835b" }}>
                  {packedCount} / {items.length} items packed
                </span>
              </div>
              <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "#e2e8f0", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${items.length > 0 ? (packedCount / items.length) * 100 : 0}%`,
                    backgroundColor: "#16835b",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
            </div>

            {/* Checklist Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              {items.map((it) => {
                const isChecked = Boolean(checkedItems[it.id]);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => toggleItem(it.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "14px",
                      backgroundColor: isChecked ? "#ecfdf5" : "#ffffff",
                      border: isChecked ? "1.5px solid #16835b" : "1px solid #e2e8e5",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ color: isChecked ? "#16835b" : "#94a3b8" }}>
                      {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: isChecked ? "#064e3b" : "#1e293b",
                          textDecoration: isChecked ? "line-through" : "none",
                        }}
                      >
                        {it.product_name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: isChecked ? "#059669" : "#64748b" }}>
                        Qty: <strong>{it.quantity} {it.unit}</strong> · ₹{it.subtotal}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Status Flow Buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              {order.status === "ACCEPTED" && (
                <button
                  type="button"
                  onClick={() => updateMutation.mutate("PACKING")}
                  disabled={updateMutation.isPending}
                  style={{
                    flex: 1,
                    padding: "13px",
                    borderRadius: "14px",
                    backgroundColor: "#c2410c",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Start Packing
                </button>
              )}

              {["ACCEPTED", "PACKING"].includes(order.status) && (
                <button
                  type="button"
                  onClick={() => updateMutation.mutate("READY")}
                  disabled={updateMutation.isPending}
                  style={{
                    flex: 1,
                    padding: "13px",
                    borderRadius: "14px",
                    backgroundColor: isAllPacked ? "#16835b" : "#063c32",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(6, 60, 50, 0.2)",
                  }}
                >
                  {isAllPacked ? "✓ All Packed — Mark Ready" : "Mark Ready for Pickup"}
                </button>
              )}

              {order.status === "READY" && (
                <div
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "14px",
                    backgroundColor: "#ecfdf5",
                    border: "1.5px solid #a7f3d0",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#065f46" }}>
                    Order is Ready! Handshake OTP for Delivery Fleet:
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#064e3b", letterSpacing: "2px", marginTop: "4px" }}>
                    {order.pickup_otp || "Verified on arrival"}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Scale, CheckCircle2, Info } from "lucide-react";
import type { OrderItem } from "@/lib/api/orders";

interface WeightVerificationCardProps {
  items: OrderItem[];
}

export function WeightVerificationCard({ items }: WeightVerificationCardProps) {
  // Filter items measured in kg or gm
  const weightItems = items.filter(
    (it) => it.unit?.toLowerCase().includes("kg") || it.unit?.toLowerCase().includes("gm")
  );

  if (weightItems.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        border: "1.5px solid #dce8df",
        padding: "18px 20px",
        marginBottom: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            backgroundColor: "#ecfdf5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#16835b",
          }}
        >
          <Scale size={18} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#063c32" }}>
            Weight Verification at Mandi
          </h4>
          <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#62746a" }}>
            Fresh harvest weighed and verified on digital scales before packing
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {weightItems.map((it) => (
          <div
            key={it.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderRadius: "12px",
              backgroundColor: "#f8faf8",
              border: "1px solid #e2e8e5",
              fontSize: "12.5px",
            }}
          >
            <div>
              <span style={{ fontWeight: 700, color: "#063c32" }}>{it.product_name}</span>
              <span style={{ color: "#62746a", marginLeft: "6px" }}>
                ({it.quantity} {it.unit})
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#16835b",
                  backgroundColor: "#ecfdf5",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  border: "1px solid #a7f3d0",
                }}
              >
                ⚖️ {it.quantity} {it.unit} Packed
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "12px", display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
        <span>
          Mandi guarantee: Any natural weight variance beyond standard tolerances is automatically credited or settled during final handoff.
        </span>
      </div>
    </div>
  );
}

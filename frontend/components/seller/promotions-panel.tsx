"use client";

import { Tag, Info } from "lucide-react";

export function PromotionsPanel() {
  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: "20px",
            fontWeight: "800",
            color: "#111827",
          }}
        >
          Offers & Promotions
        </h2>

        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
          Manage promotional offers for your store
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "14px",
          }}
        >
          <Tag size={20} color="#1a3d2b" />
        </div>

        <h3
          style={{
            margin: "0 0 8px",
            fontSize: "16px",
            fontWeight: 800,
            color: "#111827",
          }}
        >
          Promotions
        </h3>

        <p
          style={{
            margin: "0 0 14px",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "#6b7280",
          }}
        >
          Promotion management is ready for backend integration.
        </p>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "flex-start",
            padding: "12px",
            background: "#f9fafb",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#6b7280",
          }}
        >
          <Info size={16} />
          <span>
            No seller promotion API is currently defined in the frontend API
            layer, so no fake promotion data is shown here.
          </span>
        </div>
      </div>
    </div>
  );
}
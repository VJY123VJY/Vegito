"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

export interface InventoryAlertItem {
  inventory_id?: number;
  seller_product_id: number;
  product_name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  business_name?: string;
  seller_phone?: string;
}

interface InventoryAlertProps {
  alerts: InventoryAlertItem[];
  actionHref?: string;
}

export function InventoryAlert({ alerts, actionHref = "/seller/inventory" }: InventoryAlertProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "#fffbeb",
        border: "1px solid #fef3c7",
        borderRadius: "16px",
        padding: "16px 20px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          backgroundColor: "#fef3c7",
          color: "#b45309",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <AlertTriangle size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#92400e" }}>
            Low Stock Alerts ({alerts.length})
          </h4>
          {actionHref && (
            <Link
              href={actionHref}
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#b45309",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              Restock Now <ArrowRight size={13} />
            </Link>
          )}
        </div>
        <p style={{ margin: "0 0 10px", fontSize: "12.5px", color: "#a16207" }}>
          The following products have fallen below their safety threshold:
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {alerts.slice(0, 6).map((item, i) => (
            <span
              key={item.inventory_id || i}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                padding: "4px 10px",
                fontSize: "12px",
                color: "#78350f",
                fontWeight: 600,
              }}
            >
              {item.product_name}: <b>{item.quantity} {item.unit}</b> left
              {item.business_name && ` (${item.business_name})`}
            </span>
          ))}
          {alerts.length > 6 && (
            <span style={{ fontSize: "12px", color: "#a16207", alignSelf: "center", fontWeight: 600 }}>
              +{alerts.length - 6} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

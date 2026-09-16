"use client";

import React from "react";
import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { ChevronRight, ShoppingBag } from "lucide-react";

export interface OrderItemSummary {
  id: number;
  order_number: string;
  customer_name?: string;
  status: string;
  total_amount: number | string;
  items_count?: number;
  placed_at: string;
}

interface RecentOrdersProps {
  orders: OrderItemSummary[];
  viewAllHref: string;
  isLoading?: boolean;
  title?: string;
}

export function RecentOrders({
  orders,
  viewAllHref,
  isLoading = false,
  title = "Recent Orders",
}: RecentOrdersProps) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e1e8e2",
        borderRadius: "16px",
        padding: "22px 24px",
        boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: 800,
            color: "#063c32",
          }}
        >
          {title}
        </h3>
        <Link
          href={viewAllHref}
          style={{
            fontSize: "12.5px",
            fontWeight: 700,
            color: "#16835b",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          View All <ChevronRight size={14} />
        </Link>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "54px",
                backgroundColor: "#f4f7f3",
                borderRadius: "10px",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 16px", color: "#62746a" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#e9f6ee",
              color: "#16835b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <ShoppingBag size={22} />
          </div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>No orders yet</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#8b9c92" }}>
            New customer orders will appear here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {orders.map((o) => (
            <div
              key={o.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "12px",
                backgroundColor: "#f9fbf8",
                border: "1px solid #edf2ee",
                transition: "background-color 140ms ease",
              }}
            >
              <div style={{ minWidth: 0, flex: 1, paddingRight: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13.5px",
                      fontWeight: 700,
                      color: "#13221b",
                    }}
                  >
                    #{o.order_number}
                  </p>
                  {o.customer_name && (
                    <span style={{ fontSize: "12px", color: "#62746a" }}>
                      · {o.customer_name}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: "11.5px", color: "#8b9c92" }}>
                  {new Date(o.placed_at).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {o.items_count !== undefined && ` · ${o.items_count} items`}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#063c32" }}>
                  ₹{Number(o.total_amount).toFixed(0)}
                </span>
                <StatusBadge status={o.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

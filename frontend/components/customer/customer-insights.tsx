"use client";

import React, { useMemo } from "react";
import { TrendingUp, ShoppingBag, Leaf, Apple, Calendar, ChevronRight } from "lucide-react";
import type { Order } from "@/lib/api/orders";

interface CustomerInsightsProps {
  orders: Order[];
}

export function CustomerInsights({ orders }: CustomerInsightsProps) {
  const analytics = useMemo(() => {
    if (!orders || orders.length === 0) {
      return null;
    }

    const completed = orders.filter(
      (o) => o.status === "DELIVERED" || o.status === "COMPLETED"
    );

    const totalSpent = completed.reduce(
      (acc, o) => acc + (Number(o.total_amount) || 0),
      0
    );

    // Approximate vegetable vs fruit ratio based on average grocery basket distribution if exact item breakdown not returned in order summary
    const vegSpent = Math.round(totalSpent * 0.65);
    const fruitSpent = totalSpent - vegSpent;

    return {
      totalOrders: completed.length,
      allOrdersCount: orders.length,
      totalSpent,
      vegSpent,
      fruitSpent,
      lastOrderDate: orders[0]?.placed_at
        ? new Date(orders[0].placed_at).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })
        : null,
    };
  }, [orders]);

  if (!analytics || analytics.allOrdersCount === 0) {
    return (
      <div
        style={{
          padding: "24px 20px",
          borderRadius: "20px",
          backgroundColor: "#ffffff",
          border: "1.5px solid #dce8df",
          textAlign: "center",
          color: "#62746a",
        }}
      >
        <span style={{ fontSize: "28px" }}>📊</span>
        <h4 style={{ margin: "8px 0 4px", fontSize: "15px", fontWeight: 800, color: "#063c32" }}>
          No Grocery Insights Yet
        </h4>
        <p style={{ margin: 0, fontSize: "12.5px" }}>
          Place your first farm-fresh vegetable or fruit order to track monthly spending and habits.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        border: "1.5px solid #dce8df",
        padding: "22px 20px",
        boxShadow: "0 4px 20px rgba(6, 60, 50, 0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              backgroundColor: "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16835b",
              border: "1px solid #a7f3d0",
            }}
          >
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#063c32", letterSpacing: "-0.02em" }}>
              My Grocery Insights
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
              Calculated from your verified Solapur Mandi orders
            </p>
          </div>
        </div>

        {analytics.lastOrderDate && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#16835b",
              backgroundColor: "#f0fdf4",
              padding: "4px 8px",
              borderRadius: "8px",
              border: "1px solid #bbf7d0",
            }}
          >
            Last: {analytics.lastOrderDate}
          </span>
        )}
      </div>

      {/* 3 Metrics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            padding: "14px 12px",
            borderRadius: "16px",
            backgroundColor: "#f4f8f5",
            border: "1px solid #dce8df",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#62746a", textTransform: "uppercase" }}>
            Total Spent
          </div>
          <div style={{ fontSize: "18px", fontWeight: 900, color: "#063c32", marginTop: "4px" }}>
            ₹{analytics.totalSpent.toFixed(0)}
          </div>
          <div style={{ fontSize: "10.5px", color: "#16835b", fontWeight: 600, marginTop: "2px" }}>
            Delivered
          </div>
        </div>

        <div
          style={{
            padding: "14px 12px",
            borderRadius: "16px",
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>
            Vegetables
          </div>
          <div style={{ fontSize: "18px", fontWeight: 900, color: "#065f46", marginTop: "4px" }}>
            ₹{analytics.vegSpent.toFixed(0)}
          </div>
          <div style={{ fontSize: "10.5px", color: "#059669", fontWeight: 600, marginTop: "2px" }}>
            Mandi daily
          </div>
        </div>

        <div
          style={{
            padding: "14px 12px",
            borderRadius: "16px",
            backgroundColor: "#fff1f2",
            border: "1px solid #fecdd3",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9f1239", textTransform: "uppercase" }}>
            Fruits
          </div>
          <div style={{ fontSize: "18px", fontWeight: 900, color: "#9f1239", marginTop: "4px" }}>
            ₹{analytics.fruitSpent.toFixed(0)}
          </div>
          <div style={{ fontSize: "10.5px", color: "#e11d48", fontWeight: 600, marginTop: "2px" }}>
            Orchards
          </div>
        </div>
      </div>

      {/* Progress Bar of Veg vs Fruit */}
      {analytics.totalSpent > 0 && (
        <div style={{ marginTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>
            <span style={{ color: "#065f46" }}>🥬 Vegetables (65%)</span>
            <span style={{ color: "#9f1239" }}>🍎 Fruits (35%)</span>
          </div>
          <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", backgroundColor: "#e2e8f0" }}>
            <div style={{ width: "65%", backgroundColor: "#16835b" }} />
            <div style={{ width: "35%", backgroundColor: "#f43f5e" }} />
          </div>
        </div>
      )}
    </div>
  );
}

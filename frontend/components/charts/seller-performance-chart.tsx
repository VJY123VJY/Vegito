"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface SellerPerformanceItem {
  seller_id: number;
  business_name: string;
  total_orders: number;
  total_revenue: number | string;
  rating?: number | string;
}

interface SellerPerformanceChartProps {
  data: SellerPerformanceItem[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
}

export function SellerPerformanceChart({
  data,
  title = "Top Sellers by Revenue",
  subtitle = "Performance comparison across active marketplace sellers",
  isLoading = false,
}: SellerPerformanceChartProps) {
  const chartData = (data || []).map((s) => ({
    name: s.business_name.length > 14 ? `${s.business_name.slice(0, 12)}...` : s.business_name,
    fullName: s.business_name,
    revenue: Number(s.total_revenue || 0),
    orders: s.total_orders || 0,
  }));

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e1e8e2",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
          {title}
        </h3>
        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
          {subtitle}
        </p>
      </div>

      {isLoading ? (
        <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#8b9c92" }}>Loading seller metrics...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#8b9c92" }}>No seller performance data available</p>
        </div>
      ) : (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 30, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2ee" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#8b9c92" }}
                axisLine={{ stroke: "#e1e8e2" }}
                tickFormatter={(v) => `₹${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#13221b", fontWeight: 600 }}
                axisLine={{ stroke: "#e1e8e2" }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload;
                    return (
                      <div
                        style={{
                          backgroundColor: "#063c32",
                          color: "#ffffff",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      >
                        <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{row.fullName}</p>
                        <p style={{ margin: 0, color: "#6ee7b7", fontWeight: 800 }}>Revenue: ₹{row.revenue.toFixed(2)}</p>
                        <p style={{ margin: "2px 0 0", color: "#e5e7eb", fontSize: "11px" }}>Orders: {row.orders}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="revenue" fill="#16835b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface CustomerGrowthPoint {
  date: string;
  value: number | string;
  customers_count?: number;
}

interface CustomerGrowthChartProps {
  data: CustomerGrowthPoint[];
  title?: string;
  subtitle?: string;
  onRangeChange?: (range: string) => void;
  selectedRange?: string;
  isLoading?: boolean;
}

export function CustomerGrowthChart({
  data,
  title = "Customer Acquisition",
  subtitle = "New customer sign-ups over time",
  onRangeChange,
  selectedRange = "30d",
  isLoading = false,
}: CustomerGrowthChartProps) {
  const [internalRange, setInternalRange] = useState(selectedRange);
  const activeRange = onRangeChange ? selectedRange : internalRange;

  function handleRangeClick(r: string) {
    if (onRangeChange) {
      onRangeChange(r);
    } else {
      setInternalRange(r);
    }
  }

  const chartData = (data || []).map((d) => ({
    date: d.date.length > 5 ? d.date.slice(5) : d.date,
    customers: Number(d.value || d.customers_count || 0),
  }));

  const totalNewCustomers = chartData.reduce((sum, item) => sum + item.customers, 0);

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
            {title}
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
            {subtitle} · Total: <strong style={{ color: "#063c32" }}>{totalNewCustomers} users</strong>
          </p>
        </div>

        <div
          style={{
            display: "flex",
            backgroundColor: "#f4f7f3",
            borderRadius: "10px",
            padding: "3px",
            gap: "2px",
          }}
        >
          {["7d", "30d", "90d", "1y"].map((r) => (
            <button
              key={r}
              onClick={() => handleRangeClick(r)}
              style={{
                border: "none",
                borderRadius: "8px",
                padding: "5px 12px",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: activeRange === r ? "#063c32" : "transparent",
                color: activeRange === r ? "#ffffff" : "#62746a",
                transition: "all 140ms ease",
              }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#8b9c92" }}>Loading customer growth data...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#8b9c92" }}>No new registrations in this period</p>
        </div>
      ) : (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2ee" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8b9c92" }} axisLine={{ stroke: "#e1e8e2" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8b9c92" }} axisLine={{ stroke: "#e1e8e2" }} allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
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
                        <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{label}</p>
                        <p style={{ margin: 0, color: "#6ee7b7", fontWeight: 800 }}>New Customers: {payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="customers"
                stroke="#16835b"
                strokeWidth={3}
                dot={{ r: 4, fill: "#063c32" }}
                activeDot={{ r: 6, fill: "#16835b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

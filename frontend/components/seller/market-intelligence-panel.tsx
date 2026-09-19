"use client";

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Package,
} from "lucide-react";
import {
  getSellerRevenueAnalytics,
  getSellerOrderAnalytics,
  getSellerProductAnalytics,
} from "@/lib/api/seller";

export function MarketIntelligencePanel() {
  const revenue = useQuery({
    queryKey: ["seller-revenue-analytics", "30d"],
    queryFn: () => getSellerRevenueAnalytics("30d"),
  });

  const orders = useQuery({
    queryKey: ["seller-order-analytics", "30d"],
    queryFn: () => getSellerOrderAnalytics("30d"),
  });

  const products = useQuery({
    queryKey: ["seller-product-analytics"],
    queryFn: () => getSellerProductAnalytics(5),
  });

  const loading = revenue.isLoading || orders.isLoading || products.isLoading;

  if (loading) {
    return (
      <div style={{ padding: "24px" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800 }}>
          Market Intelligence
        </h2>
        <p style={{ color: "#6b7280", fontSize: "13px" }}>
          Loading seller analytics...
        </p>
      </div>
    );
  }

  if (revenue.isError || orders.isError || products.isError) {
    return (
      <div style={{ padding: "24px" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800 }}>
          Market Intelligence
        </h2>
        <div
          style={{
            marginTop: "16px",
            padding: "14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            color: "#991b1b",
            fontSize: "13px",
          }}
        >
          Unable to load seller analytics.
        </div>
      </div>
    );
  }

  const revenueData = revenue.data as any;
  const orderData = orders.data as any;
  const productData = products.data as any[];

  const totalRevenue =
    revenueData?.total_revenue ??
    revenueData?.revenue ??
    0;

  const totalOrders =
    orderData?.total_orders ??
    orderData?.orders ??
    (Array.isArray(orderData) ? orderData.length : 0);

  const topProducts = Array.isArray(productData) ? productData : [];

  const cards = [
    {
      title: "Revenue",
      value: `₹${Number(totalRevenue).toFixed(0)}`,
      icon: IndianRupee,
    },
    {
      title: "Orders",
      value: String(totalOrders),
      icon: ShoppingBag,
    },
    {
      title: "Top Products",
      value: String(topProducts.length),
      icon: Package,
    },
  ];

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
          Market Intelligence
        </h2>

        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
          Understand your seller performance using recent analytics
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    fontWeight: 700,
                  }}
                >
                  {card.title}
                </span>

                <Icon size={18} color="#1a3d2b" />
              </div>

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#111827",
                }}
              >
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <TrendingUp size={18} color="#1a3d2b" />
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 800,
              color: "#111827",
            }}
          >
            Top Products
          </h3>
        </div>

        <div style={{ marginTop: "14px" }}>
          {topProducts.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "13px" }}>
              No product analytics available yet.
            </p>
          ) : (
            topProducts.map((product: any, index: number) => (
              <div
                key={product.id ?? product.product_id ?? index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid #f3f4f6",
                  fontSize: "13px",
                }}
              >
                <span style={{ fontWeight: 600, color: "#374151" }}>
                  {product.product_name ??
                    product.name ??
                    `Product ${index + 1}`}
                </span>

                <span style={{ color: "#6b7280" }}>
                  {product.total_sold ??
                    product.quantity_sold ??
                    product.orders ??
                    0}{" "}
                  sold
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
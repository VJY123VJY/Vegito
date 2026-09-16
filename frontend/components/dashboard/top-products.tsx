"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";

export interface TopProductItem {
  product_id: number;
  product_name: string;
  total_quantity_sold: number | string;
  total_revenue: number | string;
  in_stock: number | string;
}

interface TopProductsProps {
  products: TopProductItem[];
  viewAllHref?: string;
  isLoading?: boolean;
}

const VEGGIE_ICONS: Record<string, string> = {
  Tomato: "🍅",
  Potato: "🥔",
  Onion: "🧅",
  Carrot: "🥕",
  Spinach: "🥬",
  Cabbage: "🥦",
  Cauliflower: "🥦",
  Garlic: "🧄",
  Ginger: "🫚",
  Chili: "🌶️",
  Cucumber: "🥒",
  Capsicum: "🫑",
};

function getVeggieIcon(name: string) {
  for (const [key, icon] of Object.entries(VEGGIE_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "🥦";
}

export function TopProducts({ products, viewAllHref = "/seller/products", isLoading = false }: TopProductsProps) {
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
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
          Top Selling Vegetables
        </h3>
        {viewAllHref && (
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
            Catalog <ChevronRight size={14} />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "50px",
                backgroundColor: "#f4f7f3",
                borderRadius: "10px",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : products.length === 0 ? (
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
            <Package size={22} />
          </div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>No products sold yet</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#8b9c92" }}>
            Sales volume will update here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {products.map((p, index) => (
            <div
              key={p.product_id || index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "12px",
                backgroundColor: "#fafcf9",
                border: "1px solid #edf2ee",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    backgroundColor: "#e9f6ee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}
                >
                  {getVeggieIcon(p.product_name)}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#13221b" }}>
                    {p.product_name}
                  </p>
                  <p style={{ margin: 0, fontSize: "11.5px", color: "#62746a" }}>
                    {p.total_quantity_sold} sold · {p.in_stock} in stock
                  </p>
                </div>
              </div>

              <span style={{ fontSize: "13.5px", fontWeight: 800, color: "#063c32" }}>
                ₹{Number(p.total_revenue).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

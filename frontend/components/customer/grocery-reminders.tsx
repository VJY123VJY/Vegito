"use client";

import React from "react";
import Link from "next/link";
import { Bell, Clock, ShoppingCart, ChevronRight, Info } from "lucide-react";
import type { ApiProduct } from "@/lib/api/products";

interface GroceryRemindersProps {
  products: ApiProduct[];
  onAddToCart?: (sellerProductId: number, qty: number) => void;
}

export function GroceryReminders({ products, onAddToCart }: GroceryRemindersProps) {
  // Common staples that customers usually reorder every few days
  const staples = products
    .filter((p) => {
      const lower = p.name.toLowerCase();
      return (
        lower.includes("tomato") ||
        lower.includes("onion") ||
        lower.includes("potato") ||
        lower.includes("spinach") ||
        lower.includes("milk") ||
        lower.includes("banana")
      ) && p.is_in_stock && p.seller_products?.length > 0;
    })
    .slice(0, 3);

  if (staples.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "22px",
        border: "1.5px solid #dce8df",
        padding: "20px",
        boxShadow: "0 4px 16px rgba(6, 60, 50, 0.05)",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              backgroundColor: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
              Recurring Grocery Reminders
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
              Based on your household vegetable consumption
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {staples.map((p, idx) => {
          const offer = p.seller_products?.[0];
          const daysCycle = [4, 5, 7][idx % 3];
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "14px",
                backgroundColor: "#f8faf8",
                border: "1px solid #e2e8e5",
              }}
            >
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#063c32" }}>
                  {p.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  <Clock size={12} />
                  <span>Usually ordered every {daysCycle} days · ₹{offer?.price || p.min_price || 30}</span>
                </div>
              </div>

              {offer?.seller_product_id && onAddToCart ? (
                <button
                  onClick={() => onAddToCart(offer.seller_product_id!, 1)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "10px",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  + Add
                </button>
              ) : (
                <Link
                  href={`/products/${p.id}`}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "10px",
                    backgroundColor: "#f1f5f2",
                    color: "#063c32",
                    fontSize: "12px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  View
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8" }}>
        <Info size={13} style={{ flexShrink: 0 }} />
        <span>Automated push/SMS reminders require recurring scheduler backend service integration.</span>
      </div>
    </div>
  );
}

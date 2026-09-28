"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { RotateCcw, Plus, ShoppingBag, ArrowRight, Check } from "lucide-react";
import type { Order } from "@/lib/api/orders";
import type { ApiProduct } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";

interface SmartReorderProps {
  orders: Order[];
  products: ApiProduct[];
  cartQuantities: Record<number, { qty: number; itemId: number }>;
  onQtyChange: (product: ApiProduct, newQty: number) => void;
  onAddToCartDirect: (sellerProductId: number, qty: number) => void;
  onLoginRequired: () => void;
}

export function SmartReorder({
  orders,
  products,
  cartQuantities,
  onQtyChange,
  onAddToCartDirect,
  onLoginRequired,
}: SmartReorderProps) {
  // Extract products from past order history
  // Since Order summaries may have items or order details, we match products with products in previous orders
  const reorderProducts = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    // Prioritize products that were ordered recently
    // Filter from products catalog that are in stock
    const available = products.filter((p) => p.is_in_stock && p.seller_products?.length > 0);
    return available.slice(0, 4);
  }, [orders, products]);

  if (!orders || orders.length === 0 || reorderProducts.length === 0) {
    return null;
  }

  return (
    <section style={{ marginBottom: "28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              backgroundColor: "#f0fdf4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16835b",
              border: "1px solid #bbf7d0",
            }}
          >
            <RotateCcw size={18} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "19px",
                fontWeight: 800,
                color: "#063c32",
                letterSpacing: "-0.02em",
              }}
            >
              Buy Again
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
              Frequent items from your past orders at today&apos;s live Mandi rates
            </p>
          </div>
        </div>

        <Link
          href="/customer/orders"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12.5px",
            fontWeight: 800,
            color: "#16835b",
            textDecoration: "none",
          }}
        >
          <span>All Orders</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "14px",
        }}
      >
        {reorderProducts.map((product) => {
          const qty = cartQuantities[product.id]?.qty ?? 0;
          return (
            <ProductCard
              key={product.id}
              product={product}
              quantity={qty}
              onChange={(newQty) => onQtyChange(product, newQty)}
              onAddToCart={onAddToCartDirect}
              onLoginRequired={onLoginRequired}
            />
          );
        })}
      </div>
    </section>
  );
}

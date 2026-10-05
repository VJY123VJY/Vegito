"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Filter } from "lucide-react";
import { getProducts } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";
import { useTranslation } from "@/context/i18n-context";

const FRUIT_SUB_CATEGORIES = [
  { id: "all", label: "All Fruits", catId: undefined },
  { id: "citrus", label: "🍊 Citrus Fruits", catId: 56 },
  { id: "tropical", label: "🍌 Tropical Fruits", catId: 57 },
  { id: "melons", label: "🍉 Melons", catId: 58 },
  { id: "berries", label: "🍇 Berries & Stone Fruits", catId: 59 },
  { id: "exotic", label: "🍎 Exotic Fruits", catId: 60 },
];

export default function FruitsPage() {
  const { t } = useTranslation();
  const [selectedSub, setSelectedSub] = useState<string>("all");

  const currentCatId = useMemo(() => {
    const item = FRUIT_SUB_CATEGORIES.find((s) => s.id === selectedSub);
    return item?.catId;
  }, [selectedSub]);

  const productsQuery = useQuery({
    queryKey: ["fruits", currentCatId],
    queryFn: () =>
      getProducts({
        productType: currentCatId ? undefined : "FRUIT",
        categoryId: currentCatId,
        pageSize: 100,
      }),
    staleTime: 30_000,
  });

  const products = productsQuery.data?.items ?? [];

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 18px 80px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Header Bar */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <Link
            href="/customer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              backgroundColor: "#f1f5f9",
              color: "#334155",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#ea580c",
                textTransform: "uppercase",
              }}
            >
              100% NATURALLY RIPENED
            </span>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: "#7c2d12",
                margin: "2px 0 0",
                letterSpacing: "-0.02em",
              }}
            >
              Fresh Fruits
            </h1>
          </div>
        </div>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0" }}>
          Handpicked sweet orchard fruits and vitamin-packed citrus directly from growers.
        </p>
      </div>

      {/* Subcategory Filter Chips */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "12px",
          marginBottom: "24px",
          scrollbarWidth: "none",
        }}
      >
        {FRUIT_SUB_CATEGORIES.map((sub) => {
          const isActive = selectedSub === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSelectedSub(sub.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "14px",
                fontSize: "12.5px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                border: isActive ? "1.5px solid #ea580c" : "1px solid #e2e8f0",
                backgroundColor: isActive ? "#fff7ed" : "#ffffff",
                color: isActive ? "#c2410c" : "#475569",
                cursor: "pointer",
                boxShadow: isActive ? "0 2px 8px rgba(234, 88, 12, 0.15)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {sub.label}
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      {productsQuery.isLoading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <p>Loading fresh fruits...</p>
        </div>
      ) : productsQuery.isError ? (
        <div style={{ padding: "24px", borderRadius: "16px", backgroundColor: "#fef2f2", color: "#dc2626" }}>
          Unable to load fruits right now. Please refresh the page.
        </div>
      ) : products.length > 0 ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b" }}>
              Showing {products.length} fruit varieties
            </span>
          </div>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <p style={{ fontSize: "16px", fontWeight: 700, color: "#334155", margin: "0 0 6px" }}>
            No fruits currently available in this subcategory
          </p>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Try selecting "All Fruits" to see all available produce.
          </span>
        </div>
      )}
    </main>
  );
}

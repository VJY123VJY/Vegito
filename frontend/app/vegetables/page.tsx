"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Filter, ShoppingBag } from "lucide-react";
import { getProducts } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";
import { useTranslation } from "@/context/i18n-context";

const VEGETABLE_SUB_CATEGORIES = [
  { id: "all", label: "All Vegetables", catId: undefined },
  { id: "leafy", label: "🌿 Leafy Greens", catId: 3 },
  { id: "root", label: "🥕 Root & Tubers", catId: 4 },
  { id: "fruit_veg", label: "🍅 Fruit Vegetables", catId: 50 },
  { id: "gourds", label: "🥒 Gourds", catId: 51 },
  { id: "beans", label: "🫛 Beans & Peas", catId: 52 },
  { id: "cruciferous", label: "🥦 Cruciferous", catId: 53 },
  { id: "herbs", label: "🧄 Herbs & Fresh Greens", catId: 54 },
  { id: "specialty", label: "🌽 Specialty & Seasonal", catId: 55 },
];

export default function VegetablesPage() {
  const { t } = useTranslation();
  const [selectedSub, setSelectedSub] = useState<string>("all");

  const currentCatId = useMemo(() => {
    const item = VEGETABLE_SUB_CATEGORIES.find((s) => s.id === selectedSub);
    return item?.catId;
  }, [selectedSub]);

  const productsQuery = useQuery({
    queryKey: ["vegetables", currentCatId],
    queryFn: () =>
      getProducts({
        productType: currentCatId ? undefined : "VEGETABLE",
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
                color: "#16835b",
                textTransform: "uppercase",
              }}
            >
              100% FARM-SOURCED PRODUCE
            </span>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: "#063c32",
                margin: "2px 0 0",
                letterSpacing: "-0.02em",
              }}
            >
              Fresh Vegetables
            </h1>
          </div>
        </div>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0" }}>
          Harvested and brought direct from Solapur mandi farmers to your home.
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
        {VEGETABLE_SUB_CATEGORIES.map((sub) => {
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
                border: isActive ? "1.5px solid #16835b" : "1px solid #e2e8f0",
                backgroundColor: isActive ? "#f0fdf4" : "#ffffff",
                color: isActive ? "#166534" : "#475569",
                cursor: "pointer",
                boxShadow: isActive ? "0 2px 8px rgba(22, 131, 91, 0.15)" : "none",
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
          <p>Loading fresh vegetables from verified farmers...</p>
        </div>
      ) : productsQuery.isError ? (
        <div style={{ padding: "24px", borderRadius: "16px", backgroundColor: "#fef2f2", color: "#dc2626" }}>
          Unable to load vegetables right now. Please refresh the page.
        </div>
      ) : products.length > 0 ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b" }}>
              Showing {products.length} vegetables
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
            No vegetables currently available in this subcategory
          </p>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Try selecting "All Vegetables" to see all available produce.
          </span>
        </div>
      )}
    </main>
  );
}

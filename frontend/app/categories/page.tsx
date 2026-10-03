"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles, ArrowRight, Grid3X3, Layers } from "lucide-react";
import { getCategories, ApiCategory } from "@/lib/api/categories";
import { CategoryCard } from "@/components/category/category-card";

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "vegetables" | "fruits">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const allCategories = categoriesQuery.data ?? [];

  const isFruitCategory = (c: ApiCategory) => {
    const name = c.name.toLowerCase();
    return (
      name.includes("fruit") ||
      name.includes("citrus") ||
      name.includes("melon") ||
      name.includes("berry") ||
      name.includes("tropical")
    );
  };

  const filteredCategories = useMemo(() => {
    return allCategories.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === "vegetables") return !isFruitCategory(c);
      if (activeTab === "fruits") return isFruitCategory(c);
      return true;
    });
  }, [allCategories, searchTerm, activeTab]);

  const vegCategories = useMemo(() => {
    return filteredCategories.filter((c) => !isFruitCategory(c));
  }, [filteredCategories]);

  const fruitCategories = useMemo(() => {
    return filteredCategories.filter((c) => isFruitCategory(c));
  }, [filteredCategories]);

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 18px 80px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Header section */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#16a34a",
              textTransform: "uppercase",
            }}
          >
            MARKETPLACE CATALOG
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              backgroundColor: "#dcfce7",
              color: "#15803d",
              padding: "2px 8px",
              borderRadius: "12px",
            }}
          >
            {allCategories.length} Categories
          </span>
        </div>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 900,
            color: "#111827",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Browse by Category
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
          Explore 100% farm-fresh produce sourced daily from APMC mandi farmers.
        </p>
      </div>

      {/* Search & Filter Tabs */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}
      >
        {/* Segmented Filter Buttons */}
        <div
          style={{
            display: "inline-flex",
            backgroundColor: "#f3f4f6",
            padding: "4px",
            borderRadius: "14px",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              backgroundColor: activeTab === "all" ? "#ffffff" : "transparent",
              color: activeTab === "all" ? "#111827" : "#6b7280",
              boxShadow: activeTab === "all" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            }}
          >
            All Categories ({allCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vegetables")}
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              backgroundColor: activeTab === "vegetables" ? "#ffffff" : "transparent",
              color: activeTab === "vegetables" ? "#16a34a" : "#6b7280",
              boxShadow: activeTab === "vegetables" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            }}
          >
            🥦 Vegetables
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fruits")}
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              backgroundColor: activeTab === "fruits" ? "#ffffff" : "transparent",
              color: activeTab === "fruits" ? "#ea580c" : "#6b7280",
              boxShadow: activeTab === "fruits" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            }}
          >
            🍎 Fresh Fruits
          </button>
        </div>

        {/* Instant Search Bar */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories..."
            style={{
              width: "100%",
              padding: "9px 14px 9px 36px",
              fontSize: "13px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              color: "#111827",
              outline: "none",
            }}
          />
        </div>
      </div>

      {categoriesQuery.isLoading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#6b7280" }}>
          <p>Loading fresh market categories...</p>
        </div>
      ) : categoriesQuery.isError ? (
        <div style={{ padding: "30px", backgroundColor: "#fef2f2", borderRadius: "16px", color: "#b91c1c" }}>
          Categories are unavailable right now. Please refresh the page.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
          {/* Vegetables Section */}
          {(activeTab === "all" || activeTab === "vegetables") && vegCategories.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>🥦</span>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    Vegetable Categories
                  </h2>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#16a34a",
                      backgroundColor: "#f0fdf4",
                      padding: "2px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    {vegCategories.length} types
                  </span>
                </div>
                <Link
                  href="/products?categoryId=1"
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#16a34a",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  View All Vegetables <ArrowRight size={14} />
                </Link>
              </div>

              <div className="category-grid categories-list">
                {vegCategories.map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
            </div>
          )}

          {/* Fruits Section */}
          {(activeTab === "all" || activeTab === "fruits") && fruitCategories.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>🍎</span>
                  <h2
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    Fruit Categories
                  </h2>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#ea580c",
                      backgroundColor: "#fff7ed",
                      padding: "2px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    {fruitCategories.length} types
                  </span>
                </div>
                <Link
                  href="/products?categoryId=2"
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ea580c",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  View All Fruits <ArrowRight size={14} />
                </Link>
              </div>

              <div className="category-grid categories-list">
                {fruitCategories.map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
            </div>
          )}

          {filteredCategories.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                border: "1px dashed #d1d5db",
              }}
            >
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#374151", margin: "0 0 6px 0" }}>
                No categories matched "{searchTerm}"
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                Try searching for "Leafy", "Root", "Gourds", "Citrus" or "Berries".
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

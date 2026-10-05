"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Sparkles, Filter } from "lucide-react";
import { getProducts } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";

const POPULAR_SEARCHES = [
  { label: "Tomato (टोमॅटो)", query: "tomato" },
  { label: "Potato (बटाटा / आलू)", query: "potato" },
  { label: "Onion (कांदा / प्याज)", query: "onion" },
  { label: "Spinach (पालक)", query: "spinach" },
  { label: "Apple (सफरचंद / सेब)", query: "apple" },
  { label: "Banana (केळी)", query: "banana" },
  { label: "Mango (आंबा)", query: "mango" },
  { label: "Orange (संत्री)", query: "orange" },
  { label: "🥦 All Vegetables", query: "vegetables" },
  { label: "🍎 All Fruits", query: "fruits" },
  { label: "Leafy Greens (पालेभाज्या)", query: "leafy" },
  { label: "Citrus Fruits", query: "citrus" },
];

export default function SearchPage() {
  const [term, setTerm] = useState("");

  const query = useQuery({
    queryKey: ["products", "search", term],
    queryFn: () => getProducts({ search: term.trim(), pageSize: 100 }),
    enabled: term.trim().length >= 2,
  });

  const results = query.data?.items ?? [];

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 18px 80px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#16a34a",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          LIVE APMC MARKET SEARCH
        </p>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 900,
            color: "#111827",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Search Vegetables & Fruits
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
          Find daily produce, farm harvests, and mandi arrivals in real time.
        </p>
      </div>

      {/* Main Search Input */}
      <div
        style={{
          position: "relative",
          marginBottom: "16px",
        }}
      >
        <Search
          size={20}
          style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9ca3af",
          }}
        />
        <input
          autoFocus
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Try tomato, potato, onion, spinach, apple, banana..."
          style={{
            width: "100%",
            padding: "14px 44px 14px 44px",
            fontSize: "15px",
            fontWeight: 500,
            borderRadius: "16px",
            border: "1.5px solid #d1d5db",
            backgroundColor: "#ffffff",
            color: "#111827",
            outline: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm("")}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Popular Quick-Search Pills */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
          marginBottom: "28px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>Trending:</span>
        {POPULAR_SEARCHES.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setTerm(item.query)}
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "20px",
              border: "1px solid #e5e7eb",
              backgroundColor: term.toLowerCase() === item.query.toLowerCase() ? "#dcfce7" : "#ffffff",
              color: term.toLowerCase() === item.query.toLowerCase() ? "#15803d" : "#374151",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Results or Helper Display */}
      {term.trim().length < 2 ? (
        <div
          style={{
            textAlign: "center",
            padding: "50px 20px",
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px dashed #e5e7eb",
          }}
        >
          <Sparkles size={28} style={{ color: "#16a34a", marginBottom: "8px" }} />
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#374151", margin: "0 0 4px 0" }}>
            Type at least 2 characters to search current listings
          </p>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            Explore fresh root vegetables, leafy greens, seasonal citrus, or tropical melons.
          </span>
        </div>
      ) : query.isLoading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#6b7280" }}>
          <p>Looking up today’s fresh market arrivals for “{term}”…</p>
        </div>
      ) : query.isError ? (
        <div style={{ padding: "20px", backgroundColor: "#fef2f2", borderRadius: "14px", color: "#b91c1c" }}>
          Search is unavailable right now. Please try again.
        </div>
      ) : results.length > 0 ? (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#374151", margin: 0 }}>
              Found {results.length} result{results.length > 1 ? "s" : ""} for “{term}”
            </p>
          </div>
          <div className="product-grid results-grid">
            {results.map((p) => (
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
            border: "1px dashed #d1d5db",
          }}
        >
          <p style={{ fontSize: "16px", fontWeight: 700, color: "#374151", margin: "0 0 6px 0" }}>
            No vegetables or fruits matched “{term}”
          </p>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            Try a broader search such as "onion", "banana", "tomato", or "curry leaves".
          </span>
        </div>
      )}
    </main>
  );
}

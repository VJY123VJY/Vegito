"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ShoppingCart,
  Heart,
  Filter,
  ArrowUpDown,
  Check,
  Plus,
  Minus,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Package,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getProducts, ApiProduct } from "@/lib/api/products";
import { getCategories } from "@/lib/api/categories";
import { listFavorites, addFavorite, removeFavorite } from "@/lib/api/favorites";
import { addCartItem, getCart } from "@/lib/api/cart";
import { getErrorMessage } from "@/lib/api/client";
import { getStoredUserName } from "@/lib/api/auth";

export default function BrowseProductsPage() {
  const queryClient = useQueryClient();
  const userName = getStoredUserName();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "name">("name");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const products = useQuery({
    queryKey: ["all-products", selectedCategory, search],
    queryFn: () =>
      getProducts({
        categoryId: selectedCategory || undefined,
        search: search.trim() || undefined,
        pageSize: 50,
      }),
  });
  const favorites = useQuery({ queryKey: ["customer-favorites"], queryFn: listFavorites });
  const cart = useQuery({ queryKey: ["cart"], queryFn: getCart });

  const favSet = useMemo(() => new Set((favorites.data ?? []).map((f) => f.product_id)), [favorites.data]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (favSet.has(productId)) {
        await removeFavorite(productId);
      } else {
        await addFavorite(productId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-favorites"] });
    },
    onError: (err) => {
      setFeedbackToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedbackToast(null), 3000);
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: (sellerProductId: number) => addCartItem(sellerProductId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setFeedbackToast({ type: "success", text: "Added fresh vegetable to cart!" });
      setTimeout(() => setFeedbackToast(null), 2500);
    },
    onError: (err) => {
      setFeedbackToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedbackToast(null), 3000);
    },
  });

  // Filter and sort items
  const processedProducts = useMemo(() => {
    let list = products.data?.items ?? [];

    if (inStockOnly) {
      list = list.filter((p) => p.is_in_stock);
    }

    return list.slice().sort((a, b) => {
      const priceA = a.seller_products?.[0]?.price ? Number(a.seller_products[0].price) : Number(a.min_price || 0);
      const priceB = b.seller_products?.[0]?.price ? Number(b.seller_products[0].price) : Number(b.min_price || 0);

      if (sortBy === "price-asc") return priceA - priceB;
      if (sortBy === "price-desc") return priceB - priceA;
      return a.name.localeCompare(b.name);
    });
  }, [products.data?.items, inStockOnly, sortBy]);

  return (
    <DashboardShell
      role="customer"
      userName={userName}
      userRole="Customer"
      greeting="Fresh Harvest Vegetables"
      subtitle="Organically harvested vegetables from verified Solapur farms"
      searchPlaceholder="Search vegetables..."
      onSearchChange={(val) => setSearch(val)}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Feedback Toast */}
        {feedbackToast && (
          <div
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              backgroundColor: feedbackToast.type === "success" ? "#063c32" : "#b91c1c",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "13.5px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              zIndex: 100,
            }}
          >
            {feedbackToast.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
            {feedbackToast.text}
          </div>
        )}

        {/* Filters & Sorting Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            backgroundColor: "#ffffff",
            padding: "14px 18px",
            borderRadius: "14px",
            border: "1px solid #e1e8e2",
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", maxWidth: "100%", paddingBottom: "2px" }}>
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: selectedCategory === null ? 700 : 500,
                backgroundColor: selectedCategory === null ? "#16835b" : "#f3f4f6",
                color: selectedCategory === null ? "#ffffff" : "#4b5563",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              All Produce
            </button>
            {(categories.data ?? []).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "12.5px",
                  fontWeight: selectedCategory === cat.id ? 700 : 500,
                  backgroundColor: selectedCategory === cat.id ? "#16835b" : "#f3f4f6",
                  color: selectedCategory === cat.id ? "#ffffff" : "#4b5563",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Right Controls: Sort & In-Stock */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#4b5563", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                style={{ accentColor: "#16835b", cursor: "pointer" }}
              />
              In Stock Only
            </label>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#374151",
                backgroundColor: "#ffffff",
                cursor: "pointer",
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {products.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Fetching fresh vegetables...</p>
          </div>
        ) : products.isError ? (
          <div style={{ padding: "20px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", color: "#991b1b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} />
              <strong>Could not load vegetable listings</strong>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>{getErrorMessage(products.error)}</p>
          </div>
        ) : processedProducts.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "18px",
            }}
          >
            {processedProducts.map((p) => {
              const offer = p.seller_products?.[0];
              const displayPrice = offer?.price ? Number(offer.price) : Number(p.min_price || 0);
              const sellerName = offer?.seller_business_name || "Solapur Verified Farm";
              const isFav = favSet.has(p.id);
              const primaryImage = p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url;

              return (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e1e8e2",
                    boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 140ms ease, box-shadow 140ms ease",
                  }}
                >
                  {/* Image & Favorite button */}
                  <div
                    style={{
                      height: "140px",
                      backgroundColor: "#f0fdf4",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "44px",
                    }}
                  >
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={p.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span>🥬</span>
                    )}

                    <button
                      onClick={() => toggleFavoriteMutation.mutate(p.id)}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "#ffffff",
                        border: "none",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Heart
                        size={17}
                        color={isFav ? "#ef4444" : "#9ca3af"}
                        fill={isFav ? "#ef4444" : "none"}
                      />
                    </button>
                  </div>

                  {/* Body details */}
                  <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#063c32" }}>
                        {p.name}
                      </h4>
                      <span style={{ fontSize: "11px", color: "#62746a", fontWeight: 600 }}>
                        per {p.unit}
                      </span>
                    </div>

                    <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#62746a" }}>
                      Seller: <b style={{ color: "#374151" }}>{sellerName}</b>
                    </p>

                    <div style={{ marginTop: "auto", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "17px", fontWeight: 900, color: "#16835b" }}>
                          ₹{displayPrice.toFixed(2)}
                        </span>
                      </div>

                      {offer?.seller_product_id ? (
                        <button
                          onClick={() => addToCartMutation.mutate(offer.seller_product_id!)}
                          disabled={addToCartMutation.isPending}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 14px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: "#16835b",
                            color: "#ffffff",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "background 140ms ease",
                          }}
                        >
                          <ShoppingCart size={14} /> Add
                        </button>
                      ) : (
                        <Link
                          href={`/products/${p.id}`}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            backgroundColor: "#f3f4f6",
                            color: "#4b5563",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "60px 20px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              textAlign: "center",
            }}
          >
            <Package size={38} style={{ color: "#9ca3af", margin: "0 auto 10px" }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "16px", color: "#374151" }}>
              No vegetables found
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              Try searching for a different harvest or clear the category filter.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

"use client";

import React, { use, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ShoppingBasket,
  Sparkles,
  Heart,
  Plus,
  Minus,
  CheckCircle2,
  Store,
  ShieldCheck,
  Clock,
  MapPin,
  Package,
  TrendingUp,
  Info,
} from "lucide-react";
import { getProduct, ApiProduct } from "@/lib/api/products";
import { getProductMarketPrice } from "@/lib/api/market-intelligence";
import { addCartItem, getCart } from "@/lib/api/cart";
import { listFavorites, addFavorite, removeFavorite } from "@/lib/api/favorites";
import { isLoggedIn } from "@/lib/api/auth";

function ProductContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id: shellId } = use(params);
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") ?? shellId;

  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
    enabled: id !== "_",
  });

  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const favoritesQuery = useQuery({ queryKey: ["customer-favorites"], queryFn: listFavorites });
  const marketPriceQuery = useQuery({
    queryKey: ["product-market-price", id],
    queryFn: () => (id && id !== "_" ? getProductMarketPrice(Number(id)) : null),
    enabled: id !== "_",
    staleTime: 5 * 60 * 1000,
  });
  const marketPrice = marketPriceQuery.data;

  const isFavorite = (favoritesQuery.data ?? []).some(
    (f) => f.product_id === Number(id)
  );

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!isLoggedIn()) {
        router.push("/auth/login?role=customer");
        return;
      }
      const pId = Number(id);
      if (isFavorite) {
        await removeFavorite(pId);
      } else {
        await addFavorite(pId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-favorites"] });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async (sellerProductId: number) => {
      if (!isLoggedIn()) {
        router.push("/auth/login?role=customer");
        return;
      }
      return await addCartItem(sellerProductId, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToastMessage(`Added ${quantity} ${query.data?.unit || ""} to your basket!`);
      setTimeout(() => setToastMessage(null), 3000);
    },
    onError: (err: any) => {
      setToastMessage(err?.message || "Could not add to basket");
      setTimeout(() => setToastMessage(null), 3500);
    },
  });

  if (query.isLoading) {
    return (
      <main className="simple-page">
        <p className="helper">Loading produce details…</p>
      </main>
    );
  }

  if (query.isError || !query.data) {
    return (
      <main className="simple-page">
        <p className="inline-message">We couldn’t find that product in today’s market.</p>
        <Link href="/products" className="back-link" style={{ marginTop: "12px", display: "inline-flex" }}>
          <ChevronLeft size={16} /> Back to Browse
        </Link>
      </main>
    );
  }

  const p: ApiProduct = query.data;
  const primaryOffer = p.seller_products?.[0];
  const price = primaryOffer?.price != null ? Number(primaryOffer.price) : p.min_price != null ? Number(p.min_price) : null;
  const inStock = p.is_in_stock && (primaryOffer?.is_available ?? true);
  const sellerName = primaryOffer?.seller_business_name || "Mandi Farmer Direct";
  const sellerRating = primaryOffer?.seller_rating ? Number(primaryOffer.seller_rating).toFixed(1) : "4.9";
  const imageUrl =
    p.images?.[0]?.image_url ||
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80";
  const freshness = primaryOffer?.freshness || p.freshness;

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "24px 18px 80px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#16a34a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            fontSize: "14px",
            fontWeight: 700,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/products"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#16a34a",
            textDecoration: "none",
          }}
        >
          <ChevronLeft size={16} /> Back to Market Catalog
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "36px",
          backgroundColor: "#ffffff",
          padding: "32px",
          borderRadius: "28px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        }}
      >
        {/* Left Column: Product Image & Badges */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "380px",
              borderRadius: "22px",
              overflow: "hidden",
              backgroundColor: "#f9fafb",
            }}
          >
            <img
              src={imageUrl}
              alt={p.name}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.failed) {
                  target.dataset.failed = "true";
                  target.src = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80";
                }
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* Freshness Badge */}
            {freshness && (
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  left: "16px",
                  backgroundColor: "rgba(6, 60, 50, 0.92)",
                  backdropFilter: "blur(8px)",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={14} color="#34d399" />
                <span>{freshness.score}% {freshness.status}</span>
              </div>
            )}

            {/* Favorite Button */}
            <button
              type="button"
              onClick={() => toggleFavoriteMutation.mutate()}
              aria-label="Toggle favorite"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                color: isFavorite ? "#dc2626" : "#6b7280",
              }}
            >
              <Heart size={20} fill={isFavorite ? "#dc2626" : "none"} />
            </button>
          </div>
        </div>

        {/* Right Column: Information, Pricing, & Add to Cart */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "3px 10px",
                  borderRadius: "10px",
                  backgroundColor: inStock ? "#dcfce7" : "#fee2e2",
                  color: inStock ? "#15803d" : "#b91c1c",
                }}
              >
                {inStock ? "AVAILABLE TODAY" : "CURRENTLY OUT OF STOCK"}
              </span>
              {p.category && (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    backgroundColor: "#f3f4f6",
                    padding: "3px 10px",
                    borderRadius: "10px",
                  }}
                >
                  {p.category.name}
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: "#111827",
                margin: "0 0 10px 0",
                letterSpacing: "-0.02em",
              }}
            >
              {p.name}
            </h1>

            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
              {p.description || "Farm-fresh quality handpicked daily for maximum nutrition and crisp flavor."}
            </p>
          </div>

          {/* Pricing Box - Vegito Selling Price */}
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "#f9fafb",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#166534" }}>Vegito Doorstep Price</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: "#111827" }}>
                {price != null ? `₹${price}` : "Price Pending"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>
                Per {p.unit}
              </span>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>Farm Sorted & Delivered</div>
            </div>
          </div>

          {/* Live Solapur APMC Mandi Benchmark Card */}
          {marketPrice && (
            <div
              style={{
                borderRadius: "16px",
                border: "1px solid rgba(22, 131, 91, 0.2)",
                backgroundColor: "rgba(236, 253, 245, 0.6)",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <TrendingUp size={15} style={{ color: "#16835b" }} />
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#063c32",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    Solapur APMC Mandi Benchmark
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#16835b",
                    backgroundColor: "#ffffff",
                    padding: "2px 8px",
                    borderRadius: "8px",
                    border: "1px solid rgba(22, 131, 91, 0.15)",
                  }}
                >
                  {marketPrice.trend}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid #eef2ed",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#62746a", fontWeight: 500 }}>
                    Mandi Modal Rate
                  </div>
                  <div style={{ fontSize: "17px", fontWeight: 900, color: "#063c32", marginTop: "2px" }}>
                    ₹{Number(marketPrice.reference_price).toFixed(0)} <span style={{ fontSize: "11px", fontWeight: 500 }}>/ {marketPrice.unit}</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#ffffff",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid #eef2ed",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#62746a", fontWeight: 500 }}>
                    APMC Daily Range
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#063c32", marginTop: "2px" }}>
                    ₹{Number(marketPrice.suggested_range_min).toFixed(0)} - ₹{Number(marketPrice.suggested_range_max).toFixed(0)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <Info size={13} style={{ color: "#62746a", flexShrink: 0, marginTop: "2px" }} />
                <p style={{ margin: 0, fontSize: "10.5px", lineHeight: 1.45, color: "#62746a" }}>
                  Mandi rates are wholesale auction benchmarks reported by APMC. Vegito prices include farm sorting, quality grading, and doorstep delivery.
                  {" · "}
                  <strong>{marketPrice.source}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Seller & Origin Card */}
          <div
            style={{
              padding: "16px",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Store size={18} style={{ color: "#16a34a" }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>
                  {sellerName}
                </div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>
                  Rating: ⭐ {sellerRating} · Verified Mandi Partner
                </div>
              </div>
            </div>

            {primaryOffer?.origin && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280" }}>
                <MapPin size={14} style={{ color: "#9ca3af" }} />
                <span>Origin: <strong>{primaryOffer.origin}</strong></span>
              </div>
            )}

            {primaryOffer?.storage_condition && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280" }}>
                <Package size={14} style={{ color: "#9ca3af" }} />
                <span>Storage: <strong>{primaryOffer.storage_condition}</strong></span>
              </div>
            )}
          </div>

          {/* Quantity Stepper & Add to Cart */}
          <div style={{ display: "flex", gap: "14px", alignItems: "center", marginTop: "auto" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                backgroundColor: "#f3f4f6",
                borderRadius: "14px",
                padding: "4px",
              }}
            >
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#ffffff",
                  cursor: quantity <= 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#111827",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <Minus size={16} />
              </button>
              <span
                style={{
                  minWidth: "40px",
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: "15px",
                  color: "#111827",
                }}
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#111827",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              type="button"
              disabled={!inStock || price == null || !primaryOffer?.seller_product_id || addToCartMutation.isPending}
              onClick={() => {
                if (primaryOffer?.seller_product_id) {
                  addToCartMutation.mutate(primaryOffer.seller_product_id);
                }
              }}
              style={{
                flex: 1,
                padding: "14px 24px",
                backgroundColor: inStock && price != null ? "#16a34a" : "#9ca3af",
                color: "#ffffff",
                border: "none",
                borderRadius: "16px",
                fontSize: "14px",
                fontWeight: 800,
                cursor: inStock && price != null ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: inStock && price != null ? "0 4px 16px rgba(22, 163, 74, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <ShoppingBasket size={18} />
              <span>
                {addToCartMutation.isPending
                  ? "Adding..."
                  : inStock && price != null
                  ? `Add ${quantity} to Basket · ₹${(price * quantity).toFixed(2)}`
                  : "Currently Unavailable"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="simple-page">
          <p className="helper">Loading produce details…</p>
        </main>
      }
    >
      <ProductContent params={params} />
    </Suspense>
  );
}

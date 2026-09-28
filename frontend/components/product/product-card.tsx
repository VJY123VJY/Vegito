"use client";

import React, { useState } from "react";
import { Heart, Plus, Minus, Check, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiProduct } from "@/lib/api/products";
import { addFavorite, listFavorites, removeFavorite, type Favorite } from "@/lib/api/favorites";
import { getStoredRole } from "@/lib/api/auth";
import { ProductDetailSheet } from "./product-detail-sheet";

const VEGGIE_IMAGES: Record<string, string> = {
  tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",
  onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80",
  spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
  carrot: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80",
  cabbage: "https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=600&auto=format&fit=crop&q=80",
  brussels: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80",
  gourd: "https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?w=600&auto=format&fit=crop&q=80",
  chilli: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop&q=80",
};

function getProductPhoto(product: ApiProduct): string {
  if (product.images && product.images.length > 0 && product.images[0].image_url) {
    return product.images[0].image_url;
  }
  const lower = product.name.toLowerCase();
  for (const [key, url] of Object.entries(VEGGIE_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80";
}

interface ProductCardProps {
  product: ApiProduct;
  quantity?: number;
  onChange?: (newQty: number) => void;
  onLoginRequired?: () => void;
  onAddToCart?: (sellerProductId: number, qty: number) => void;
}

export function ProductCard({
  product,
  quantity = 0,
  onChange,
  onLoginRequired,
  onAddToCart,
}: ProductCardProps) {
  const client = useQueryClient();
  const role = getStoredRole();
  const [detailOpen, setDetailOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  const favorites = useQuery({
    queryKey: ["favorites"],
    queryFn: listFavorites,
    enabled: role === "CUSTOMER",
    staleTime: 60_000,
  });

  const isFavorite = favorites.data?.some((f) => f.product_id === product.id) ?? false;

  const favoriteMutation = useMutation<Favorite | boolean>({
    mutationFn: () => (isFavorite ? removeFavorite(product.id) : addFavorite(product.id)),
    onSuccess: () => client.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const offer = product.seller_products?.[0];
  const available = product.is_in_stock && (offer?.is_available ?? true);
  const price = offer?.price != null ? Number(offer.price) : product.min_price != null ? Number(product.min_price) : null;
  const imageUrl = getProductPhoto(product);
  const sellerName = offer?.seller_business_name || "Solapur Local Farm";

  const handleInitialAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!available) return;
    if (role && role !== "CUSTOMER") {
      onLoginRequired?.();
      return;
    }
    if (offer?.seller_product_id && onAddToCart) {
      onAddToCart(offer.seller_product_id, 1);
    } else {
      onChange?.(1);
    }
  };

  const handleQtyChange = (e: React.MouseEvent, newQty: number) => {
    e.stopPropagation();
    onChange?.(newQty);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (role !== "CUSTOMER") {
      onLoginRequired?.();
      return;
    }
    favoriteMutation.mutate();
  };

  return (
    <>
      <article
        onClick={() => setDetailOpen(true)}
        className="vegito-product-card"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "22px",
          border: "1px solid #e8eee9",
          overflow: "hidden",
          boxShadow: isPressing
            ? "0 4px 12px rgba(6, 60, 50, 0.08)"
            : "0 6px 20px rgba(6, 60, 50, 0.04)",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease",
          position: "relative",
          userSelect: "none",
        }}
        onMouseDown={() => setIsPressing(true)}
        onMouseUp={() => setIsPressing(false)}
        onTouchStart={() => setIsPressing(true)}
        onTouchEnd={() => setIsPressing(false)}
      >
        {/* Product Image Box */}
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "80%", // 5:4 aspect ratio
            backgroundColor: "#f4f7f4",
            overflow: "hidden",
          }}
        >
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.35s ease",
            }}
          />

          {/* Fresh badge */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              backgroundColor: available ? "rgba(6, 60, 50, 0.88)" : "rgba(100, 116, 106, 0.9)",
              backdropFilter: "blur(6px)",
              color: "#ffffff",
              padding: "4px 8px",
              borderRadius: "8px",
              fontSize: "10.5px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              letterSpacing: "0.02em",
            }}
          >
            {available ? (
              <>
                <span style={{ color: "#34d399" }}>●</span> Fresh Today
              </>
            ) : (
              "Sold Out"
            )}
          </div>

          {/* Heart favorite button */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(6px)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isFavorite ? "#dc2626" : "#62746a",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "transform 0.15s ease",
            }}
          >
            <Heart
              size={17}
              fill={isFavorite ? "#dc2626" : "none"}
              style={{
                transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                transform: isFavorite ? "scale(1.15)" : "scale(1)",
              }}
            />
          </button>
        </div>

        {/* Content Box */}
        <div
          style={{
            padding: "14px 14px 16px",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3
              style={{
                margin: "0 0 2px",
                fontSize: "15px",
                fontWeight: 800,
                color: "#063c32",
                lineHeight: 1.25,
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {product.name}
            </h3>

            <p
              style={{
                margin: "0 0 10px",
                fontSize: "12px",
                color: "#62746a",
                fontWeight: 600,
              }}
            >
              {sellerName} · {product.unit}
            </p>
          </div>

          {/* Price & Action Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div>
              {price != null ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span style={{ fontSize: "17px", fontWeight: 800, color: "#063c32" }}>
                    ₹{price}
                  </span>
                  <span style={{ fontSize: "11px", color: "#62746a", fontWeight: 600 }}>
                    /{product.unit}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: "12.5px", color: "#62746a", fontStyle: "italic" }}>
                  Price soon
                </span>
              )}
            </div>

            {/* Stepper or Add Button */}
            <div>
              {quantity > 0 ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "#063c32",
                    borderRadius: "12px",
                    padding: "2px",
                    boxShadow: "0 4px 12px rgba(6, 60, 50, 0.2)",
                  }}
                >
                  <button
                    onClick={(e) => handleQtyChange(e, quantity - 1)}
                    aria-label="Decrease quantity"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "9px",
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Minus size={14} />
                  </button>

                  <span
                    style={{
                      minWidth: "22px",
                      textAlign: "center",
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#ffffff",
                    }}
                  >
                    {quantity}
                  </span>

                  <button
                    onClick={(e) => handleQtyChange(e, quantity + 1)}
                    aria-label="Increase quantity"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "9px",
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInitialAdd}
                  disabled={!available}
                  style={{
                    height: "34px",
                    padding: "0 14px",
                    borderRadius: "12px",
                    backgroundColor: available ? "#e9f6ee" : "#f1f5f2",
                    color: available ? "#16835b" : "#899b90",
                    border: available ? "1.5px solid #16835b" : "1px solid #d4ded7",
                    fontSize: "12.5px",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: available ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Plus size={14} strokeWidth={3} />
                  <span>Add</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={product}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        cartQuantity={quantity}
        onAddToCart={onAddToCart}
        onUpdateCart={(q) => onChange?.(q)}
        isFavorite={isFavorite}
        onToggleFavorite={() => favoriteMutation.mutate()}
      />
    </>
  );
}
export default ProductCard;

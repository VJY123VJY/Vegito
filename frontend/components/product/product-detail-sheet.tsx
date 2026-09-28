"use client";

import React, { useState } from "react";
import Image from "next/image";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Heart, Plus, Minus, Check, Star, ShieldCheck, Truck, Sparkles } from "lucide-react";
import type { ApiProduct } from "@/lib/api/products";

const VEGGIE_IMAGES: Record<string, string> = {
  tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",
  onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80",
  spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
  carrot: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80",
  cabbage: "https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=600&auto=format&fit=crop&q=80",
  brussels: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80",
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

interface ProductDetailSheetProps {
  product: ApiProduct | null;
  isOpen: boolean;
  onClose: () => void;
  cartQuantity?: number;
  onAddToCart?: (sellerProductId: number, quantity: number) => void;
  onUpdateCart?: (quantity: number) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function ProductDetailSheet({
  product,
  isOpen,
  onClose,
  cartQuantity = 0,
  onAddToCart,
  onUpdateCart,
  isFavorite = false,
  onToggleFavorite,
}: ProductDetailSheetProps) {
  const [selectedQty, setSelectedQty] = useState(cartQuantity > 0 ? cartQuantity : 1);
  const [selectedSellerIndex, setSelectedSellerIndex] = useState(0);

  if (!product) return null;

  const sellerOffers = product.seller_products || [];
  const offer = sellerOffers[selectedSellerIndex] || sellerOffers[0];
  const price = offer?.price != null ? Number(offer.price) : product.min_price != null ? Number(product.min_price) : 0;
  const inStock = product.is_in_stock && (offer?.is_available ?? true);
  const sellerName = offer?.seller_business_name || "Solapur Local Farmers";
  const sellerRating = offer?.seller_rating || 4.8;
  const imageUrl = getProductPhoto(product);

  const handleAdd = () => {
    if (!offer?.seller_product_id) return;
    if (cartQuantity === 0) {
      onAddToCart?.(offer.seller_product_id, selectedQty);
    } else {
      onUpdateCart?.(selectedQty);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Product Image Header with badges */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "240px",
            borderRadius: "22px",
            overflow: "hidden",
            backgroundColor: "#f4f7f4",
          }}
        >
          <img
            src={imageUrl}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Freshness Badge */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "14px",
              backgroundColor: "rgba(6, 60, 50, 0.9)",
              backdropFilter: "blur(8px)",
              color: "#ffffff",
              padding: "6px 12px",
              borderRadius: "12px",
              fontSize: "11.5px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Sparkles size={14} color="#34d399" />
            <span>Farm Harvested Today</span>
          </div>

          {/* Favorite button */}
          <button
            onClick={onToggleFavorite}
            aria-label="Add to favorites"
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(8px)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isFavorite ? "#dc2626" : "#4a5a51",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
              transition: "transform 0.15s ease",
            }}
          >
            <Heart size={20} fill={isFavorite ? "#dc2626" : "none"} />
          </button>
        </div>

        {/* Title, Unit & Price */}
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#063c32",
                  letterSpacing: "-0.02em",
                }}
              >
                {product.name}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "#62746a", fontWeight: 600 }}>
                Net weight: {product.unit} · Sold by {sellerName}
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#063c32" }}>
                ₹{price}
              </div>
              <div style={{ fontSize: "12px", color: "#62746a" }}>
                per {product.unit}
              </div>
            </div>
          </div>
        </div>

        {/* Seller Info Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "#f4f8f5",
            borderRadius: "16px",
            border: "1px solid #e1ebe3",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🏡</span>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#063c32" }}>
                {sellerName}
              </p>
              <p style={{ margin: "1px 0 0", fontSize: "11.5px", color: "#62746a" }}>
                Local Solapur Mandi Verified Seller
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "20px",
              backgroundColor: "#ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              fontSize: "12px",
              fontWeight: 800,
              color: "#063c32",
            }}
          >
            <Star size={13} fill="#f59e0b" color="#f59e0b" />
            <span>{sellerRating}</span>
          </div>
        </div>

        {/* Vegito Fresh Guarantee */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "14px",
              backgroundColor: "#ffffff",
              border: "1px solid #e8eee9",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <ShieldCheck size={20} color="#16835b" />
            <div>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#063c32" }}>100% Fresh</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#62746a" }}>No questions replace</p>
            </div>
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: "14px",
              backgroundColor: "#ffffff",
              border: "1px solid #e8eee9",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Truck size={20} color="#16835b" />
            <div>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#063c32" }}>Fast Delivery</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#62746a" }}>15-30 min express</p>
            </div>
          </div>
        </div>

        {/* Seller Price Comparison (When multiple sellers available) */}
        {sellerOffers.length > 1 && (
          <div style={{ borderTop: "1px solid #f0f4f1", paddingTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "12.5px", fontWeight: 800, color: "#063c32", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Compare Local Sellers ({sellerOffers.length} available)
              </h4>
              <span style={{ fontSize: "11px", color: "#16835b", fontWeight: 700 }}>Real Mandi Rates</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {sellerOffers.map((off, idx) => {
                const isSelected = selectedSellerIndex === idx;
                return (
                  <button
                    key={off.seller_product_id || idx}
                    type="button"
                    onClick={() => setSelectedSellerIndex(idx)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: isSelected ? "1.5px solid #16835b" : "1px solid #e2e8e5",
                      backgroundColor: isSelected ? "#ecfdf5" : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#063c32" }}>
                        {off.seller_business_name || `Mandi Vendor #${idx + 1}`}
                      </div>
                      <div style={{ fontSize: "11px", color: "#62746a", marginTop: "1px" }}>
                        ⭐ {off.seller_rating || 4.8} · {off.is_available ? "In Stock" : "Limited Stock"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: isSelected ? "#16835b" : "#063c32" }}>
                        ₹{off.price}
                      </div>
                      {isSelected && (
                        <span style={{ fontSize: "10px", color: "#16835b", fontWeight: 800 }}>
                          Selected ✓
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div style={{ borderTop: "1px solid #f0f4f1", paddingTop: "14px" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#063c32", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              About this harvest
            </h4>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "#4a5a51" }}>
              {product.description}
            </p>
          </div>
        )}

        {/* Sticky Action Footer */}
        <div
          style={{
            borderTop: "1px solid #f0f4f1",
            paddingTop: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          {/* Quantity Stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#f4f8f5",
              borderRadius: "16px",
              padding: "4px",
              border: "1px solid #e1ebe3",
            }}
          >
            <button
              onClick={() => setSelectedQty((prev) => Math.max(1, prev - 1))}
              disabled={selectedQty <= 1}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                backgroundColor: selectedQty <= 1 ? "transparent" : "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: selectedQty <= 1 ? "default" : "pointer",
                color: selectedQty <= 1 ? "#a2b4a9" : "#063c32",
                boxShadow: selectedQty > 1 ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <Minus size={16} />
            </button>

            <span
              style={{
                width: "40px",
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 800,
                color: "#063c32",
              }}
            >
              {selectedQty}
            </span>

            <button
              onClick={() => setSelectedQty((prev) => prev + 1)}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                backgroundColor: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#063c32",
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Add / Update Cart CTA */}
          <button
            onClick={handleAdd}
            disabled={!inStock}
            style={{
              flex: 1,
              height: "50px",
              borderRadius: "16px",
              backgroundColor: inStock ? "#063c32" : "#94a39b",
              color: "#ffffff",
              border: "none",
              fontSize: "14.5px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: inStock ? "pointer" : "not-allowed",
              boxShadow: inStock ? "0 8px 24px rgba(6, 60, 50, 0.2)" : "none",
              transition: "transform 0.15s ease",
            }}
          >
            {inStock ? (
              <>
                <span>{cartQuantity > 0 ? "Update Basket" : "Add to Basket"}</span>
                <span>·</span>
                <span>₹{(price * selectedQty).toFixed(0)}</span>
              </>
            ) : (
              "Currently Sold Out"
            )}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

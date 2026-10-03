"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShoppingBasket,
  Clock,
  MapPin,
  Tag,
  ShieldCheck,
  Check,
  Layers,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listPromotions, type Promotion } from "@/lib/api/promotions";
import { useTranslation } from "@/context/i18n-context";

export interface DynamicFruitOffersProps {
  promotions?: Promotion[];
  autoSlideIntervalMs?: number; // Configurable interval (default 4500ms)
  onAddToCart?: (sellerProductId: number) => void;
  title?: string;
  subtitle?: string;
}

export function DynamicFruitOffers({
  promotions: initialPromotions,
  autoSlideIntervalMs = 4500,
  onAddToCart,
  title,
  subtitle,
}: DynamicFruitOffersProps) {
  const { t } = useTranslation();

  // If promotions prop not provided, fetch live active promotions from backend API
  const { data: fetchedPromotions, isLoading, isError } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => listPromotions(),
    enabled: !initialPromotions,
    staleTime: 60 * 1000,
  });

  const promotions = (initialPromotions ?? fetchedPromotions ?? []).filter(
    (p) => p.status === "ACTIVE"
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next");
  const [animatingKey, setAnimatingKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  // Auto-play interval with proper cleanup and pause-on-hover/touch
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goToNext = useCallback(() => {
    if (promotions.length <= 1) return;
    setSlideDirection("next");
    setCurrentIndex((prev) => (prev + 1) % promotions.length);
    setAnimatingKey((k) => k + 1);
  }, [promotions.length]);

  const goToPrev = useCallback(() => {
    if (promotions.length <= 1) return;
    setSlideDirection("prev");
    setCurrentIndex((prev) => (prev - 1 + promotions.length) % promotions.length);
    setAnimatingKey((k) => k + 1);
  }, [promotions.length]);

  const goToIndex = (index: number) => {
    if (index === currentIndex || index < 0 || index >= promotions.length) return;
    setSlideDirection(index > currentIndex ? "next" : "prev");
    setCurrentIndex(index);
    setAnimatingKey((k) => k + 1);
  };

  useEffect(() => {
    if (isPaused || promotions.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      goToNext();
    }, autoSlideIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, promotions.length, autoSlideIntervalMs, goToNext]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    setTouchStartX(null);
  };

  const handleQuickAdd = (sellerProductId?: number) => {
    if (!sellerProductId || !onAddToCart) return;
    onAddToCart(sellerProductId);
    setJustAddedId(sellerProductId);
    setTimeout(() => setJustAddedId(null), 1800);
  };

  if (isLoading && !initialPromotions) {
    return (
      <div style={{ margin: "24px 0", width: "100%" }}>
        <div
          style={{
            height: "280px",
            borderRadius: "24px",
            backgroundColor: "var(--vegito-surface-muted, #f4f7f4)",
            animation: "vegito-shimmer 1.5s infinite linear",
            border: "1px solid var(--vegito-border, #e1e8e2)",
          }}
        />
      </div>
    );
  }

  if (isError || promotions.length === 0) {
    return (
      <section
        style={{
          margin: "20px 0 32px",
          padding: "24px",
          borderRadius: "20px",
          border: "1px dashed var(--vegito-border, #dce8df)",
          backgroundColor: "var(--vegito-surface, #ffffff)",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "28px" }}>🍎</span>
        <h3 style={{ margin: "8px 0 4px", fontSize: "16px", fontWeight: 800, color: "var(--vegito-text-main, #063c32)" }}>
          {t("offers.title", "Fruit Offers for You")}
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--vegito-text-muted, #62746a)" }}>
          {t("offers.none", "No fruit offers available right now. Fresh mandi harvests arriving soon!")}
        </p>
      </section>
    );
  }

  const activePromo = promotions[currentIndex] || promotions[0];
  const isEvenSlide = currentIndex % 2 === 0;

  // Extract real produce metadata from backend promotion
  const primarySellerProductId = activePromo.items?.[0]?.seller_product_id;
  const primaryProductId = activePromo.product_id;
  const productName = activePromo.product_name || activePromo.title;
  const imageUrl = activePromo.image_url || "/images/placeholder-produce.jpg";
  const offerPrice = Number(activePromo.price).toFixed(0);
  const originalPrice = activePromo.original_price ? Number(activePromo.original_price).toFixed(0) : null;
  const discountPercent = activePromo.discount_percent || 15;
  const unit = activePromo.unit || "1 KG";
  const origin = activePromo.origin || "Solapur APMC Mandi";
  const freshness = activePromo.freshness_percent || 96;
  const badgeText = activePromo.badge_text || `${discountPercent}% OFF`;
  const isFamilyPack = activePromo.type === "FAMILY_PACK";

  return (
    <section
      aria-label="Dynamic Fruit Offers"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        margin: "24px 0 36px",
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "12px",
              backgroundColor: isFamilyPack ? "#fef3c7" : "#e9f6ee",
              color: isFamilyPack ? "#d97706" : "#16835b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "19px",
            }}
          >
            {isFamilyPack ? "🧺" : "🍎"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "19px",
                  fontWeight: 800,
                  color: "var(--vegito-text-main, #063c32)",
                  letterSpacing: "-0.02em",
                }}
              >
                {title || t("offers.freshDeals", "Farm-Fresh Fruit & Family Offers")}
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Live Deal
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--vegito-text-muted, #62746a)" }}>
              {subtitle || t("offers.subtitle", "Auto-sliding seasonal offers direct from Solapur APMC mandi")}
            </p>
          </div>
        </div>

        {/* Previous / Next Controls & Counter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--vegito-text-muted, #62746a)" }}>
            {currentIndex + 1} / {promotions.length}
          </span>
          <button
            onClick={goToPrev}
            aria-label="Previous Offer"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              border: "1px solid var(--vegito-border, #e1e8e2)",
              backgroundColor: "var(--vegito-surface, #ffffff)",
              color: "var(--vegito-text-main, #063c32)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              transition: "transform 0.1s",
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToNext}
            aria-label="Next Offer"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              border: "1px solid var(--vegito-border, #e1e8e2)",
              backgroundColor: "var(--vegito-surface, #ffffff)",
              color: "var(--vegito-text-main, #063c32)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              transition: "transform 0.1s",
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Main Zig-Zag Sliding Card */}
      <div
        key={animatingKey}
        className={slideDirection === "next" ? "animate-slide-enter-right" : "animate-slide-enter-left"}
        style={{
          borderRadius: "24px",
          border: isFamilyPack ? "1.5px solid #fde68a" : "1.5px solid #bbf7d0",
          background: isFamilyPack
            ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 40%, #ffffff 100%)"
            : isEvenSlide
            ? "linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f7fee7 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f0fdf4 50%, #ecfdf5 100%)",
          boxShadow: "0 12px 32px -8px rgba(6, 60, 50, 0.08), 0 4px 12px rgba(0, 0, 0, 0.03)",
          overflow: "hidden",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isEvenSlide ? "row" : "row-reverse",
            alignItems: "stretch",
            minHeight: "260px",
            flexWrap: "wrap",
          }}
        >
          {/* Produce Image Column */}
          <div
            style={{
              flex: "1 1 300px",
              minHeight: "240px",
              position: "relative",
              overflow: "hidden",
              backgroundColor: "#f4f7f4",
            }}
          >
            <img
              src={imageUrl}
              alt={productName}
              style={{
                width: "100%",
                height: "100%",
                minHeight: "240px",
                maxHeight: "340px",
                objectFit: "cover",
                display: "block",
                transition: "transform 0.4s ease",
              }}
            />

            {/* Discount Badge */}
            <div
              style={{
                position: "absolute",
                top: "14px",
                left: isEvenSlide ? "14px" : "auto",
                right: isEvenSlide ? "auto" : "14px",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                padding: "5px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 800,
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                letterSpacing: "0.5px",
              }}
            >
              <Tag size={13} />
              <span>{badgeText}</span>
            </div>

            {/* Freshness Badge */}
            <div
              style={{
                position: "absolute",
                bottom: "14px",
                left: "14px",
                backgroundColor: "rgba(6, 60, 50, 0.85)",
                backdropFilter: "blur(4px)",
                color: "#ffffff",
                padding: "5px 10px",
                borderRadius: "10px",
                fontSize: "11.5px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Sparkles size={12} color="#4ade80" />
              <span>{freshness}% Mandi Fresh</span>
            </div>

            {/* Family Pack Badge if applicable */}
            {isFamilyPack && (
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  right: isEvenSlide ? "14px" : "auto",
                  left: isEvenSlide ? "auto" : "14px",
                  backgroundColor: "#d97706",
                  color: "#ffffff",
                  padding: "5px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Layers size={12} />
                <span>FAMILY COMBO</span>
              </div>
            )}
          </div>

          {/* Produce Content Column */}
          <div
            style={{
              flex: "1 1 340px",
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              {/* Top Tag & Origin */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    backgroundColor: isFamilyPack ? "#fef3c7" : "#e9f6ee",
                    color: isFamilyPack ? "#b45309" : "#16835b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {isFamilyPack ? "Family Saver Bundle" : "Mandi Direct Special"}
                </span>

                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: "#64748b",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <MapPin size={12} color="#16835b" />
                  {origin}
                </span>
              </div>

              {/* Title */}
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#063c32",
                  lineHeight: 1.25,
                  letterSpacing: "-0.02em",
                }}
              >
                {activePromo.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: "13px",
                  color: "#475569",
                  lineHeight: 1.55,
                }}
              >
                {activePromo.description}
              </p>

              {/* Items summary if bundle */}
              {activePromo.items && activePromo.items.length > 1 && (
                <div
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.75)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    marginBottom: "14px",
                    fontSize: "12px",
                    color: "#334155",
                  }}
                >
                  <strong style={{ color: "#063c32" }}>Included in this Pack: </strong>
                  {activePromo.items
                    .map((it) => `${it.product_name || "Item"} (${Number(it.quantity)} ${it.unit || ""})`)
                    .join(" + ")}
                </div>
              )}

              {/* Price Details Block */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "26px",
                    fontWeight: 900,
                    color: "#063c32",
                    letterSpacing: "-0.03em",
                  }}
                >
                  ₹{offerPrice}
                </span>

                {originalPrice && Number(originalPrice) > Number(offerPrice) && (
                  <span
                    style={{
                      fontSize: "15px",
                      color: "#94a3b8",
                      textDecoration: "line-through",
                      fontWeight: 600,
                    }}
                  >
                    ₹{originalPrice}
                  </span>
                )}

                <span style={{ fontSize: "13px", fontWeight: 700, color: "#16835b" }}>
                  / {unit}
                </span>

                {originalPrice && Number(originalPrice) > Number(offerPrice) && (
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 800,
                      color: "#15803d",
                      backgroundColor: "#dcfce7",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    Save ₹{Number(originalPrice) - Number(offerPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* CTAs: Shop Now & Quick Add */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(22, 131, 91, 0.12)",
                flexWrap: "wrap",
              }}
            >
              <Link
                href={primaryProductId ? `/products/${primaryProductId}` : "/products"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 20px",
                  backgroundColor: "#063c32",
                  color: "#ffffff",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(6, 60, 50, 0.18)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{t("common.shopNow", "Shop This Offer")}</span>
                <ArrowRight size={15} />
              </Link>

              {onAddToCart && primarySellerProductId && (
                <button
                  type="button"
                  onClick={() => handleQuickAdd(primarySellerProductId)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 18px",
                    borderRadius: "12px",
                    border: "1.5px solid #16835b",
                    backgroundColor: justAddedId === primarySellerProductId ? "#dcfce7" : "#ffffff",
                    color: justAddedId === primarySellerProductId ? "#15803d" : "#16835b",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {justAddedId === primarySellerProductId ? (
                    <>
                      <Check size={16} />
                      <span>Added!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBasket size={16} />
                      <span>+ Add to Basket</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Dots with Active Progress Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "14px",
        }}
      >
        {promotions.map((p, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={p.id || idx}
              onClick={() => goToIndex(idx)}
              aria-label={`Go to offer ${idx + 1}: ${p.title}`}
              style={{
                height: "8px",
                width: isActive ? "28px" : "8px",
                borderRadius: "999px",
                backgroundColor: isActive ? "#063c32" : "#cbd5e1",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.25s ease",
                boxShadow: isActive ? "0 2px 6px rgba(6, 60, 50, 0.25)" : "none",
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

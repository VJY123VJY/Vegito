"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ApiProduct } from "@/lib/api/products";
import { ProductCard } from "./product-card";
import { Sparkles, Leaf } from "lucide-react";

interface ZigZagProductSectionProps {
  products: ApiProduct[];
  cartQuantityByProduct: Record<number, { qty: number }>;
  onProductQtyChange?: (product: ApiProduct, newQty: number) => void;
  onAddToCart?: (sellerProductId: number, qty: number) => void;
  onLoginRequired?: () => void;
  title?: string;
  subtitle?: string;
}

export function ZigZagProductSection({
  products,
  cartQuantityByProduct,
  onProductQtyChange,
  onAddToCart,
  onLoginRequired,
  title = "Fresh Near You",
  subtitle = "Direct mandi harvest with verified freshness",
}: ZigZagProductSectionProps) {
  // IntersectionObserver to animate cards into view
  const [visibleCardIds, setVisibleCardIds] = useState<Set<number>>(new Set());
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      // Fallback: make all visible
      setVisibleCardIds(new Set(products.map((p) => p.id)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute("data-product-id"));
            if (id) {
              setVisibleCardIds((prev) => {
                const next = new Set(prev);
                next.add(id);
                return next;
              });
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.12, rootMargin: "50px 0px" }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [products]);

  if (!products || products.length === 0) {
    return null;
  }

  // Split into alternating Left (even index: 0, 2, 4...) and Right (odd index: 1, 3, 5...) columns
  const leftColumn = products.filter((_, idx) => idx % 2 === 0);
  const rightColumn = products.filter((_, idx) => idx % 2 === 1);

  return (
    <section
      aria-label="Fresh Near You Zig-Zag Produce"
      style={{
        width: "100%",
        margin: "12px 0 24px",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🥬</span>
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 800,
                color: "var(--vegito-text-main, #063c32)",
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
          </div>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: "13px",
              color: "var(--vegito-text-muted, #62746a)",
            }}
          >
            {subtitle}
          </p>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            borderRadius: "10px",
            backgroundColor: "rgba(22, 131, 91, 0.08)",
            color: "#16835b",
            fontSize: "11.5px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <Leaf size={13} />
          <span>Farm Fresh</span>
        </div>
      </div>

      {/* ── ZIG-ZAG 2-COLUMN STAGGERED LAYOUT ──────────────────── */}
      {/* Left column starts at top, Right column is vertically offset by 28px */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "14px",
          alignItems: "start",
        }}
      >
        {/* Left Column (Even products) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {leftColumn.map((product) => {
            const isVisible = visibleCardIds.has(product.id);
            const cartQty = cartQuantityByProduct[product.id]?.qty ?? 0;

            return (
              <div
                key={product.id}
                data-product-id={product.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(product.id, el);
                  else cardRefs.current.delete(product.id);
                }}
                className={isVisible ? "animate-zigzag-left" : ""}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "none" : "translateX(-32px) scale(0.96)",
                  transition: "opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <ProductCard
                  product={product}
                  quantity={cartQty}
                  onChange={(newQty) => onProductQtyChange?.(product, newQty)}
                  onAddToCart={onAddToCart}
                  onLoginRequired={onLoginRequired}
                />
              </div>
            );
          })}
        </div>

        {/* Right Column (Odd products — Staggered offset downward) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            paddingTop: "24px", // Organic vertical stagger
          }}
        >
          {rightColumn.map((product) => {
            const isVisible = visibleCardIds.has(product.id);
            const cartQty = cartQuantityByProduct[product.id]?.qty ?? 0;

            return (
              <div
                key={product.id}
                data-product-id={product.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(product.id, el);
                  else cardRefs.current.delete(product.id);
                }}
                className={isVisible ? "animate-zigzag-right" : ""}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "none" : "translateX(32px) scale(0.96)",
                  transition: "opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <ProductCard
                  product={product}
                  quantity={cartQty}
                  onChange={(newQty) => onProductQtyChange?.(product, newQty)}
                  onAddToCart={onAddToCart}
                  onLoginRequired={onLoginRequired}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

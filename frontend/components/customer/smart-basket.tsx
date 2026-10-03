"use client";

import React, { useState, useMemo } from "react";
import { ShoppingBag, Sparkles, Check, Plus, AlertCircle, Loader2 } from "lucide-react";
import type { ApiProduct } from "@/lib/api/products";
import { addCartItem } from "@/lib/api/cart";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/api/client";
import { isLoggedIn } from "@/lib/api/auth";
import { useRouter } from "next/navigation";

interface SmartBasketProps {
  products: ApiProduct[];
  onSuccess?: (msg: string) => void;
}

interface PresetBasket {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  keywords: string[];
}

const PRESET_BASKETS: PresetBasket[] = [
  {
    id: "weekly-veg",
    name: "Weekly Vegetable Basket",
    subtitle: "Essential daily veggies for home cooking",
    icon: "🥬",
    keywords: ["tomato", "potato", "onion", "spinach", "chilli", "ginger", "carrot"],
  },
  {
    id: "family-mandi",
    name: "Family Produce Basket",
    subtitle: "A mix of vegetables for everyday meals",
    icon: "👨‍👩‍👧‍👦",
    keywords: ["tomato", "potato", "onion", "cabbage", "gourd", "coriander", "lemon", "cauliflower"],
  },
  {
    id: "healthy-fruits",
    name: "Fruit Basket",
    subtitle: "A mix of fruit currently listed on Vegito",
    icon: "🍎",
    keywords: ["apple", "banana", "orange", "papaya", "pomegranate", "guava", "melon", "watermelon"],
  },
  {
    id: "budget-saver",
    name: "Everyday Essentials Basket",
    subtitle: "A quick mix of common kitchen essentials",
    icon: "💰",
    keywords: ["potato", "onion", "tomato", "green"],
  },
];

export function SmartBasket({ products, onSuccess }: SmartBasketProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedBasketId, setSelectedBasketId] = useState<string>("weekly-veg");
  const [addingAll, setAddingAll] = useState(false);

  const selectedPreset = useMemo(
    () => PRESET_BASKETS.find((b) => b.id === selectedBasketId) || PRESET_BASKETS[0],
    [selectedBasketId]
  );

  // Match actual backend products based on keywords
  const matchedItems = useMemo(() => {
    return selectedPreset.keywords.flatMap((kw) => {
      const match = products.find((p) => {
        const text = `${p.name} ${p.description || ""}`.toLowerCase();
        return text.includes(kw);
      });
      if (!match) return [];
      const firstOffer = match?.seller_products?.[0];
      const isAvailable = Boolean(
        match.is_in_stock &&
        firstOffer?.seller_product_id &&
        (firstOffer.is_available ?? true)
      );
      return [{
        keyword: kw,
        product: match,
        isAvailable,
        sellerProductId: firstOffer?.seller_product_id,
        price: firstOffer?.price != null
          ? Number(firstOffer.price)
          : match.min_price != null
          ? Number(match.min_price)
          : null,
      }];
    });
  }, [selectedPreset, products]);

  const availableItems = matchedItems.filter((it) => it.isAvailable && it.sellerProductId);
  const totalBasketCost = availableItems.reduce((acc, it) => acc + (it.price ?? 0), 0);

  const handleAddAvailableToCart = async () => {
    if (!isLoggedIn()) {
      router.push("/auth/login?role=customer");
      return;
    }
    if (availableItems.length === 0) return;

    setAddingAll(true);
    try {
      for (const item of availableItems) {
        if (item.sellerProductId) {
          await addCartItem(item.sellerProductId, 1);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      onSuccess?.(`Added ${availableItems.length} available produce items from ${selectedPreset.name}!`);
    } catch (err) {
      console.warn("Error adding basket items:", err);
    } finally {
      setAddingAll(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "24px",
        border: "1.5px solid #dce8df",
        padding: "24px 20px",
        boxShadow: "0 6px 24px rgba(6, 60, 50, 0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "22px" }}>🛒</span>
            <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#063c32", letterSpacing: "-0.02em" }}>
              Smart Basket Builder
            </h2>
          </div>
          <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#62746a" }}>
            Quick combinations of products currently listed on Vegito
          </p>
        </div>
      </div>

      {/* Preset Basket Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "8px",
          marginBottom: "20px",
        }}
      >
        {PRESET_BASKETS.map((b) => {
          const isSelected = selectedBasketId === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBasketId(b.id)}
              style={{
                padding: "10px 8px",
                borderRadius: "14px",
                border: isSelected ? "2px solid #16835b" : "1px solid #e1e8e2",
                backgroundColor: isSelected ? "#ecfdf5" : "#f8faf8",
                color: isSelected ? "#16835b" : "#475569",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "20px" }}>{b.icon}</span>
              <span style={{ fontSize: "12px", fontWeight: isSelected ? 800 : 600, textAlign: "center", lineHeight: 1.2 }}>
                {b.name.replace(" Basket", "")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Basket Preview */}
      <div
        style={{
          backgroundColor: "#f4f8f5",
          borderRadius: "18px",
          padding: "16px",
          border: "1px solid #dce8df",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "18px" }}>{selectedPreset.icon}</span>
              <h3 style={{ margin: 0, fontSize: "15.5px", fontWeight: 800, color: "#063c32" }}>
                {selectedPreset.name}
              </h3>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
              {selectedPreset.subtitle}
            </p>
          </div>

        </div>

        {/* Item check list */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "8px",
          }}
        >
          {matchedItems.length > 0 ? matchedItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "12px",
                backgroundColor: item.isAvailable ? "#ffffff" : "#f1f5f2",
                border: item.isAvailable ? "1px solid #c7e3d2" : "1px dashed #cbd5e1",
                opacity: item.isAvailable ? 1 : 0.7,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <span style={{ fontSize: "12px", color: item.isAvailable ? "#16835b" : "#94a3b8" }}>
                  {item.isAvailable ? "✓" : "○"}
                </span>
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: item.isAvailable ? "#063c32" : "#64748b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                    {item.product.name}
                </span>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {item.isAvailable ? (
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#16835b" }}>
                    {item.price != null ? `₹${item.price}` : "Price unavailable"}
                  </span>
                ) : (
                  <span style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 600 }}>
                    Currently unavailable
                  </span>
                )}
              </div>
            </div>
          )) : (
            <p style={{ margin: 0, color: "#62746a", fontSize: "13px" }}>
              No matching products are listed right now.
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "12px", color: "#62746a" }}>
            Available Items: <strong>{availableItems.length} / {matchedItems.length}</strong>
          </div>
          <div style={{ fontSize: "16px", fontWeight: 900, color: "#063c32" }}>
            Total: {availableItems.length > 0 && availableItems.some((item) => item.price == null)
              ? "Price unavailable"
              : `₹${totalBasketCost.toFixed(0)}`}
          </div>
        </div>

        <button
          onClick={handleAddAvailableToCart}
          disabled={addingAll || availableItems.length === 0}
          style={{
            padding: "12px 22px",
            borderRadius: "14px",
            backgroundColor: availableItems.length > 0 ? "#063c32" : "#94a3b8",
            color: "#ffffff",
            border: "none",
            fontSize: "13.5px",
            fontWeight: 800,
            cursor: availableItems.length > 0 ? "pointer" : "not-allowed",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: availableItems.length > 0 ? "0 4px 14px rgba(6, 60, 50, 0.25)" : "none",
            transition: "all 0.2s",
          }}
        >
          {addingAll ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Adding items...</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Add Available Items ({availableItems.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

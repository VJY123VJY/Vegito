"use client";

import React from "react";
import type { ApiCategory } from "@/lib/api/categories";

const CATEGORY_EMOJIS: Record<string, string> = {
  leafy: "🥬",
  spinach: "🥬",
  greens: "🥬",
  tomato: "🍅",
  potato: "🥔",
  onion: "🧅",
  root: "🥕",
  carrot: "🥕",
  gourd: "🥒",
  squash: "🥒",
  cabbage: "🥦",
  cruciferous: "🥦",
  beans: "🫛",
  peas: "🫛",
  specialty: "🍄",
  citrus: "🍊",
  tropical: "🥭",
  melon: "🍉",
  berries: "🍓",
  stone: "🍎",
  exotic: "🥝",
  herbs: "🌿",
  chilli: "🌶️",
  fruit: "🍎",
  vegetable: "🥗",
  staple: "🌾",
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_EMOJIS)) {
    if (lower.includes(key)) return icon;
  }
  return "🥦";
}

interface CategoryCarouselProps {
  categories: ApiCategory[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  isLoading?: boolean;
}

export function CategoryCarousel({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isLoading = false,
}: CategoryCarouselProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          paddingBottom: "8px",
          scrollbarWidth: "none",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: "100px",
              height: "44px",
              borderRadius: "16px",
              backgroundColor: "#f0f4f1",
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        overflowX: "auto",
        paddingBottom: "6px",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      className="category-scroll-container"
    >
      {/* "All" Option */}
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          borderRadius: "18px",
          backgroundColor: selectedCategoryId === null ? "#063c32" : "#ffffff",
          color: selectedCategoryId === null ? "#ffffff" : "#13221b",
          border: selectedCategoryId === null ? "1.5px solid #063c32" : "1px solid #e1e8e2",
          fontSize: "13.5px",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: selectedCategoryId === null
            ? "0 4px 14px rgba(6, 60, 50, 0.18)"
            : "0 2px 6px rgba(6, 60, 50, 0.03)",
          transition: "all 0.15s ease",
        }}
      >
        <span style={{ fontSize: "17px" }}>🧺</span>
        <span>All Produce</span>
      </button>

      {/* Categories from backend */}
      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        const icon = getCategoryIcon(cat.name);

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(isSelected ? null : cat.id)}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "18px",
              backgroundColor: isSelected ? "#063c32" : "#ffffff",
              color: isSelected ? "#ffffff" : "#13221b",
              border: isSelected ? "1.5px solid #063c32" : "1px solid #e1e8e2",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: isSelected
                ? "0 4px 14px rgba(6, 60, 50, 0.18)"
                : "0 2px 6px rgba(6, 60, 50, 0.03)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "17px" }}>{icon}</span>
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
export default CategoryCarousel;

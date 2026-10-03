"use client";

import React from "react";
import { type Promotion } from "@/lib/api/promotions";
import { DynamicFruitOffers } from "@/components/offers/dynamic-fruit-offers";

interface ZigZagOffersProps {
  promotions: Promotion[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onAddToCart?: (sellerProductId: number) => void;
}

export function ZigZagOffers({
  promotions,
  onAddToCart,
}: ZigZagOffersProps) {
  return (
    <DynamicFruitOffers
      promotions={promotions}
      autoSlideIntervalMs={4500}
      onAddToCart={onAddToCart}
    />
  );
}

"use client";

import React from "react";
import { type Promotion } from "@/lib/api/promotions";
import { ZigZagOffersView } from "@/components/offers/zigzag-offers-view";

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
    <ZigZagOffersView
      promotions={promotions}
      onAddToCart={onAddToCart}
    />
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, RefreshCw, ShoppingCart, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPromotions } from "@/lib/api/promotions";
import { addCartItem } from "@/lib/api/cart";
import { ZigZagOffersView } from "@/components/offers/zigzag-offers-view";
import { useTranslation } from "@/context/i18n-context";

export default function CustomerOffersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "BUNDLE" | "DISCOUNT">("ALL");

  const { data: promotions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => listPromotions(),
    staleTime: 60 * 1000,
  });

  const cartMutation = useMutation({
    mutationFn: (spId: number) => addCartItem(spId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const filteredPromotions = promotions.filter((p) => {
    if (selectedFilter === "ALL") return true;
    return p.type === selectedFilter;
  });

  return (
    <div className="min-h-screen bg-[var(--vegito-bg,#f6f9f6)] text-zinc-900 dark:text-zinc-100 pb-24">
      {/* Top Header Banner */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/customer"
              className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-black tracking-tight leading-none text-zinc-900 dark:text-white">
                  {t("offers.title", "Special Harvest Deals & Offers")}
                </h1>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  {promotions.length} {t("offers.activeDeals", "Active Harvest Offers")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl text-zinc-500 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Refresh Offers"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/customer/cart"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t("nav.myCart", "Cart")}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 pt-8">
        {/* Hero Section */}
        <div className="mb-8 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-emerald-200 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("offers.limitedTime", "Limited Time Mandi Deals")}</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-2">
              {t("offers.title", "Special Harvest Deals & Offers")}
            </h2>
            <p className="text-emerald-100/90 text-sm md:text-base leading-relaxed">
              {t("offers.subtitle", "Direct savings on farm-fresh produce and daily fruit baskets")}
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-6 relative z-10">
            <button
              onClick={() => setSelectedFilter("ALL")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                selectedFilter === "ALL"
                  ? "bg-white text-emerald-950 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              All Harvest Offers ({promotions.length})
            </button>
            <button
              onClick={() => setSelectedFilter("DISCOUNT")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                selectedFilter === "DISCOUNT"
                  ? "bg-white text-emerald-950 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Direct Produce Deals
            </button>
            <button
              onClick={() => setSelectedFilter("BUNDLE")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                selectedFilter === "BUNDLE"
                  ? "bg-white text-emerald-950 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Family Combos & Baskets
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="text-center py-12 p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200">
            <p className="font-bold text-base mb-2">Unable to load active harvest offers</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Zig-Zag Offer Feed */}
        {!isLoading && !isError && (
          <ZigZagOffersView
            promotions={filteredPromotions}
            onAddToCart={(spId) => cartMutation.mutate(spId)}
          />
        )}
      </main>
    </div>
  );
}

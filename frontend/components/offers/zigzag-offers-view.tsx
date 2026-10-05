"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShoppingBasket, Check, Tag, ShieldCheck, MapPin, Clock } from "lucide-react";
import type { Promotion } from "@/lib/api/promotions";
import { useTranslation } from "@/context/i18n-context";

interface ZigZagOffersViewProps {
  promotions: Promotion[];
  onAddToCart?: (sellerProductId: number) => void;
}

export function ZigZagOffersView({ promotions, onAddToCart }: ZigZagOffersViewProps) {
  const { t } = useTranslation();
  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});

  const handleAdd = (promo: Promotion) => {
    if (promo.items && promo.items.length > 0) {
      const spId = promo.items[0].seller_product_id;
      if (onAddToCart) {
        onAddToCart(spId);
      }
      setAddedIds((prev) => ({ ...prev, [promo.id]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [promo.id]: false }));
      }, 2000);
    }
  };

  if (!promotions || promotions.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white/60 dark:bg-zinc-900/60 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 backdrop-blur-sm">
        <Sparkles className="w-12 h-12 mx-auto text-emerald-600 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          {t("offers.noOffers", "No active offers right now. Check back soon for fresh harvest deals!")}
        </h3>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          {t("offers.subtitle", "Direct savings on farm-fresh produce and daily fruit baskets")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12">
      {promotions.map((promo, index) => {
        const isReversed = index % 2 === 1;
        const discountPct = promo.discount_percent ?? (
          promo.original_price && Number(promo.original_price) > Number(promo.price)
            ? Math.round(((Number(promo.original_price) - Number(promo.price)) / Number(promo.original_price)) * 100)
            : null
        );

        const primarySpId = promo.items?.[0]?.seller_product_id;
        const targetHref = promo.product_id ? `/products/${promo.product_id}` : "/customer";
        const isAdded = !!addedIds[promo.id];

        return (
          <article
            key={promo.id}
            className={`group relative overflow-hidden rounded-3xl border border-emerald-950/10 dark:border-emerald-500/10 bg-white/80 dark:bg-zinc-900/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col ${
              isReversed ? "md:flex-row-reverse" : "md:flex-row"
            } items-stretch`}
          >
            {/* Visual Media Column */}
            <div className="relative w-full md:w-1/2 min-h-[260px] md:min-h-[340px] overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
              {promo.image_url ? (
                <img
                  src={promo.image_url}
                  alt={promo.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.failed) {
                      target.dataset.failed = "true";
                      target.src = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80";
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-emerald-800 dark:text-emerald-300">
                  <ShoppingBasket className="w-20 h-20 opacity-40 mb-2" />
                  <span className="font-semibold text-sm">Vegito Harvest</span>
                </div>
              )}

              {/* Discount / Badge Pill */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                {discountPct ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-md">
                    <Tag className="w-3.5 h-3.5" />
                    {discountPct}% {t("offers.off", "OFF")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-600 text-white shadow-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    {promo.badge_text || t("offers.limitedTime", "Limited Deal")}
                  </span>
                )}
                {promo.freshness_percent && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-200 backdrop-blur-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {promo.freshness_percent}% Fresh
                  </span>
                )}
              </div>
            </div>

            {/* Content Column */}
            <div className="flex-1 p-6 md:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{promo.origin || t("offers.mandiDirect", "Direct from APMC Farmers")}</span>
                  {promo.shelf_life_days && (
                    <>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{promo.shelf_life_days} Days Shelf Life</span>
                    </>
                  )}
                </div>

                <h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {promo.title}
                </h3>

                <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6 line-clamp-3">
                  {promo.description ||
                    `${promo.product_name || "Farm produce"} specially packaged for maximum freshness and direct farmer value.`}
                </p>

                {/* Bundle items list if multi-item */}
                {promo.items && promo.items.length > 1 && (
                  <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs space-y-1.5">
                    <div className="font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                      Bundle Includes:
                    </div>
                    {promo.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-zinc-700 dark:text-zinc-300">
                        <span>• {it.product_name || "Produce item"}</span>
                        <span className="font-medium text-emerald-800 dark:text-emerald-300">{Number(it.quantity).toFixed(1)} {it.unit || "kg"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing & Actions Row */}
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl md:text-3xl font-black text-emerald-800 dark:text-emerald-400 tracking-tight">
                    ₹{Number(promo.price).toFixed(0)}
                  </span>
                  {promo.original_price && Number(promo.original_price) > Number(promo.price) && (
                    <span className="text-sm md:text-base text-zinc-400 line-through">
                      ₹{Number(promo.original_price).toFixed(0)}
                    </span>
                  )}
                  {promo.unit && (
                    <span className="text-xs text-zinc-500 font-medium">
                      / {promo.unit}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <Link
                    href={targetHref}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <span>{t("offers.shopNow", "Shop Now")}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {primarySpId && (
                    <button
                      onClick={() => handleAdd(promo)}
                      disabled={isAdded}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                        isAdded
                          ? "bg-emerald-600 cursor-default"
                          : "bg-emerald-700 hover:bg-emerald-800 active:scale-95"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBasket className="w-3.5 h-3.5" />
                          <span>{t("customer.addToCart", "Add to Cart")}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

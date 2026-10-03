"use client";

import React from "react";
import Link from "next/link";
import { Store, ShieldCheck, MapPin, Star, Package, ChevronRight } from "lucide-react";
import { type NearbySeller } from "@/lib/api/customers";

interface NearbySellersSectionProps {
  sellers: NearbySeller[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function NearbySellersSection({ sellers, isLoading, isError, onRetry }: NearbySellersSectionProps) {
  if (isLoading) {
    return (
      <section className="my-6 px-4">
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 w-64 shrink-0 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800"
            />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="my-6 px-4" aria-label="Nearby sellers">
        <p className="text-sm text-stone-600 dark:text-stone-300">Nearby sellers are unavailable right now.</p>
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Try again
        </button>
      </section>
    );
  }

  if (!sellers || sellers.length === 0) {
    return (
      <section className="my-6 px-4" aria-label="Nearby sellers">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Sellers near you</h2>
        <p className="mt-2 rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300">
          No nearby sellers are available for this location right now.
        </p>
      </section>
    );
  }

  return (
    <section className="my-6 px-4" aria-label="Nearby Mandi Sellers">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Nearby Sellers & Mandi Stalls
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Sellers located within 15 km of your selected location
            </p>
          </div>
        </div>
      </div>

      <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2 pt-1">
        {sellers.map((seller) => (
          <div
            key={seller.id}
            className="group relative flex min-w-[240px] sm:min-w-[270px] shrink-0 flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs transition-all hover:border-emerald-500/40 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <div>
              {/* Header with Verified Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                    {seller.business_name}
                  </h3>
                  <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                    {seller.address}
                  </p>
                </div>

                {seller.is_verified && (
                  <span
                    title="Vegito Verified Seller"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span>VERIFIED</span>
                  </span>
                )}
              </div>

              {/* Stats: Distance, Rating, Active Products */}
              <div className="mt-3 flex items-center gap-3 text-xs text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  {seller.distance_km.toFixed(1)} km
                </span>

                {Number(seller.rating) > 0 && (
                  <span className="flex items-center gap-1 font-medium">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {Number(seller.rating).toFixed(1)}
                  </span>
                )}

                <span className="flex items-center gap-1 text-[11px] text-stone-500">
                  <Package className="h-3 w-3" />
                  {seller.active_products_count} items
                </span>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <span className="text-[11px] text-stone-400">
                {seller.business_type?.replace("_", " ") || "Business type unavailable"}
              </span>
              <a
                href="#products"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <span>View Produce</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

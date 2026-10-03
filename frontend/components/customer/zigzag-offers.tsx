"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { type Promotion } from "@/lib/api/promotions";

interface ZigZagOffersProps {
  promotions: Promotion[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function ZigZagOffers({ promotions, isLoading, isError, onRetry }: ZigZagOffersProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Auto carousel that pauses on hover/touch
  useEffect(() => {
    if (isPaused || !promotions || promotions.length < 2) return;

    const interval = setInterval(() => {
      if (containerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
        const maxScroll = scrollWidth - clientWidth;
        const nextScroll = scrollLeft >= maxScroll - 10 ? 0 : scrollLeft + 320;
        containerRef.current.scrollTo({
          left: nextScroll,
          behavior: "smooth",
        });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, promotions]);

  // Touch and drag support for mobile / desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

  if (isLoading) {
    return (
      <div className="my-6 px-4">
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 w-72 shrink-0 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <section className="my-6 px-4" aria-label="Fresh offers">
        <p className="text-sm text-stone-600 dark:text-stone-300">Offers are unavailable right now.</p>
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Try again
        </button>
      </section>
    );
  }

  if (!promotions || promotions.length === 0) {
    return (
      <section className="my-6 px-4" aria-label="Fresh offers">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Fresh offers</h2>
        <p className="mt-2 rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300">
          Fresh offers will appear here soon.
        </p>
      </section>
    );
  }

  return (
    <section className="my-8 px-4" aria-label="Special Offers">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-xl">
              Special Offers & Deals
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Active offers from Vegito sellers
            </p>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          setIsDragging(false);
        }}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="no-scrollbar flex gap-4 overflow-x-auto pb-4 pt-3 cursor-grab active:cursor-grabbing scroll-smooth select-none"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {promotions.map((promo, idx) => {
          // Subtle zig-zag offset calculation (alternating vertical offset)
          const isEven = idx % 2 === 0;
          const verticalOffset = isEven ? "-translate-y-1.5" : "translate-y-1.5";
          const itemSummary = promo.items
            .filter((item) => item.product_name)
            .map((item) => `${item.product_name} × ${item.quantity}`)
            .join(" · ");
          const priceLabel = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
          }).format(promo.price);

          return (
            <div
              key={promo.id || idx}
              style={{ scrollSnapAlign: "start" }}
              className={`group relative flex min-w-[280px] sm:min-w-[340px] max-w-[360px] shrink-0 flex-col justify-between rounded-2xl border border-stone-200/80 bg-gradient-to-br from-white via-stone-50 to-emerald-50/30 p-5 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-md dark:border-stone-800 dark:from-stone-900 dark:via-stone-900 dark:to-emerald-950/20 ${verticalOffset}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-emerald-700 dark:text-emerald-300"
                >
                  {promo.is_repeat_only ? "Repeat customer offer" : "Active offer"}
                </span>
              </div>

              {/* Title & Description */}
              <div className="my-3">
                <h3 className="line-clamp-1 text-base font-bold text-stone-900 dark:text-stone-100">
                  {promo.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-stone-600 dark:text-stone-400">
                  {promo.description || "Offer details are provided by the seller."}
                </p>
                {itemSummary && (
                  <p className="mt-2 line-clamp-2 text-xs text-stone-600 dark:text-stone-400">
                    {itemSummary}
                  </p>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{priceLabel}</span>
                <Link
                  href="/search"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-emerald-500 dark:hover:text-white"
                >
                  <span>{promo.eligible === false ? "Browse products" : "View products"}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

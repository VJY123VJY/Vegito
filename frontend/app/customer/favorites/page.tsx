"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Check,
  AlertCircle,
  Package,
} from "lucide-react";
import { listFavorites, removeFavorite } from "@/lib/api/favorites";
import { getProducts, ApiProduct } from "@/lib/api/products";
import { addCartItem } from "@/lib/api/cart";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getStoredUserName } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

export default function CustomerFavoritesPage() {
  const queryClient = useQueryClient();
  const userName = getStoredUserName();
  const [toast, setToast] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const favoritesQuery = useQuery({
    queryKey: ["customer-favorites"],
    queryFn: listFavorites,
  });

  const productsQuery = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => getProducts({ pageSize: 100 }),
  });

  const favProductIds = new Set((favoritesQuery.data ?? []).map((f) => f.product_id));
  const favoriteProducts = (productsQuery.data?.items ?? []).filter((p) => favProductIds.has(p.id));

  const removeFavMut = useMutation({
    mutationFn: (productId: number) => removeFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-favorites"] });
      setToast({ type: "success", text: "Removed from favorites." });
      setTimeout(() => setToast(null), 2500);
    },
    onError: (err) => {
      setToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const addToCartMut = useMutation({
    mutationFn: (sellerProductId: number) => addCartItem(sellerProductId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ type: "success", text: "Added to your basket!" });
      setTimeout(() => setToast(null), 2500);
    },
    onError: (err) => {
      setToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setToast(null), 3000);
    },
  });

  return (
    <RoleGuard allow={["CUSTOMER"]}>
      <DashboardShell
        role="customer"
        userName={userName}
        userRole="Customer"
        greeting="My Favorite Vegetables"
        subtitle="Quickly re-order fresh farm produce you love"
      >
        {toast && (
          <div
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              zIndex: 100,
              backgroundColor: toast.type === "success" ? "#063c32" : "#dc2626",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              fontSize: "13.5px",
              fontWeight: 700,
            }}
          >
            {toast.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{toast.text}</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <Link
            href="/customer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              color: "#063c32",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <span style={{ fontSize: "14px", color: "#62746a" }}>
            {favoriteProducts.length} {favoriteProducts.length === 1 ? "vegetable" : "vegetables"} saved
          </span>
        </div>

        {favoritesQuery.isLoading || productsQuery.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            Loading your favorites...
          </div>
        ) : favoriteProducts.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              border: "1px solid #e1e8e2",
              padding: "60px 24px",
              textAlign: "center",
              maxWidth: "540px",
              margin: "0 auto",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>❤️</div>
            <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
              No Favorite Vegetables Yet
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#62746a" }}>
              Browse today&apos;s fresh harvest on your dashboard and tap the heart icon to save vegetables here for 1-click reordering.
            </p>
            <Link
              href="/customer"
              style={{
                display: "inline-block",
                padding: "10px 24px",
                borderRadius: "10px",
                backgroundColor: "#16835b",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Browse Vegetables
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            {favoriteProducts.map((p) => {
              const offer = p.seller_products?.[0];
              const sellerProductId = offer?.seller_product_id || p.id;
              const sellerName = offer?.seller_business_name || "Green Farm Store";
              const price = offer?.price ? Number(offer.price) : Number(p.min_price || 40);

              return (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "18px",
                    border: "1px solid #e1e8e2",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                  }}
                >
                  <div
                    style={{
                      height: "140px",
                      backgroundColor: "#f4f7f3",
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "52px",
                      marginBottom: "14px",
                      overflow: "hidden",
                    }}
                  >
                    {p.images?.[0]?.image_url ? (
                      <img
                        src={p.images[0].image_url}
                        alt={p.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span>🥬</span>
                    )}
                  </div>

                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#16835b", marginBottom: "2px" }}>
                    {sellerName}
                  </span>
                  <strong style={{ fontSize: "15px", color: "#063c32", marginBottom: "2px" }}>
                    {p.name}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#62746a", marginBottom: "12px" }}>
                    per {p.unit}
                  </span>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
                    <span style={{ fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                      ₹{price.toFixed(0)}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: p.is_in_stock ? "#ecfdf5" : "#fee2e2",
                        color: p.is_in_stock ? "#059669" : "#dc2626",
                      }}
                    >
                      {p.is_in_stock ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                    <button
                      onClick={() => addToCartMut.mutate(sellerProductId)}
                      disabled={!p.is_in_stock || addToCartMut.isPending}
                      style={{
                        flex: 1,
                        padding: "8px 14px",
                        borderRadius: "10px",
                        backgroundColor: "#16835b",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        cursor: p.is_in_stock ? "pointer" : "not-allowed",
                      }}
                    >
                      <ShoppingCart size={14} /> Add to Basket
                    </button>
                    <button
                      onClick={() => removeFavMut.mutate(p.id)}
                      disabled={removeFavMut.isPending}
                      title="Remove from favorites"
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#dc2626",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}

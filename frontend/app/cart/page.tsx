"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  Store,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { getCart, updateCartItem, removeCartItem, CartItem } from "@/lib/api/cart";
import { getAuthToken } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function PublicCartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setIsAuth(Boolean(getAuthToken()));
    const handleAuth = () => setIsAuth(Boolean(getAuthToken()));
    window.addEventListener("vegito:auth_state_changed", handleAuth);
    return () => window.removeEventListener("vegito:auth_state_changed", handleAuth);
  }, []);

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    staleTime: 5000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      quantity > 0 ? updateCartItem(id, quantity) : removeCartItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: number) => removeCartItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const cart = cartQuery.data;
  const items = cart?.items || [];
  const sellerName = items[0]?.seller_business_name;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--vegito-bg, #f8faf7)",
        color: "var(--vegito-text-main, #12221e)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            color: "#063c32",
            fontWeight: 800,
            fontSize: "14px",
          }}
        >
          <ArrowLeft size={18} />
          <span>Continue Shopping</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "22px" }}>🥬</span>
          <span style={{ fontSize: "18px", fontWeight: 900, color: "#063c32" }}>VEGITO</span>
        </div>

        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "680px",
          margin: "0 auto",
          padding: "24px 20px 48px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 900, color: "#063c32" }}>
            Shopping Basket 🧺
          </h1>
          {items.length > 0 && (
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#16835b", backgroundColor: "#ecfdf5", padding: "4px 12px", borderRadius: "999px" }}>
              {cart?.total_items_count || items.length} item{items.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {sellerName && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "14px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13px",
              color: "#166534",
            }}
          >
            <Store size={18} color="#15803d" />
            <span>
              Fulfilling from: <strong>{sellerName}</strong> (Verified Store within 20 KM)
            </span>
          </div>
        )}

        {cartQuery.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            <p>Loading your basket...</p>
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              border: "1.5px solid #dce8df",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "20px",
                backgroundColor: "#ecfdf5",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                marginBottom: "16px",
              }}
            >
              🥬
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#063c32", margin: "0 0 8px" }}>
              Your basket is empty
            </h2>
            <p style={{ fontSize: "14px", color: "#62746a", margin: "0 0 24px" }}>
              Explore our farm-fresh vegetables and fruits to fill your kitchen.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 28px",
                backgroundColor: "#16835b",
                color: "#ffffff",
                borderRadius: "14px",
                fontSize: "14.5px",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              <span>Browse Produce</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Items List */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                border: "1.5px solid #dce8df",
                padding: "8px 16px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {items.map((it: CartItem, idx: number) => (
                <div
                  key={it.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: idx === items.length - 1 ? "none" : "1px solid #f1f5f9",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        backgroundColor: "#f0fdf4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.product_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "22px" }}>🥕</span>
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 2px", fontSize: "14.5px", fontWeight: 800, color: "#063c32" }}>
                        {it.product_name}
                      </h4>
                      <p style={{ margin: 0, fontSize: "12px", color: "#62746a" }}>
                        {it.unit} · ₹{Number(it.price_per_unit).toFixed(0)} each
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderRadius: "10px",
                        padding: "2px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => updateMut.mutate({ id: it.id, quantity: it.quantity - 1 })}
                        disabled={updateMut.isPending}
                        style={{
                          width: "28px",
                          height: "28px",
                          border: "none",
                          backgroundColor: "transparent",
                          color: "#16835b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ padding: "0 8px", fontSize: "13px", fontWeight: 800, color: "#063c32" }}>
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateMut.mutate({ id: it.id, quantity: it.quantity + 1 })}
                        disabled={updateMut.isPending}
                        style={{
                          width: "28px",
                          height: "28px",
                          border: "none",
                          backgroundColor: "transparent",
                          color: "#16835b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <span style={{ minWidth: "60px", textAlign: "right", fontSize: "14px", fontWeight: 900, color: "#063c32" }}>
                      ₹{((Number(it.price_per_unit) || 0) * it.quantity).toFixed(0)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeMut.mutate(it.id)}
                      disabled={removeMut.isPending}
                      style={{
                        border: "none",
                        backgroundColor: "transparent",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Summary */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                border: "1.5px solid #dce8df",
                padding: "20px",
              }}
            >
              <h3 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: 800, color: "#063c32" }}>
                Bill Summary
              </h3>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px", color: "#62746a" }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 700, color: "#063c32" }}>₹{Number(cart?.subtotal || 0).toFixed(0)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px", color: "#62746a" }}>
                <span>Delivery Charge (Within 20 KM)</span>
                <span style={{ fontWeight: 700, color: (cart?.delivery_charge || 0) === 0 ? "#16a34a" : "#063c32" }}>
                  {(cart?.delivery_charge || 0) === 0 ? "FREE (Orders ₹300+)" : `₹${Number(cart?.delivery_charge).toFixed(0)}`}
                </span>
              </div>

              <div
                style={{
                  height: "1px",
                  backgroundColor: "#e2e8f0",
                  margin: "12px 0",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 900, color: "#063c32" }}>
                <span>To Pay</span>
                <span>₹{Number(cart?.total_amount || 0).toFixed(0)}</span>
              </div>
            </div>

            {/* Checkout Action */}
            <div>
              {isAuth ? (
                <Link
                  href="/customer/checkout"
                  style={{
                    width: "100%",
                    padding: "16px",
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    borderRadius: "16px",
                    border: "none",
                    fontSize: "16px",
                    fontWeight: 900,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 6px 20px rgba(22, 131, 91, 0.28)",
                  }}
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Link
                    href="/auth/login?redirect=/customer/checkout"
                    style={{
                      width: "100%",
                      padding: "16px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      borderRadius: "16px",
                      border: "none",
                      fontSize: "16px",
                      fontWeight: 900,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 6px 20px rgba(22, 131, 91, 0.28)",
                    }}
                  >
                    <LogIn size={18} />
                    <span>Login to Checkout</span>
                    <ArrowRight size={18} />
                  </Link>
                  <p style={{ margin: 0, textAlign: "center", fontSize: "12px", color: "#62746a" }}>
                    Your items will be safely preserved in your basket when you log in.
                  </p>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  padding: "12px",
                  borderRadius: "14px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#62746a",
                }}
              >
                <Truck size={18} color="#16835b" />
                <span>20 KM Delivery Radius</span>
              </div>
              <div
                style={{
                  padding: "12px",
                  borderRadius: "14px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#62746a",
                }}
              >
                <ShieldCheck size={18} color="#16835b" />
                <span>Direct Mandi Sourcing</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

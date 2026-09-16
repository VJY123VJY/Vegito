"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  Heart,
  Package,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Truck,
  XCircle,
  Plus,
  Minus,
  Search,
  RotateCcw,
  MapPin,
  Clock,
  ArrowRight,
  Check,
  AlertCircle,
  Home,
  User,
} from "lucide-react";
import { getCategories, Category } from "@/lib/api/categories";
import { getCart, addCartItem, updateCartItem, removeCartItem } from "@/lib/api/cart";
import { listOrders, getOrder, reorder, Order } from "@/lib/api/orders";
import { getProducts, ApiProduct } from "@/lib/api/products";
import { listFavorites, addFavorite, removeFavorite } from "@/lib/api/favorites";
import { getStoredUserName } from "@/lib/api/auth";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { CustomerLocationMap } from "@/components/map/customer-location-map";
import { AddressSelector } from "@/components/customer/address-selector";
import { RoleGuard } from "@/components/role/role-guard";
import { getErrorMessage } from "@/lib/api/client";

const VEGGIE_EMOJIS: Record<string, string> = {
  "Leafy Vegetables": "🥬",
  "Tomatoes": "🍅",
  "Potatoes": "🥔",
  "Onions": "🧅",
  "Carrots": "🥕",
  "Spinach": "🥬",
  "Cabbage": "🥦",
  "Gourds": "🥒",
  "Root Vegetables": "🥕",
};

function vegEmoji(name: string) {
  for (const [k, v] of Object.entries(VEGGIE_EMOJIS)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return "🥦";
}

function getTimeGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

const ACTIVE_STATUSES = ["PENDING", "NEW", "ACCEPTED", "CONFIRMED", "PACKING", "READY", "OUT_FOR_DELIVERY"];

export function CustomerHome() {
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("Customer");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackToast, setFeedbackToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setUserName(getStoredUserName());
  }, []);

  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const cart = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const orders = useQuery({ queryKey: ["customer-orders"], queryFn: () => listOrders() });
  const products = useQuery({
    queryKey: ["customer-products", selectedCategoryId, searchQuery],
    queryFn: () =>
      getProducts({
        categoryId: selectedCategoryId || undefined,
        search: searchQuery.trim() || undefined,
        pageSize: 24,
      }),
  });
  const favorites = useQuery({ queryKey: ["customer-favorites"], queryFn: listFavorites });

  const orderList = orders.data?.items ?? [];
  const totalOrdersCount = orders.data?.meta?.total_items ?? orderList.length;
  const deliveredCount = orderList.filter((o) => o.status === "DELIVERED" || o.status === "COMPLETED").length;
  const outForDeliveryCount = orderList.filter((o) => o.status === "OUT_FOR_DELIVERY").length;
  const cancelledCount = orderList.filter((o) => o.status === "CANCELLED" || o.status === "REJECTED").length;

  // Active order: find latest non-delivered/non-cancelled order
  const activeOrder = orderList.find((o) => ACTIVE_STATUSES.includes(o.status));

  // Details for map if out for delivery
  const activeOrderDetail = useQuery({
    queryKey: ["order-detail", activeOrder?.id],
    queryFn: () => getOrder(String(activeOrder!.id)),
    enabled: Boolean(activeOrder?.id && activeOrder.status === "OUT_FOR_DELIVERY"),
    refetchInterval: 10000,
  });

  // Cart total items
  const cartItems = cart.data?.items ?? [];
  const cartItemCount = cart.data?.total_items_count ?? cartItems.reduce((acc, it) => acc + it.quantity, 0);
  const cartTotalAmount = cart.data?.total_amount ?? cart.data?.subtotal ?? 0;

  // Mutations
  const addCartMut = useMutation({
    mutationFn: (sellerProductId: number) => addCartItem(sellerProductId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setFeedbackToast({ type: "success", text: "Vegetable added to your basket!" });
      setTimeout(() => setFeedbackToast(null), 2500);
    },
    onError: (err) => {
      setFeedbackToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedbackToast(null), 3000);
    },
  });

  const updateCartMut = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (err) => {
      setFeedbackToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedbackToast(null), 3000);
    },
  });

  const removeCartMut = useMutation({
    mutationFn: (itemId: number) => removeCartItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (err) => {
      setFeedbackToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedbackToast(null), 3000);
    },
  });

  const favAddMut = useMutation({
    mutationFn: (productId: number) => addFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-favorites"] });
    },
  });

  const favRemoveMut = useMutation({
    mutationFn: (productId: number) => removeFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-favorites"] });
    },
  });

  const reorderMut = useMutation({
    mutationFn: (orderId: number) => reorder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setFeedbackToast({ type: "success", text: "Items added to basket! Ready for checkout." });
      setTimeout(() => setFeedbackToast(null), 3000);
    },
    onError: (err) => {
      setFeedbackToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setFeedbackToast(null), 3000);
    },
  });

  const favoriteIds = useMemo(() => {
    return new Set((favorites.data ?? []).map((f) => f.product_id));
  }, [favorites.data]);

  const toggleFavorite = (productId: number) => {
    if (favoriteIds.has(productId)) {
      favRemoveMut.mutate(productId);
    } else {
      favAddMut.mutate(productId);
    }
  };

  const getActiveStepIndex = (status: string) => {
    switch (status) {
      case "PENDING":
      case "NEW":
      case "ACCEPTED":
      case "CONFIRMED":
        return 0;
      case "PACKING":
        return 1;
      case "READY":
        return 2;
      case "OUT_FOR_DELIVERY":
        return 3;
      case "DELIVERED":
      case "COMPLETED":
        return 4;
      default:
        return 0;
    }
  };

  return (
    <RoleGuard allow={["CUSTOMER"]}>
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f4f7f3" }}>
        {/* Feedback Toast */}
        {feedbackToast && (
          <div
            style={{
              position: "fixed",
              bottom: "84px",
              right: "24px",
              zIndex: 100,
              backgroundColor: feedbackToast.type === "success" ? "#063c32" : "#dc2626",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "14px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13.5px",
              fontWeight: 700,
            }}
          >
            {feedbackToast.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{feedbackToast.text}</span>
            {feedbackToast.type === "success" && (
              <Link
                href="/customer/cart"
                style={{
                  color: "#a7f3d0",
                  textDecoration: "underline",
                  marginLeft: "6px",
                  fontSize: "13px",
                }}
              >
                View Cart
              </Link>
            )}
          </div>
        )}

        {/* Sidebar */}
        <DashboardSidebar
          role="customer"
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Main Content Column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Top Header */}
          <DashboardHeader
            role="customer"
            userName={userName}
            userRole="Customer"
            greeting={getTimeGreeting(userName)}
            subtitle="Fresh vegetables, straight from Solapur farms"
            searchPlaceholder="Search fresh vegetables, tomatoes, greens..."
            cartItemCount={cartItemCount}
            onSearchChange={(q) => setSearchQuery(q)}
            onMenuToggle={() => setMobileOpen(!mobileOpen)}
          />

          <main style={{ flex: 1, padding: "24px 28px 100px", overflowY: "auto" }}>
            {/* Delivery Address Selector */}
            <AddressSelector
              selectedAddressId={selectedAddressId}
              onSelectAddress={(addr) => setSelectedAddressId(addr.id)}
            />

            {/* Greeting & Subtitle */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: "#063c32" }}>
                {getTimeGreeting(userName)} 👋
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "#62746a" }}>
                Fresh vegetables, better life. Straight from local farmers to your kitchen.
              </p>
            </div>

            {/* Quick Actions Shortcuts */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              {[
                { label: "My Orders", href: "/customer/orders", icon: "📦", count: totalOrdersCount },
                { label: "My Addresses", href: "/customer/addresses", icon: "📍", count: null },
                { label: "Favorites", href: "/customer/favorites", icon: "❤️", count: favoriteIds.size },
                { label: "Track Order", href: "/customer/track", icon: "🚚", count: outForDeliveryCount > 0 ? "Live" : null },
                { label: "Cart & Basket", href: "/customer/cart", icon: "🛒", count: cartItemCount > 0 ? cartItemCount : null },
              ].map((act) => (
                <Link
                  key={act.label}
                  href={act.href}
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e1e8e2",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    transition: "transform 0.15s, border-color 0.15s",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{act.icon}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: "12.5px", fontWeight: 700, color: "#063c32", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {act.label}
                    </p>
                    {act.count !== null && (
                      <span style={{ fontSize: "11px", color: "#16835b", fontWeight: 700 }}>
                        {act.count} {typeof act.count === "number" ? "items" : ""}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Active Order Banner / Tracker (If Customer has active order) */}
            {activeOrder && (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #a7f3d0",
                  borderRadius: "18px",
                  padding: "20px 24px",
                  marginBottom: "24px",
                  boxShadow: "0 4px 16px rgba(6, 60, 50, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        backgroundColor: "#ecfdf5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#059669",
                      }}
                    >
                      <Truck size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15.5px", fontWeight: 800, color: "#063c32" }}>
                        Active Order #{activeOrder.order_number}
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                        Placed on {new Date(activeOrder.placed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ₹{Number(activeOrder.total_amount).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <StatusBadge status={activeOrder.status} />
                    {activeOrder.status === "OUT_FOR_DELIVERY" && (
                      <Link
                        href="/customer/track"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#16835b",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        <Truck size={14} /> Track Delivery
                      </Link>
                    )}
                    <Link
                      href={`/customer/orders/${activeOrder.id}`}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#f4f7f3",
                        border: "1px solid #d8e5dc",
                        color: "#063c32",
                        fontSize: "12px",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Details
                    </Link>
                  </div>
                </div>

                {/* 5-step status progression bar */}
                <div style={{ marginTop: "14px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: "4px",
                      position: "relative",
                      marginBottom: "8px",
                    }}
                  >
                    {["Confirmed", "Packing", "Ready", "Out for Delivery", "Delivered"].map((step, idx) => {
                      const currentIdx = getActiveStepIndex(activeOrder.status);
                      const isComplete = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div key={step} style={{ textAlign: "center" }}>
                          <div
                            style={{
                              height: "6px",
                              borderRadius: "3px",
                              backgroundColor: isComplete ? "#16835b" : "#e2e8f0",
                              marginBottom: "6px",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: isCurrent ? 800 : 600,
                              color: isCurrent ? "#16835b" : isComplete ? "#063c32" : "#94a3b8",
                              display: "block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive delivery map if out for delivery */}
                {activeOrder.status === "OUT_FOR_DELIVERY" && activeOrderDetail.data && (
                  <div style={{ marginTop: "16px" }}>
                    <CustomerLocationMap
                      orderId={activeOrder.id}
                      orderNumber={activeOrder.order_number}
                      orderStatus={activeOrder.status}
                      partnerName={activeOrderDetail.data.delivery_task?.notes || "Vegito Express Partner"}
                      deliveryAddress={activeOrderDetail.data.address?.address_line1}
                      customerLocation={
                        activeOrderDetail.data.address?.latitude && activeOrderDetail.data.address?.longitude
                          ? {
                              lat: Number(activeOrderDetail.data.address.latitude),
                              lng: Number(activeOrderDetail.data.address.longitude),
                            }
                          : null
                      }
                      partnerLocation={{ lat: 17.675, lng: 75.908 }}
                      etaMinutes={12}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Sticky Cart Summary Bar (When cart has items) */}
            {cartItems.length > 0 && (
              <div
                style={{
                  backgroundColor: "#063c32",
                  color: "#ffffff",
                  borderRadius: "16px",
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "24px",
                  boxShadow: "0 6px 20px rgba(6, 60, 50, 0.2)",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    🛒
                  </div>
                  <div>
                    <strong style={{ fontSize: "14.5px" }}>
                      Your Basket: {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
                    </strong>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#a7f3d0" }}>
                      Total: ₹{Number(cartTotalAmount).toFixed(2)} · Free Farm Delivery over ₹199
                    </p>
                  </div>
                </div>

                <Link
                  href="/customer/cart"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 20px",
                    borderRadius: "10px",
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  View Basket &amp; Checkout <ArrowRight size={15} />
                </Link>
              </div>
            )}

            {/* Hero Shopping Banner */}
            <div
              style={{
                borderRadius: "20px",
                background: "linear-gradient(135deg, #063c32 0%, #16835b 70%, #34d399 100%)",
                padding: "32px 36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(6, 60, 50, 0.12)",
                marginBottom: "28px",
              }}
            >
              <div style={{ position: "relative", zIndex: 2, maxWidth: "520px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    borderRadius: "999px",
                    padding: "4px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    marginBottom: "12px",
                  }}
                >
                  <Sparkles size={13} /> Fresh Vegetables Delivered Daily
                </span>
                <h3
                  style={{
                    margin: "0 0 10px",
                    color: "#ffffff",
                    fontSize: "26px",
                    fontWeight: 800,
                    lineHeight: "1.25",
                  }}
                >
                  Fresh vegetables,<br />delivered to your door.
                </h3>
                <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#d1fae5", lineHeight: 1.5 }}>
                  Straight from local Solapur farmers to your kitchen. Cleaned, graded, and delivered fast.
                </p>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <a
                    href="#products-section"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 22px",
                      backgroundColor: "#ffffff",
                      color: "#063c32",
                      borderRadius: "10px",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      textDecoration: "none",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    Shop Now <ChevronRight size={16} />
                  </a>
                  <a
                    href="#categories-section"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 20px",
                      backgroundColor: "rgba(255, 255, 255, 0.18)",
                      color: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "10px",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    View Categories
                  </a>
                </div>
              </div>

              <div
                style={{
                  fontSize: "110px",
                  position: "absolute",
                  right: "24px",
                  bottom: "-15px",
                  opacity: 0.92,
                  userSelect: "none",
                }}
              >
                🥗
              </div>
            </div>

            {/* Horizontal Vegetable Categories Bar */}
            <div id="categories-section" style={{ marginBottom: "32px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#063c32" }}>
                    Vegetable Categories
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Select a category to filter today&apos;s fresh harvest
                  </p>
                </div>
                {selectedCategoryId && (
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#16835b",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Show All
                  </button>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  overflowX: "auto",
                  paddingBottom: "8px",
                  scrollbarWidth: "none",
                }}
              >
                {/* All Filter Pill */}
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      width: "68px",
                      height: "68px",
                      backgroundColor: selectedCategoryId === null ? "#16835b" : "#ffffff",
                      color: selectedCategoryId === null ? "#ffffff" : "#063c32",
                      borderRadius: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "26px",
                      border: selectedCategoryId === null ? "2px solid #16835b" : "1.5px solid #e1e8e2",
                      boxShadow: selectedCategoryId === null ? "0 4px 12px rgba(22, 131, 91, 0.25)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    🥬
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: selectedCategoryId === null ? 800 : 600,
                      color: selectedCategoryId === null ? "#16835b" : "#475569",
                    }}
                  >
                    All Items
                  </span>
                </button>

                {(categories.data ?? []).map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                      style={{
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "68px",
                          height: "68px",
                          backgroundColor: isSelected ? "#16835b" : "#ffffff",
                          borderRadius: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "28px",
                          border: isSelected ? "2px solid #16835b" : "1.5px solid #e1e8e2",
                          boxShadow: isSelected ? "0 4px 12px rgba(22, 131, 91, 0.25)" : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {vegEmoji(cat.name)}
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? "#16835b" : "#475569",
                          maxWidth: "76px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Products Grid & Right Sidebar (Two-column responsive layout) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 360px",
                gap: "24px",
                alignItems: "start",
              }}
              className="customer-dashboard-grid"
            >
              {/* Left Column: Live Products Section */}
              <div id="products-section" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                      Today&apos;s Farm Harvest
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                      Directly priced by verified Solapur farmers
                    </p>
                  </div>

                  {searchQuery && (
                    <span style={{ fontSize: "12.5px", color: "#16835b", fontWeight: 700 }}>
                      Showing results for &ldquo;{searchQuery}&rdquo;
                    </span>
                  )}
                </div>

                {/* Product Grid */}
                {products.isLoading ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        style={{
                          height: "260px",
                          backgroundColor: "#ffffff",
                          borderRadius: "16px",
                          border: "1px solid #e1e8e2",
                          animation: "pulse 1.5s infinite",
                        }}
                      />
                    ))}
                  </div>
                ) : (products.data?.items ?? []).length === 0 ? (
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #e1e8e2",
                      padding: "48px 24px",
                      textAlign: "center",
                      color: "#62746a",
                    }}
                  >
                    <div style={{ fontSize: "40px", marginBottom: "10px" }}>🥦</div>
                    <p style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 800, color: "#063c32" }}>
                      No vegetables found
                    </p>
                    <p style={{ margin: "0 0 16px", fontSize: "13px" }}>
                      {searchQuery
                        ? `No vegetables matching "${searchQuery}". Try a different keyword.`
                        : "No vegetables available in this category right now."}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        style={{
                          padding: "8px 18px",
                          borderRadius: "8px",
                          backgroundColor: "#16835b",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {products.data?.items.map((prod) => {
                      const offer = prod.seller_products?.[0];
                      const sellerProductId = offer?.seller_product_id || prod.id;
                      const sellerName = offer?.seller_business_name || "Green Farm Store";
                      const sellerRating = Number(offer?.seller_rating || 4.8).toFixed(1);
                      const price = offer?.price ? Number(offer.price) : Number(prod.min_price || 40);
                      const isAvailable = offer?.is_available !== false && prod.is_in_stock;
                      const isFav = favoriteIds.has(prod.id);

                      // Find existing cart item if any
                      const cartItem = cartItems.find(
                        (ci) => ci.seller_product_id === sellerProductId || ci.product_id === prod.id
                      );
                      const cartQty = cartItem?.quantity || 0;

                      return (
                        <div
                          key={prod.id}
                          style={{
                            backgroundColor: "#ffffff",
                            borderRadius: "16px",
                            border: "1px solid #e1e8e2",
                            padding: "14px",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow: "0 2px 8px rgba(6, 60, 50, 0.03)",
                            position: "relative",
                            transition: "box-shadow 0.15s ease",
                          }}
                        >
                          {/* Heart Favorite Toggle Button */}
                          <button
                            onClick={() => toggleFavorite(prod.id)}
                            aria-label="Toggle Favorite"
                            style={{
                              position: "absolute",
                              top: "20px",
                              right: "20px",
                              zIndex: 10,
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              backgroundColor: "rgba(255, 255, 255, 0.85)",
                              backdropFilter: "blur(4px)",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                            }}
                          >
                            <Heart
                              size={16}
                              color={isFav ? "#dc2626" : "#64748b"}
                              fill={isFav ? "#dc2626" : "none"}
                            />
                          </button>

                          {/* Vegetable Image */}
                          <div
                            style={{
                              height: "120px",
                              backgroundColor: "#f4f7f3",
                              borderRadius: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "48px",
                              marginBottom: "12px",
                              overflow: "hidden",
                            }}
                          >
                            {prod.images?.[0]?.image_url ? (
                              <img
                                src={prod.images[0].image_url}
                                alt={prod.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <span>{vegEmoji(prod.name)}</span>
                            )}
                          </div>

                          {/* Details */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#16835b" }}>
                                {sellerName}
                              </span>
                              <span style={{ fontSize: "10.5px", color: "#d97706", fontWeight: 700 }}>
                                ★ {sellerRating}
                              </span>
                            </div>

                            <strong style={{ fontSize: "14px", color: "#063c32", marginBottom: "2px" }}>
                              {prod.name}
                            </strong>
                            <span style={{ fontSize: "11.5px", color: "#62746a", marginBottom: "10px" }}>
                              per {prod.unit}
                            </span>

                            {/* Price & Stock Badge */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                              <span style={{ fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                                ₹{price.toFixed(0)}
                              </span>
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  backgroundColor: isAvailable ? "#ecfdf5" : "#fee2e2",
                                  color: isAvailable ? "#059669" : "#dc2626",
                                }}
                              >
                                {isAvailable ? "In Stock" : "Out of Stock"}
                              </span>
                            </div>

                            {/* Quantity Controls / Add Button */}
                            <div style={{ marginTop: "auto" }}>
                              {cartQty > 0 ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    backgroundColor: "#16835b",
                                    borderRadius: "10px",
                                    padding: "4px",
                                    color: "#ffffff",
                                  }}
                                >
                                  <button
                                    onClick={() => {
                                      if (cartQty > 1) {
                                        updateCartMut.mutate({ itemId: cartItem!.id, quantity: cartQty - 1 });
                                      } else {
                                        removeCartMut.mutate(cartItem!.id);
                                      }
                                    }}
                                    disabled={updateCartMut.isPending || removeCartMut.isPending}
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "6px",
                                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                                      border: "none",
                                      color: "#ffffff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span style={{ fontSize: "13px", fontWeight: 800 }}>
                                    {cartQty}
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateCartMut.mutate({ itemId: cartItem!.id, quantity: cartQty + 1 })
                                    }
                                    disabled={updateCartMut.isPending}
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "6px",
                                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                                      border: "none",
                                      color: "#ffffff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addCartMut.mutate(sellerProductId)}
                                  disabled={!isAvailable || addCartMut.isPending}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "10px",
                                    backgroundColor: isAvailable ? "#e9f6ee" : "#f1f5f9",
                                    color: isAvailable ? "#16835b" : "#94a3b8",
                                    border: isAvailable ? "1px solid #c4e8d3" : "1px solid #e2e8f0",
                                    fontSize: "12.5px",
                                    fontWeight: 800,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    cursor: isAvailable ? "pointer" : "not-allowed",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <Plus size={14} /> Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Recent Orders & Favorites Summary */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Recent Orders Card */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e1e8e2",
                    borderRadius: "18px",
                    padding: "20px 22px",
                    boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                      Recent Orders
                    </h3>
                    <Link
                      href="/customer/orders"
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#16835b",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      View All <ChevronRight size={14} />
                    </Link>
                  </div>

                  {orders.isLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            height: "60px",
                            backgroundColor: "#f4f7f3",
                            borderRadius: "10px",
                            animation: "pulse 1.5s infinite",
                          }}
                        />
                      ))}
                    </div>
                  ) : orderList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "28px 12px", color: "#62746a" }}>
                      <div style={{ fontSize: "36px", marginBottom: "8px" }}>🛒</div>
                      <p style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: 700, color: "#063c32" }}>
                        No orders placed yet
                      </p>
                      <p style={{ margin: 0, fontSize: "12px" }}>
                        Add vegetables above to start your first farm delivery.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {orderList.slice(0, 4).map((order) => (
                        <div
                          key={order.id}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "12px",
                            backgroundColor: "#fafcf9",
                            border: "1px solid #edf2ee",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ fontSize: "13px", color: "#063c32" }}>
                                #{order.order_number}
                              </strong>
                              <span style={{ fontSize: "11px", color: "#8b9c92", display: "block" }}>
                                {new Date(order.placed_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                })} · ₹{Number(order.total_amount).toFixed(0)}
                              </span>
                            </div>
                            <StatusBadge status={order.status} />
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #f1f5f2", paddingTop: "8px" }}>
                            <Link
                              href={`/customer/orders/${order.id}`}
                              style={{
                                fontSize: "11.5px",
                                fontWeight: 700,
                                color: "#62746a",
                                textDecoration: "none",
                                padding: "4px 8px",
                              }}
                            >
                              View Details
                            </Link>
                            <button
                              onClick={() => reorderMut.mutate(order.id)}
                              disabled={reorderMut.isPending}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                backgroundColor: "#e9f6ee",
                                color: "#16835b",
                                border: "1px solid #c4e8d3",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <RotateCcw size={12} /> Reorder
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Favorites Wishlist Card */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e1e8e2",
                    borderRadius: "18px",
                    padding: "20px 22px",
                    boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Heart size={16} color="#dc2626" fill="#dc2626" />
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#063c32" }}>
                        My Favorites
                      </h3>
                    </div>
                    <Link
                      href="/customer/favorites"
                      style={{ fontSize: "12px", fontWeight: 700, color: "#16835b", textDecoration: "none" }}
                    >
                      View All ({favoriteIds.size})
                    </Link>
                  </div>

                  {favoriteIds.size === 0 ? (
                    <p style={{ margin: 0, fontSize: "12px", color: "#62746a" }}>
                      Tap the heart icon on any vegetable card to save your favorites for 1-click re-ordering!
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: "12.5px", color: "#063c32", fontWeight: 600 }}>
                      You have {favoriteIds.size} {favoriteIds.size === 1 ? "vegetable" : "vegetables"} saved in your favorites.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Fixed Mobile Bottom Navigation Bar (Hidden on desktop) */}
        <nav
          className="customer-mobile-bottom-nav"
          aria-label="Customer Navigation"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "64px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e1e8e2",
            display: "none",
            alignItems: "center",
            justifyContent: "space-around",
            zIndex: 90,
            boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
          }}
        >
          <Link
            href="/customer"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              color: "#16835b",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            <Home size={20} />
            <span>Home</span>
          </Link>

          <a
            href="#products-section"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              color: "#62746a",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <Search size={20} />
            <span>Shop</span>
          </a>

          <Link
            href="/customer/cart"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              color: "#62746a",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 600,
              position: "relative",
            }}
          >
            <ShoppingCart size={20} />
            {cartItemCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "4px",
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "8px",
                  backgroundColor: "#16835b",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                }}
              >
                {cartItemCount}
              </span>
            )}
            <span>Basket</span>
          </Link>

          <Link
            href="/customer/orders"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              color: "#62746a",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <Package size={20} />
            <span>Orders</span>
          </Link>

          <Link
            href="/customer/favorites"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              color: "#62746a",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <Heart size={20} />
            <span>Favorites</span>
          </Link>
        </nav>

        <style>{`
          @media (max-width: 1024px) {
            .customer-dashboard-grid {
              grid-template-columns: 1fr !important;
            }
          }
          @media (max-width: 768px) {
            .customer-mobile-bottom-nav {
              display: flex !important;
            }
          }
        `}</style>
      </div>
    </RoleGuard>
  );
}

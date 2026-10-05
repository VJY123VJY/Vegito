"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  MapPin,
  Sparkles,
  Truck,
  ShieldCheck,
  Leaf,
  Store,
  ChevronRight,
  ArrowRight,
  User,
  Heart,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Clock,
  Star,
  Mic,
  Languages,
  LogOut,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories, ApiCategory } from "@/lib/api/categories";
import { getProducts, ApiProduct } from "@/lib/api/products";
import { getCart, addCartItem, updateCartItem, removeCartItem } from "@/lib/api/cart";
import { listOrders, reorder } from "@/lib/api/orders";
import {
  isLoggedIn,
  getStoredRole,
  getStoredUserName,
  getStoredPhone,
  clearSession,
  getRoleRedirectPath,
  getMe,
  getAuthToken,
  type AuthRole,
} from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { ProductCard } from "@/components/product/product-card";
import { CategoryCarousel } from "@/components/ui/category-carousel";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { LocationModal, getStoredLocation } from "@/components/location/location-modal";
import { SmartBasket } from "@/components/customer/smart-basket";
import { SmartReorder } from "@/components/customer/smart-reorder";
import { GroceryReminders } from "@/components/customer/grocery-reminders";
import { VoiceShoppingModal } from "@/components/customer/voice-shopping-modal";
import { useTranslation } from "@/context/i18n-context";

const BEST_OFFERS = [
  {
    id: "off-1",
    tag: "FARM SPECIAL",
    title: "Fresh Solapur Tomato Crate",
    desc: "Direct harvest from Vasant Valley. Rich in lycopene.",
    discount: "20% OFF",
    price: "₹32/kg",
    bg: "linear-gradient(135deg, #063c32 0%, #16835b 100%)",
  },
  {
    id: "off-2",
    tag: "MORNING HARVEST",
    title: "Organic Spinach & Greens",
    desc: "Crisp hand-plucked baby spinach and coriander.",
    discount: "FRESH PICK",
    price: "₹25/bunch",
    bg: "linear-gradient(135deg, #16835b 0%, #22c55e 100%)",
  },
];

const LOCAL_FARMS = [
  {
    name: "Solapur Organic Orchards",
    area: "North Solapur",
    specialty: "Heirloom Tomatoes & Gourds",
    rating: 4.9,
    orders: "1.2k+ deliveries",
  },
  {
    name: "Vasant Valley Farms",
    area: "Khed Mandi Road",
    specialty: "Farm Potatoes & Root Veggies",
    rating: 4.8,
    orders: "890+ deliveries",
  },
  {
    name: "Sahyadri Bio Greens",
    area: "South Solapur",
    specialty: "Crisp Spinach, Cabbage & Herbs",
    rating: 4.9,
    orders: "2.4k+ deliveries",
  },
];

export function PublicHome() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [role, setRole] = useState<AuthRole | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "fresh" | "popular">("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("Solapur Central Mandi · 413001");
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useTranslation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearSession();
    setRole(null);
    setUserName("");
    setUserMenuOpen(false);
    queryClient.clear();
    setToast({ type: "success", text: "Signed out successfully." });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setRole(null);
      setUserName("");
    } else {
      getMe()
        .then((user) => {
          if (user) {
            setRole(getStoredRole());
            setUserName(user.name || getStoredUserName());
          } else {
            clearSession();
            setRole(null);
            setUserName("");
          }
        })
        .catch(() => {
          clearSession();
          setRole(null);
          setUserName("");
        });
    }

    const handleAuthChanged = () => {
      const tok = getAuthToken();
      if (!tok) {
        setRole(null);
        setUserName("");
      } else {
        setRole(getStoredRole());
        setUserName(getStoredUserName());
      }
    };
    window.addEventListener("vegito:auth_state_changed", handleAuthChanged);

    const stored = getStoredLocation();
    if (stored?.address) {
      setSelectedLocation(stored.address);
    }
    // Auto-open Instamart-style location popup on first visit
    if (typeof window !== "undefined") {
      const visited = localStorage.getItem("vegito.location_selected");
      if (!visited) {
        const timer = setTimeout(() => {
          setAddressModalOpen(true);
        }, 600);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("vegito:auth_state_changed", handleAuthChanged);
        };
      }
    }

    return () => {
      window.removeEventListener("vegito:auth_state_changed", handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    const handleLocChange = (e: any) => {
      if (e.detail?.address) {
        setSelectedLocation(e.detail.address);
      }
    };
    window.addEventListener("vegito:location_changed", handleLocChange);
    return () => window.removeEventListener("vegito:location_changed", handleLocChange);
  }, []);

  // API Queries
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 60_000,
  });

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: role === "CUSTOMER",
    staleTime: 15_000,
  });

  const productsQuery = useQuery({
    queryKey: ["public-products", selectedCategoryId, searchQuery],
    queryFn: () =>
      getProducts({
        categoryId: selectedCategoryId || undefined,
        search: searchQuery.trim() || undefined,
        pageSize: 30,
      }),
    staleTime: 30_000,
  });

  const pastOrdersQuery = useQuery({
    queryKey: ["past-orders-public"],
    queryFn: () => listOrders(1, 6),
    enabled: role === "CUSTOMER",
    staleTime: 60_000,
  });

  // Cart quantity map
  const cartItems = cartQuery.data?.items ?? [];
  const cartQuantityByProduct = useMemo(() => {
    const map: Record<number, { qty: number; itemId: number }> = {};
    for (const it of cartItems) {
      map[it.product_id] = { qty: it.quantity, itemId: it.id };
    }
    return map;
  }, [cartItems]);

  const totalCartCount =
    cartQuery.data?.total_items_count ??
    cartItems.reduce((acc, it) => acc + it.quantity, 0);
  const totalCartAmount =
    cartQuery.data?.total_amount ?? cartQuery.data?.subtotal ?? 0;

  // Mutations
  const addCartMut = useMutation({
    mutationFn: ({ sellerProductId, qty }: { sellerProductId: number; qty: number }) =>
      addCartItem(sellerProductId, qty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ type: "success", text: "Added fresh vegetable to basket!" });
      setTimeout(() => setToast(null), 2500);
    },
    onError: (err) => {
      setToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const updateCartMut = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      quantity > 0 ? updateCartItem(itemId, quantity) : removeCartItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (err) => {
      setToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const reorderMut = useMutation({
    mutationFn: (orderId: number) => reorder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setToast({ type: "success", text: "Items added to your basket! Ready for checkout." });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      setToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setToast(null), 3000);
    },
  });

  const handleProductQtyChange = (product: ApiProduct, newQty: number) => {
    if (!role) {
      router.push("/auth/login?role=customer");
      return;
    }
    const cartEntry = cartQuantityByProduct[product.id];
    if (cartEntry) {
      updateCartMut.mutate({ itemId: cartEntry.itemId, quantity: newQty });
    } else if (newQty > 0) {
      const offer = product.seller_products?.[0];
      if (offer?.seller_product_id) {
        addCartMut.mutate({ sellerProductId: offer.seller_product_id, qty: newQty });
      }
    }
  };

  const handleAddToCartDirect = (sellerProductId: number, qty: number) => {
    if (!role) {
      router.push("/auth/login?role=customer");
      return;
    }
    addCartMut.mutate({ sellerProductId, qty });
  };

  const productList = productsQuery.data?.items ?? [];

  const isFruit = (p: ApiProduct) => {
    const text = `${p.name} ${p.description || ""}`.toLowerCase();
    const fruitKeywords = [
      "fruit", "apple", "banana", "orange", "grape", "mango", "papaya",
      "pomegranate", "watermelon", "melon", "guava", "lemon", "citrus",
      "berries", "strawberry", "chiku", "chikoo", "sapota", "pineapple", "coconut", "anar", "seb", "santre", "kela"
    ];
    return fruitKeywords.some((k) => text.includes(k));
  };

  const vegetableProducts = useMemo(() => {
    return productList.filter((p) => !isFruit(p));
  }, [productList]);

  const fruitProducts = useMemo(() => {
    return productList.filter((p) => isFruit(p));
  }, [productList]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8faf7",
        color: "#12221e",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        paddingBottom: totalCartCount > 0 ? "140px" : "90px",
        overflowX: "hidden",
      }}
    >
      {/* ── ROLE ALERT BANNER FOR NON-CUSTOMER ROLES ── */}
      {role && role !== "CUSTOMER" && (
        <div
          style={{
            backgroundColor:
              role === "SELLER"
                ? "#fff7ed"
                : role === "DELIVERY_PARTNER"
                ? "#eff6ff"
                : "#f5f3ff",
            borderBottom: `1px solid ${
              role === "SELLER"
                ? "#fed7aa"
                : role === "DELIVERY_PARTNER"
                ? "#bfdbfe"
                : "#ddd6fe"
            }`,
            color:
              role === "SELLER"
                ? "#c2410c"
                : role === "DELIVERY_PARTNER"
                ? "#1d4ed8"
                : "#6d28d9",
            padding: "10px 18px",
            fontSize: "13px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            position: "relative",
            zIndex: 110,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>
              {role === "SELLER" ? "🏪" : role === "DELIVERY_PARTNER" ? "🚚" : "🛡️"}
            </span>
            <span>
              Signed in as <strong>{userName || role}</strong> ({role.replace("_", " ")}). This page is the customer store.
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              href={getRoleRedirectPath(role)}
              style={{
                backgroundColor:
                  role === "SELLER"
                    ? "#ea580c"
                    : role === "DELIVERY_PARTNER"
                    ? "#2563eb"
                    : "#7c3aed",
                color: "#ffffff",
                padding: "6px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 800,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Go to {role === "SELLER" ? "Seller Dashboard" : role === "DELIVERY_PARTNER" ? "Delivery Console" : "Admin HQ"}</span>
              <ArrowRight size={13} />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid currentColor",
                color: "inherit",
                padding: "5px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* ── 1. TOP HEADER & LOCATION ─────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid #e8eee9",
          paddingTop: "env(safe-area-inset-top, 10px)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          {/* Brand + Location */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "12px",
                  backgroundColor: "#063c32",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 4px 12px rgba(6, 60, 50, 0.2)",
                }}
              >
                <Leaf size={20} fill="#34d399" color="#34d399" />
              </div>
              <span
                style={{
                  fontSize: "21px",
                  fontWeight: 900,
                  color: "#063c32",
                  letterSpacing: "-0.03em",
                }}
              >
                Vegito
              </span>
            </Link>

            {/* Location selector pill */}
            <button
              onClick={() => setAddressModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "14px",
                backgroundColor: "#f2f8f4",
                border: "1px solid #e1ebe3",
                color: "#063c32",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                maxWidth: "220px",
              }}
            >
              <MapPin size={14} color="#16835b" />
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedLocation}
              </span>
              <span style={{ fontSize: "10px", color: "#16835b" }}>▼</span>
            </button>
          </div>

          {/* Right Header Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Language Switcher Pill */}
            <button
              onClick={() => {
                const nextLang = language === "en" ? "mr" : language === "mr" ? "hi" : "en";
                setLanguage(nextLang);
              }}
              title="Change Language"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "12px",
                backgroundColor: "#f2f8f4",
                border: "1px solid #e1ebe3",
                color: "#063c32",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "13px" }}>🌐</span>
              <span>{language === "en" ? "EN" : language === "mr" ? "मराठी" : "हिन्दी"}</span>
            </button>

            <ThemeToggle />

            {/* Basket Button */}
            <Link
              href={role === "CUSTOMER" ? "/customer/cart" : "/auth/login?role=customer"}
              style={{
                position: "relative",
                width: "42px",
                height: "42px",
                borderRadius: "14px",
                backgroundColor: totalCartCount > 0 ? "#063c32" : "#f2f6f3",
                color: totalCartCount > 0 ? "#ffffff" : "#063c32",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                boxShadow: totalCartCount > 0 ? "0 4px 14px rgba(6, 60, 50, 0.25)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              <ShoppingCart size={19} />
              {totalCartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #ffffff",
                    animation: "scaleIn 0.2s ease",
                  }}
                >
                  {totalCartCount}
                </span>
              )}
            </Link>

            {/* User Profile Dropdown or Login */}
            {role ? (
              <div ref={userMenuRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "14px",
                    backgroundColor:
                      role === "SELLER"
                        ? "#fff7ed"
                        : role === "DELIVERY_PARTNER"
                        ? "#eff6ff"
                        : role === "ADMIN"
                        ? "#f5f3ff"
                        : "#e9f6ee",
                    color:
                      role === "SELLER"
                        ? "#c2410c"
                        : role === "DELIVERY_PARTNER"
                        ? "#1d4ed8"
                        : role === "ADMIN"
                        ? "#6d28d9"
                        : "#16835b",
                    border: `1px solid ${
                      role === "SELLER"
                        ? "#fed7aa"
                        : role === "DELIVERY_PARTNER"
                        ? "#bfdbfe"
                        : role === "ADMIN"
                        ? "#ddd6fe"
                        : "#c7e3d2"
                    }`,
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <User size={15} />
                  <span className="hidden-mobile">
                    {userName ? userName.split(" ")[0] : "Account"}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "6px",
                      backgroundColor:
                        role === "SELLER"
                          ? "#fed7aa"
                          : role === "DELIVERY_PARTNER"
                          ? "#bfdbfe"
                          : role === "ADMIN"
                          ? "#ddd6fe"
                          : "#d1fae5",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    {role === "SELLER" ? "Seller" : role === "DELIVERY_PARTNER" ? "Rider" : role === "ADMIN" ? "Admin" : "User"}
                  </span>
                  <ChevronDown size={14} style={{ transform: userMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      width: "260px",
                      backgroundColor: "#ffffff",
                      borderRadius: "16px",
                      boxShadow: "0 10px 30px rgba(6, 60, 50, 0.15)",
                      border: "1px solid #e1ebe3",
                      padding: "12px",
                      zIndex: 1000,
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {/* User Info Header */}
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid #f0f4f1", marginBottom: "4px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#063c32" }}>
                        {userName || "Logged-in User"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#62746a", marginTop: "2px" }}>
                        {getStoredPhone() || "Signed In"}
                      </div>
                      <div
                        style={{
                          marginTop: "6px",
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor:
                            role === "SELLER"
                              ? "#fff7ed"
                              : role === "DELIVERY_PARTNER"
                              ? "#eff6ff"
                              : role === "ADMIN"
                              ? "#f5f3ff"
                              : "#ecfdf5",
                          color:
                            role === "SELLER"
                              ? "#c2410c"
                              : role === "DELIVERY_PARTNER"
                              ? "#1d4ed8"
                              : role === "ADMIN"
                              ? "#6d28d9"
                              : "#065f46",
                          border: `1px solid ${
                            role === "SELLER"
                              ? "#fed7aa"
                              : role === "DELIVERY_PARTNER"
                              ? "#bfdbfe"
                              : role === "ADMIN"
                              ? "#ddd6fe"
                              : "#a7f3d0"
                          }`,
                        }}
                      >
                        {role === "SELLER"
                          ? "🏪 Seller (Store Owner)"
                          : role === "DELIVERY_PARTNER"
                          ? "🚚 Delivery Partner"
                          : role === "ADMIN"
                          ? "🛡️ Platform Admin"
                          : "👤 Customer"}
                      </div>
                    </div>

                    {/* Navigation Link to Dashboard */}
                    <Link
                      href={getRoleRedirectPath(role)}
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: "10px",
                        backgroundColor: "#f2f8f4",
                        color: "#063c32",
                        fontSize: "13px",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      <span>
                        {role === "SELLER"
                          ? "🏪 Seller Dashboard"
                          : role === "DELIVERY_PARTNER"
                          ? "🚚 Delivery Console"
                          : role === "ADMIN"
                          ? "🛡️ Admin Panel"
                          : "📦 Customer Orders"}
                      </span>
                      <ChevronRight size={15} />
                    </Link>

                    {role === "CUSTOMER" && (
                      <Link
                        href="/customer/profile"
                        onClick={() => setUserMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          borderRadius: "10px",
                          color: "#374151",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <span>Profile & Settings</span>
                        <ChevronRight size={15} />
                      </Link>
                    )}

                    <div style={{ height: "1px", backgroundColor: "#f0f4f1", margin: "4px 0" }} />

                    {/* Switch Account */}
                    <Link
                      href="/auth/login"
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "10px",
                        color: "#4b5563",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      <RotateCcw size={14} />
                      <span>Switch Account / Sign In</span>
                    </Link>

                    {/* Sign Out Button */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "10px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fee2e2",
                        color: "#dc2626",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        width: "100%",
                        textAlign: "left",
                      }}
                    >
                      <LogOut size={14} />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                style={{
                  padding: "8px 16px",
                  borderRadius: "14px",
                  backgroundColor: "#063c32",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(6, 60, 50, 0.18)",
                }}
              >
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── 2. INTERACTIVE SEARCH BAR ──────────────────────────── */}
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 18px 12px",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              width: "100%",
              backgroundColor: "#f4f8f5",
              borderRadius: "16px",
              border: "1.5px solid #e1ebe3",
              padding: "2px 14px",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            <Search size={18} color="#62746a" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vegetables, tomatoes, potatoes, greens..."
              style={{
                width: "100%",
                height: "44px",
                padding: "0 12px",
                border: "none",
                backgroundColor: "transparent",
                outline: "none",
                fontSize: "14px",
                fontWeight: 600,
                color: "#12221e",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#62746a",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={16} />
              </button>
            )}

            {/* Voice Shopping Mic Button */}
            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              title="Voice Search produce"
              style={{
                background: "none",
                border: "none",
                color: "#16835b",
                cursor: "pointer",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
              }}
            >
              <Mic size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "18px 18px 0",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* ── 3. HERO / FRESH GROCERY BANNER ────────────────────── */}
        <section
          style={{
            position: "relative",
            borderRadius: "26px",
            overflow: "hidden",
            background: "linear-gradient(135deg, #063c32 0%, #0d5843 60%, #16835b 100%)",
            color: "#ffffff",
            padding: "32px 28px",
            boxShadow: "0 12px 36px rgba(6, 60, 50, 0.16)",
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 2,
              maxWidth: "600px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "20px",
                backgroundColor: "rgba(52, 211, 153, 0.18)",
                color: "#a7f3d0",
                fontSize: "12px",
                fontWeight: 800,
                width: "fit-content",
                border: "1px solid rgba(52, 211, 153, 0.3)",
              }}
            >
              <Sparkles size={14} />
              <span>Direct From Solapur Mandi Farms</span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(26px, 5vw, 38px)",
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                color: "#ffffff",
              }}
            >
              Fresh groceries.<br />Delivered fast.
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: "clamp(13px, 2.5vw, 15px)",
                color: "rgba(255, 255, 255, 0.85)",
                lineHeight: 1.5,
              }}
            >
              Pure farm-harvested vegetables, packed with care and delivered to your doorstep in 15–30 minutes.
            </p>

            {/* Quick stats pills */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  padding: "4px 10px",
                  borderRadius: "10px",
                }}
              >
                ⚡ 15–30 Min Express
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  padding: "4px 10px",
                  borderRadius: "10px",
                }}
              >
                🌿 100% Quality Guaranteed
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  padding: "4px 10px",
                  borderRadius: "10px",
                }}
              >
                🏡 Local Verified Farmers
              </span>
            </div>
          </div>

          {/* Decorative vegetable background accent */}
          <div
            style={{
              position: "absolute",
              right: "-20px",
              bottom: "-20px",
              fontSize: "140px",
              opacity: 0.18,
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            🥬
          </div>
        </section>

        {/* ── 4. CATEGORY CAROUSEL ──────────────────────────────── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#063c32",
                  letterSpacing: "-0.02em",
                }}
              >
                Explore Categories
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                Handpicked varieties from local growers
              </p>
            </div>
            {selectedCategoryId !== null && (
              <button
                onClick={() => setSelectedCategoryId(null)}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  color: "#16835b",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear filter
              </button>
            )}
          </div>

          <CategoryCarousel
            categories={categoriesQuery.data ?? []}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(id) => setSelectedCategoryId(id)}
            isLoading={categoriesQuery.isLoading}
          />
        </section>

        {/* ── 5. SEARCH OR CATEGORY FILTERED VIEW ──────────────── */}
        {(selectedCategoryId !== null || searchQuery.trim().length > 0) ? (
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "19px",
                    fontWeight: 800,
                    color: "#063c32",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {searchQuery ? `Results for "${searchQuery}"` : "Filtered Fresh Produce"}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                  {productList.length} farm items found in Solapur
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedCategoryId(null);
                  setSearchQuery("");
                }}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  color: "#16835b",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Clear Filters
              </button>
            </div>

            {productsQuery.isLoading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "14px",
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <ProductCardSkeleton key={n} />
                ))}
              </div>
            ) : productList.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  border: "1px dashed #d1ded5",
                }}
              >
                <span style={{ fontSize: "36px" }}>🔍</span>
                <h4 style={{ margin: "10px 0 4px", fontSize: "16px", color: "#063c32" }}>
                  No farm produce found
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>
                  Try a different search term or browse all vegetables and fruits.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "14px",
                }}
              >
                {productList.map((product) => {
                  const cartQty = cartQuantityByProduct[product.id]?.qty ?? 0;
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={cartQty}
                      onChange={(newQty) => handleProductQtyChange(product, newQty)}
                      onAddToCart={handleAddToCartDirect}
                      onLoginRequired={() => router.push("/auth/login?role=customer")}
                    />
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* ── 5A. 🥬 DEDICATED FRESH VEGETABLES SECTION ─────── */}
            <section id="vegetables-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "12px",
                      backgroundColor: "#ecfdf5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      border: "1px solid #a7f3d0",
                    }}
                  >
                    🥬
                  </div>
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "19px",
                        fontWeight: 800,
                        color: "#063c32",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Fresh Vegetables
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                      Hand-plucked daily from Solapur Mandi growers
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#16835b",
                    backgroundColor: "#ecfdf5",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  {vegetableProducts.length} items
                </span>
              </div>

              {productsQuery.isLoading ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <ProductCardSkeleton key={n} />
                  ))}
                </div>
              ) : vegetableProducts.length === 0 ? (
                <div
                  style={{
                    padding: "30px 20px",
                    textAlign: "center",
                    backgroundColor: "#ffffff",
                    borderRadius: "18px",
                    border: "1px dashed #d1ded5",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>
                    Loading fresh farm vegetables...
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {vegetableProducts.slice(0, 16).map((product) => {
                    const cartQty = cartQuantityByProduct[product.id]?.qty ?? 0;
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantity={cartQty}
                        onChange={(newQty) => handleProductQtyChange(product, newQty)}
                        onAddToCart={handleAddToCartDirect}
                        onLoginRequired={() => router.push("/auth/login?role=customer")}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── 5B. 🍎 DEDICATED FRESH FRUITS SECTION ─────────── */}
            <section id="fruits-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "12px",
                      backgroundColor: "#fff1f2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      border: "1px solid #fecdd3",
                    }}
                  >
                    🍎
                  </div>
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "19px",
                        fontWeight: 800,
                        color: "#063c32",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Fresh Farm Fruits
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                      Sweet, naturally ripened harvest from nearby orchards
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#e11d48",
                    backgroundColor: "#fff1f2",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    border: "1px solid #fecdd3",
                  }}
                >
                  {fruitProducts.length > 0 ? `${fruitProducts.length} varieties` : "Orchard Harvest"}
                </span>
              </div>

              {productsQuery.isLoading ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <ProductCardSkeleton key={n} />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {(fruitProducts.length > 0 ? fruitProducts : productList.slice(0, 8)).map((product) => {
                    const cartQty = cartQuantityByProduct[product.id]?.qty ?? 0;
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantity={cartQty}
                        onChange={(newQty) => handleProductQtyChange(product, newQty)}
                        onAddToCart={handleAddToCartDirect}
                        onLoginRequired={() => router.push("/auth/login?role=customer")}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── 6. BEST OFFERS CARDS ──────────────────────────────── */}
        <section>
          <div style={{ marginBottom: "12px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "#063c32",
                letterSpacing: "-0.02em",
              }}
            >
              Best Farm Deals
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
              Save on daily essentials direct from local farmers
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            {BEST_OFFERS.map((off) => (
              <div
                key={off.id}
                style={{
                  borderRadius: "22px",
                  padding: "20px 22px",
                  background: off.bg,
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 8px 24px rgba(6, 60, 50, 0.12)",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 800,
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {off.tag} · {off.discount}
                  </span>
                  <h3
                    style={{
                      margin: "10px 0 4px",
                      fontSize: "17px",
                      fontWeight: 800,
                      color: "#ffffff",
                    }}
                  >
                    {off.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12.5px",
                      color: "rgba(255, 255, 255, 0.8)",
                    }}
                  >
                    {off.desc}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "16px",
                  }}
                >
                  <span style={{ fontSize: "18px", fontWeight: 900 }}>
                    {off.price}
                  </span>
                  <button
                    onClick={() => {
                      if (productList[0]?.seller_products?.[0]?.seller_product_id) {
                        handleAddToCartDirect(
                          productList[0].seller_products[0].seller_product_id,
                          1
                        );
                      } else {
                        router.push("/search");
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                      color: "#063c32",
                      border: "none",
                      fontSize: "12.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Order Deal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. SMART REORDER (BUY AGAIN) ────────────────────────── */}
        {role === "CUSTOMER" && pastOrdersQuery.data?.items && pastOrdersQuery.data.items.length > 0 && (
          <SmartReorder
            orders={pastOrdersQuery.data.items}
            products={productList}
            cartQuantities={cartQuantityByProduct}
            onQtyChange={handleProductQtyChange}
            onAddToCartDirect={handleAddToCartDirect}
            onLoginRequired={() => router.push("/auth/login?role=customer")}
          />
        )}

        {/* ── 7B. SMART BASKET BUILDER ──────────────────────────── */}
        <section style={{ marginBottom: "8px" }}>
          <SmartBasket
            products={productList}
            onSuccess={(text) => {
              setToast({ type: "success", text });
              setTimeout(() => setToast(null), 3000);
            }}
          />
        </section>

        {/* ── 7C. RECURRING GROCERY REMINDERS ────────────────────── */}
        <section>
          <GroceryReminders
            products={productList}
            onAddToCart={handleAddToCartDirect}
          />
        </section>

        {/* ── 8. FAVORITE LOCAL FARMS ────────────────────────────── */}
        <section>
          <div style={{ marginBottom: "12px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "#063c32",
                letterSpacing: "-0.02em",
              }}
            >
              Verified Solapur Mandi Sellers
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
              Direct partnerships with genuine regional farming families
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
            }}
          >
            {LOCAL_FARMS.map((farm, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "18px",
                  border: "1px solid #e1e8e2",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(6, 60, 50, 0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "14px",
                      backgroundColor: "#f2f8f4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    🌾
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: 800, color: "#063c32" }}>
                      {farm.name}
                    </h4>
                    <p style={{ margin: "1px 0 0", fontSize: "11.5px", color: "#62746a" }}>
                      {farm.area} · {farm.specialty}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    backgroundColor: "#fef3c7",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    color: "#92400e",
                  }}
                >
                  <Star size={12} fill="#f59e0b" color="#f59e0b" />
                  <span>{farm.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 9. WHY VEGITO ─────────────────────────────────────── */}
        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #e1e8e2",
            padding: "24px 22px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                backgroundColor: "#e9f6ee",
                color: "#16835b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Leaf size={22} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 3px", fontSize: "14.5px", fontWeight: 800, color: "#063c32" }}>
                Direct Farm-to-Table
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#62746a", lineHeight: 1.45 }}>
                Zero middlemen. Harvested morning produce arrives at your doorstep fresh and crisp.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                backgroundColor: "#e9f6ee",
                color: "#16835b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Truck size={22} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 3px", fontSize: "14.5px", fontWeight: 800, color: "#063c32" }}>
                15–30 Min Express
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#62746a", lineHeight: 1.45 }}>
                Local delivery fleet ensures vegetables reach you before morning cooking begins.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                backgroundColor: "#e9f6ee",
                color: "#16835b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 3px", fontSize: "14.5px", fontWeight: 800, color: "#063c32" }}>
                Honest Mandi Pricing
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#62746a", lineHeight: 1.45 }}>
                Transparent pricing reflective of daily Solapur APMC wholesale rates.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── 10. STICKY MOBILE CART CHECKOUT BAR ────────────────── */}
      {totalCartCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "82px",
            left: "14px",
            right: "14px",
            zIndex: 150,
            maxWidth: "520px",
            margin: "0 auto",
          }}
        >
          <Link
            href="/customer/cart"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderRadius: "20px",
              backgroundColor: "#063c32",
              color: "#ffffff",
              textDecoration: "none",
              boxShadow: "0 10px 30px rgba(6, 60, 50, 0.35)",
              animation: "slideUp 0.25s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  backgroundColor: "#16835b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 900,
                }}
              >
                {totalCartCount}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 800 }}>
                  ₹{Number(totalCartAmount).toFixed(0)}
                </p>
                <p style={{ margin: 0, fontSize: "11px", color: "#a7f3d0" }}>
                  Plus applicable delivery & taxes
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, fontSize: "14px" }}>
              <span>View Basket</span>
              <ArrowRight size={17} />
            </div>
          </Link>
        </div>
      )}

      {/* ── 11. ROLE-AWARE BOTTOM NAVIGATION ───────────────────── */}
      <BottomNavigation basketCount={totalCartCount} />

      {/* ── 12. TOAST NOTIFICATION ─────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: totalCartCount > 0 ? "150px" : "94px",
            right: "18px",
            zIndex: 200,
            backgroundColor: toast.type === "success" ? "#063c32" : "#dc2626",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13.5px",
            fontWeight: 700,
            animation: "slideUp 0.2s ease",
          }}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} color="#34d399" /> : <AlertCircle size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Instamart-style Unified Location Modal */}
      <LocationModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSelect={(loc) => setSelectedLocation(loc.address)}
      />

      {/* Voice Shopping Modal */}
      <VoiceShoppingModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        products={productList}
        onSuccess={(text) => {
          setToast({ type: "success", text });
          setTimeout(() => setToast(null), 3000);
        }}
      />
    </div>
  );
}
export default PublicHome;

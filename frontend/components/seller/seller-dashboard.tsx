"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  ClipboardList,
  DollarSign,
  Clock,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  CheckCircle,
  Plus,
  Sparkles,
  Bell,
  Volume2,
  VolumeX,
  Power,
  Search,
  RefreshCw,
  ArrowUpRight,
  Check,
  X,
  ShieldCheck,
  Flame,
  Layers,
  Building2,
  Tag,
  Truck,
  Settings,
  Phone,
  Calendar,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AddProductModal } from "./add-product-modal";
import { OrderPreparationSheet } from "./order-preparation-sheet";
import { getSellerProfile, setSellerAvailability } from "@/lib/api/seller-products";
import {
  listSellerOrders,
  updateSellerOrder,
  getSellerRevenueAnalytics,
  getSellerProductAnalytics,
  getSellerDashboardSummary,
  getDeliveryHandoffStatus,
} from "@/lib/api/seller";
import { listInventory, adjustInventory, type InventoryItem } from "@/lib/api/inventory";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getStoredToken } from "@/lib/api/auth";
import { subscribeToSellerDashboard, type SellerNewOrderPayload } from "@/lib/api/seller-socket";
import {
  playNotificationSoundOnce,
  isAudioMuted,
  toggleAudioMute,
  resumeAudioContext,
  playNotificationSound,
} from "@/lib/audio/chime";
import { useTranslation } from "@/context/i18n-context";
import "@/styles/seller-dashboard-2.css";

import { getSellerKyc, type SellerKycData } from "@/lib/api/kyc";
import { SellerKycWizard } from "./seller-kyc-wizard";

export function SellerDashboard() {
  const { t, language, setLanguage } = useTranslation();
  const queryClient = useQueryClient();

  // State
  const [revenueRange, setRevenueRange] = useState<"7d" | "30d">("30d");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isKycWizardOpen, setIsKycWizardOpen] = useState(false);
  const [prepOrderId, setPrepOrderId] = useState<number | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<SellerNewOrderPayload | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState<"ALL" | "NEW" | "PACKING" | "READY" | "DELIVERED">("ALL");
  const [quickRestockItem, setQuickRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockNote, setRestockNote] = useState<string>("Fresh morning mandi harvest");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const seenOrderIds = useRef(new Set<number>());

  // Live seconds ticker for timer elapsed
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Seller profile (scoped to current authenticated seller)
  const profile = useQuery({
    queryKey: ["seller-profile"],
    queryFn: getSellerProfile,
  });

  // KYC query
  const kycQuery = useQuery({
    queryKey: ["seller-kyc"],
    queryFn: getSellerKyc,
    retry: false,
  });

  const isOnline = profile.data?.is_available !== false;

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: (newAvailable: boolean) => setSellerAvailability(newAvailable),
    onSuccess: (data) => {
      queryClient.setQueryData(["seller-profile"], data);
      queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
    },
  });

  // Orders Query
  const orders = useQuery({
    queryKey: ["seller-orders"],
    queryFn: () => listSellerOrders(),
    refetchInterval: 6000,
  });

  // Inventory Query
  const inventory = useQuery({
    queryKey: ["seller-inventory"],
    queryFn: () => listInventory(),
    refetchInterval: 15000,
  });

  // Revenue analytics Query
  const revenueAnalytics = useQuery({
    queryKey: ["seller-revenue-analytics", revenueRange],
    queryFn: () => getSellerRevenueAnalytics(revenueRange),
  });

  // Top products Query
  const topProducts = useQuery({
    queryKey: ["seller-top-products"],
    queryFn: () => getSellerProductAnalytics(5),
  });

  // Dashboard summary stats Query
  const dashboardSummary = useQuery({
    queryKey: ["seller-dashboard-summary"],
    queryFn: () => getSellerDashboardSummary(),
    refetchInterval: 12000,
  });

  // Delivery handoff status Query
  const handoffStatus = useQuery({
    queryKey: ["seller-delivery-handoff"],
    queryFn: () => getDeliveryHandoffStatus(),
    refetchInterval: 10000,
  });

  // Real-time WebSocket connection
  useEffect(() => {
    const token = getStoredToken() || "";
    if (!token) return;

    const cleanup = subscribeToSellerDashboard(token, {
      onNewOrder: async (notification) => {
        if (seenOrderIds.current.has(notification.order_id)) return;
        seenOrderIds.current.add(notification.order_id);

        queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
        queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
        queryClient.invalidateQueries({ queryKey: ["seller-dashboard-summary"] });
        setNewOrderAlert(notification);

        if (soundEnabled && !isAudioMuted()) {
          const played = await playNotificationSoundOnce(
            notification.event_id || `order-${notification.order_id}-NEW`
          );
          if (!played) {
            setAudioBlocked(true);
          } else {
            setAudioBlocked(false);
          }
        }
      },
      onPendingOrders: () => {
        queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      },
    });

    return () => {
      cleanup();
    };
  }, [queryClient, soundEnabled]);

  const handleToggleSound = () => {
    const nextMuted = toggleAudioMute();
    setSoundEnabled(!nextMuted);
    if (!nextMuted) {
      playNotificationSound();
    }
  };

  const handleEnableAudio = async () => {
    const resumed = await resumeAudioContext();
    if (resumed) {
      setAudioBlocked(false);
      await playNotificationSound();
    }
  };

  // Status transition mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: number;
      status: "ACCEPTED" | "PACKING" | "READY" | "REJECTED";
    }) => updateSellerOrder(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["seller-revenue-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["seller-delivery-handoff"] });
    },
  });

  // Quick Restock mutation
  const restockMutation = useMutation({
    mutationFn: ({
      sellerProductId,
      quantity,
      note,
    }: {
      sellerProductId: number;
      quantity: number;
      note: string;
    }) =>
      adjustInventory(sellerProductId, {
        quantity_change: quantity,
        transaction_type: "STOCK_IN",
        note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-inventory"] });
      setQuickRestockItem(null);
    },
  });

  // Data Calculations
  const businessName = profile.data?.business_name || "Farm Fresh Solapur";
  const orderItems = orders.data?.items ?? [];

  const inventoryItems = inventory.data?.items ?? [];
  const lowStockAlerts = inventoryItems.filter(
    (inv) => Number(inv.quantity) <= Number(inv.low_stock_threshold)
  );

  // Filtered orders by status & search
  const filteredOrders = useMemo(() => {
    let result = orderItems;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          String(o.id).includes(q) ||
          o.status.toLowerCase().includes(q)
      );
    }

    // Pipeline status filter
    if (pipelineFilter === "NEW") {
      result = result.filter((o) => ["NEW"].includes(o.status));
    } else if (pipelineFilter === "PACKING") {
      result = result.filter((o) =>
        ["ACCEPTED", "SELLER_ACCEPTED", "PACKING", "PREPARING"].includes(o.status)
      );
    } else if (pipelineFilter === "READY") {
      result = result.filter((o) =>
        ["READY", "READY_FOR_PICKUP"].includes(o.status)
      );
    } else if (pipelineFilter === "DELIVERED") {
      result = result.filter((o) =>
        ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(o.status)
      );
    }

    return result;
  }, [orderItems, searchQuery, pipelineFilter]);

  // Urgent Orders
  const urgentOrders = useMemo(
    () =>
      orderItems.filter(
        (o) =>
          o.is_urgent &&
          !["DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"].includes(o.status)
      ),
    [orderItems]
  );
  const urgentCount = urgentOrders.length;

  // Counters
  const newCount = orderItems.filter((o) => o.status === "NEW").length;
  const packingCount = orderItems.filter((o) =>
    ["ACCEPTED", "SELLER_ACCEPTED", "PACKING", "PREPARING"].includes(o.status)
  ).length;
  const readyCount = orderItems.filter((o) =>
    ["READY", "READY_FOR_PICKUP"].includes(o.status)
  ).length;
  const deliveredCount = orderItems.filter((o) =>
    ["DELIVERED", "COMPLETED"].includes(o.status)
  ).length;

  const todayRevenue =
    dashboardSummary.data?.today_revenue ??
    orderItems
      .filter((o) => !["CANCELLED", "REJECTED"].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const todayOrdersCount = dashboardSummary.data?.today_orders ?? orderItems.length;

  // Chart data format
  const chartData = (revenueAnalytics.data ?? []).map((item) => ({
    date: item.date?.slice(5) || item.date,
    revenue: Number(item.value || 0),
    orders: item.orders_count || 0,
  }));

  // Status donut data
  const statusDonutData = [
    { name: "New", value: newCount, color: "#f97316" },
    { name: "Packing", value: packingCount, color: "#0284c7" },
    { name: "Ready", value: readyCount, color: "#10b981" },
    { name: "Fulfilled", value: deliveredCount, color: "#8b5cf6" },
  ].filter((d) => d.value > 0);

  return (
    <DashboardShell
      role="seller"
      userName={businessName}
      userRole={profile.data?.is_verified ? "✓ " + t("seller.verifiedSeller", "Verified Producer") : t("seller.unverifiedSeller", "Producer (Verification Pending)")}
      greeting={`Mandi Operations · ${businessName}`}
      subtitle="Fast, real-time command center for produce harvesting, order packing, and delivery dispatch"
      searchPlaceholder="Instant search order #, item, status..."
      onSearchChange={(val) => setSearchQuery(val)}
    >
      <div className="seller-cc-root">
        {/* ═══════════════════════════════════════════════════════
            SECTION 1: TOP HEADER STATUS BAR & AUDIO CHIME TOGGLE
            ═══════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            backgroundColor: "var(--vegito-card, #ffffff)",
            padding: "16px 20px",
            borderRadius: "16px",
            border: "1px solid var(--vegito-border, #e8eee9)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              className={
                isOnline ? "seller-status-glow-online" : "seller-status-glow-offline"
              }
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "var(--vegito-text-main, #12221e)",
                  }}
                >
                  {businessName}
                </h1>
                {profile.data?.is_verified ? (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ShieldCheck size={12} /> ✓ VEGITO VERIFIED
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: "#fffbeb",
                      color: "#d97706",
                      border: "1px solid #fde68a",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Clock size={12} /> KYC: {kycQuery.data?.status || "NOT SUBMITTED"}
                  </span>
                )}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    backgroundColor: isOnline ? "#f0fdf4" : "#fef2f2",
                    color: isOnline ? "#15803d" : "#b91c1c",
                    border: isOnline ? "1px solid #bbf7d0" : "1px solid #fecaca",
                  }}
                >
                  {isOnline ? "🟢 LIVE IN MANDI" : "🔴 SHOP CLOSED"}
                </span>
              </div>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "12px",
                  color: "var(--vegito-text-muted, #62746a)",
                }}
              >
                Solapur Mandi Zone · 15 KM Delivery Telemetry Active
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Audio chime toggle */}
            <button
              onClick={handleToggleSound}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "12.5px",
                fontWeight: 700,
                border: "1px solid var(--vegito-border, #e8eee9)",
                backgroundColor: soundEnabled ? "#f0fdf4" : "var(--vegito-surface-muted, #f1f5f3)",
                color: soundEnabled ? "#15803d" : "var(--vegito-text-muted, #62746a)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Toggle audible order alert bell"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {soundEnabled ? "Bell Active" : "Sound Muted"}
            </button>

            {/* Manual refresh button */}
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
                queryClient.invalidateQueries({ queryKey: ["seller-inventory"] });
                queryClient.invalidateQueries({ queryKey: ["seller-dashboard-summary"] });
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "12.5px",
                fontWeight: 700,
                border: "1px solid var(--vegito-border, #e8eee9)",
                backgroundColor: "var(--vegito-card, #ffffff)",
                color: "var(--vegito-text-main, #12221e)",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>

            {/* Language Selector */}
            <div
              style={{
                display: "inline-flex",
                borderRadius: "10px",
                border: "1px solid var(--vegito-border, #e8eee9)",
                overflow: "hidden",
                background: "#f3f4f6",
              }}
            >
              {(["en", "mr", "hi"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  style={{
                    padding: "6px 11px",
                    fontSize: "12px",
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    background: language === l ? "#1a3d2b" : "transparent",
                    color: language === l ? "#ffffff" : "#4b5563",
                    transition: "all 0.15s ease",
                  }}
                >
                  {l === "en" ? "EN" : l === "mr" ? "मराठी" : "हिंदी"}
                </button>
              ))}
            </div>

            {/* Quick Add Product Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 800,
                backgroundColor: "#064e3b",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(6, 78, 59, 0.25)",
              }}
            >
              <Plus size={16} /> {t("seller.addProduct", "Add Vegetable")}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2: MASTER STORE AVAILABILITY SWITCH (3-SEC SITUATION #1)
            ═══════════════════════════════════════════════════════ */}
        <div className={`seller-availability-card ${isOnline ? "online" : "offline"}`}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: isOnline ? "#dcfce7" : "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isOnline ? "#15803d" : "#dc2626",
                flexShrink: 0,
              }}
            >
              <Power size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: isOnline ? "#15803d" : "#b91c1c",
                  }}
                >
                  {isOnline
                    ? t("seller.online", "Store is OPEN & Ready")
                    : t("seller.offline", "Store is CLOSED")}
                </span>
              </div>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "13px",
                  color: "var(--vegito-text-main, #12221e)",
                }}
              >
                {isOnline
                  ? "Customers across Solapur can view your live vegetable harvest and place instant delivery orders."
                  : "Your shop is offline. Customers cannot place new orders and will see you are unavailable."}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={toggleAvailabilityMutation.isPending}
            onClick={() => toggleAvailabilityMutation.mutate(!isOnline)}
            style={{
              padding: "10px 20px",
              borderRadius: "12px",
              fontSize: "13.5px",
              fontWeight: 800,
              cursor: "pointer",
              border: isOnline ? "1.5px solid #fca5a5" : "none",
              backgroundColor: isOnline ? "#ffffff" : "#16a34a",
              color: isOnline ? "#b91c1c" : "#ffffff",
              boxShadow: isOnline ? "none" : "0 4px 12px rgba(22, 163, 74, 0.3)",
              transition: "all 0.2s",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Power size={16} />
            {toggleAvailabilityMutation.isPending
              ? "Updating..."
              : isOnline
              ? t("seller.switchOffline", "🔴 Close Shop (Go Offline)")
              : t("seller.switchOnline", "🟢 Open Shop (Go Online)")}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2.5: SELLER KYC VERIFICATION STATUS BANNER
            ═══════════════════════════════════════════════════════ */}
        {!profile.data?.is_verified && (
          <div
            style={{
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              border:
                kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                  ? "1.5px solid #bfdbfe"
                  : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                  ? "1.5px solid #fed7aa"
                  : kycQuery.data?.status === "REJECTED"
                  ? "1.5px solid #fecaca"
                  : "1.5px solid #fde68a",
              backgroundColor:
                kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                  ? "#eff6ff"
                  : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                  ? "#fff7ed"
                  : kycQuery.data?.status === "REJECTED"
                  ? "#fef2f2"
                  : "#fffbeb",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#ffffff",
                  color:
                    kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                      ? "#2563eb"
                      : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                      ? "#ea580c"
                      : kycQuery.data?.status === "REJECTED"
                      ? "#dc2626"
                      : "#d97706",
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <strong
                  style={{
                    fontSize: "14.5px",
                    color:
                      kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                        ? "#1e40af"
                        : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                        ? "#9a3412"
                        : kycQuery.data?.status === "REJECTED"
                        ? "#991b1b"
                        : "#92400e",
                  }}
                >
                  {kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                    ? "KYC Verification Under Review"
                    : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                    ? "KYC Document Re-upload Requested"
                    : kycQuery.data?.status === "REJECTED"
                    ? "KYC Application Rejected"
                    : "Complete Mandi Seller Verification"}
                </strong>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "12.5px",
                    color: "var(--vegito-text-muted, #62746a)",
                  }}
                >
                  {kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                    ? "Vegito operations team is verifying your shop license and bank account. You can configure products while under review."
                    : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                    ? `Admin review note: ${kycQuery.data?.reupload_notes || "Please re-upload clearer photos of business proof or shop signage."}`
                    : kycQuery.data?.status === "REJECTED"
                    ? `Rejection note: ${kycQuery.data?.rejection_reason || "Documents could not be verified."} Please update and re-submit.`
                    : "Upload shop registration, owner ID proof, live photo, and bank details to unlock instant payouts and verified badge."}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsKycWizardOpen(true)}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                border: "none",
                backgroundColor:
                  kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                    ? "#2563eb"
                    : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                    ? "#ea580c"
                    : kycQuery.data?.status === "REJECTED"
                    ? "#dc2626"
                    : "#d97706",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              {kycQuery.data?.status === "UNDER_REVIEW" || kycQuery.data?.status === "SUBMITTED"
                ? "View KYC Details"
                : kycQuery.data?.status === "REUPLOAD_REQUIRED"
                ? "Re-upload Documents"
                : kycQuery.data?.status === "REJECTED"
                ? "Resubmit KYC"
                : "Start Verification"}
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            SECTION 17: PROMINENT NEXT ACTION CARD
            ═══════════════════════════════════════════════════════ */}
        {newCount > 0 ? (
          <div
            style={{
              backgroundColor: "#fff7ed",
              border: "2px solid #fb923c",
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              boxShadow: "0 4px 16px rgba(251, 146, 60, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#ea580c",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "18px",
                }}
              >
                ⚡
              </div>
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#c2410c",
                  }}
                >
                  NEXT ACTION · ORDER PIPELINE
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 800, color: "#9a3412" }}>
                  {newCount} {newCount === 1 ? "new order needs" : "new orders need"} acceptance
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#c2410c" }}>
                  Accept immediately to alert nearby delivery partners for mandi pickup.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPipelineFilter("NEW")}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                backgroundColor: "#ea580c",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(234, 88, 12, 0.3)",
              }}
            >
              Review {newCount} Orders →
            </button>
          </div>
        ) : packingCount > 0 ? (
          <div
            style={{
              backgroundColor: "#f0f9ff",
              border: "2px solid #38bdf8",
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              boxShadow: "0 4px 16px rgba(56, 189, 248, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "18px",
                }}
              >
                📦
              </div>
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#0369a1",
                  }}
                >
                  NEXT ACTION · PACKING
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 800, color: "#075985" }}>
                  {packingCount} {packingCount === 1 ? "order is" : "orders are"} being packed
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#0369a1" }}>
                  Finish weighing & packing items, then mark ready to generate delivery partner pickup OTP.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPipelineFilter("PACKING")}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                backgroundColor: "#0284c7",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
              }}
            >
              Start Packing ({packingCount}) →
            </button>
          </div>
        ) : readyCount > 0 ? (
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "2px solid #4ade80",
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              boxShadow: "0 4px 16px rgba(74, 222, 128, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "18px",
                }}
              >
                🤝
              </div>
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#15803d",
                  }}
                >
                  NEXT ACTION · READY FOR DELIVERY
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 800, color: "#166534" }}>
                  {readyCount} {readyCount === 1 ? "order ready" : "orders ready"} for customer delivery
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#15803d" }}>
                  Group up to 10 nearby orders into a delivery route, check your bag, and dispatch.
                </p>
              </div>
            </div>
            <Link
              href="/seller/deliveries"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                borderRadius: "10px",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(22, 163, 74, 0.3)",
              }}
            >
              Start Delivery Route ({readyCount}) 🚴 →
            </Link>
          </div>
        ) : null}

        {/* Realtime Alert Banner on Audio Blocked */}
        {audioBlocked && (
          <div
            style={{
              backgroundColor: "#fffbeb",
              border: "1.5px solid #fde68a",
              borderRadius: "12px",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <VolumeX size={18} color="#b45309" />
              <span style={{ fontSize: "13px", color: "#92400e", fontWeight: 600 }}>
                Browser autoplay policy muted order alert chimes. Click to enable live notifications.
              </span>
            </div>
            <button
              onClick={handleEnableAudio}
              style={{
                backgroundColor: "#d97706",
                color: "#ffffff",
                border: "none",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Unmute Alert Chimes
            </button>
          </div>
        )}

        {/* Realtime Order Notification Banner */}
        {newOrderAlert && (
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "2px solid #22c55e",
              borderRadius: "16px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "0 4px 16px rgba(34, 197, 94, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Bell size={24} color="#15803d" />
              <div>
                <strong style={{ fontSize: "15px", color: "#14532d" }}>
                  🔔 New Order Arrived! #{newOrderAlert.order_number}
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#166534" }}>
                  Customer: <b>{newOrderAlert.customer_name}</b> • Total: ₹
                  {Number(newOrderAlert.total_amount).toFixed(2)} • Area:{" "}
                  {newOrderAlert.delivery_area}
                </p>
              </div>
            </div>
            <button
              onClick={() => setNewOrderAlert(null)}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #86efac",
                color: "#15803d",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            SECTION 3: URGENT ORDERS ACTION CENTER (3-SEC SITUATION #3)
            ═══════════════════════════════════════════════════════ */}
        {urgentCount > 0 ? (
          <div className="seller-urgent-banner">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Flame size={22} color="#dc2626" />
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "15.5px",
                      fontWeight: 800,
                      color: "#991b1b",
                    }}
                  >
                    {t("seller.urgentAlert", "Urgent Priority Orders Requiring Immediate Action")} ({urgentCount})
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#b91c1c" }}>
                    Customer priority delivery requested. Pack immediately to fulfill guaranteed SLA.
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "12px",
              }}
            >
              {urgentOrders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #fca5a5",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 800, color: "#991b1b", fontSize: "14px" }}>
                        #{ord.order_number}
                      </span>
                      <StatusBadge status={ord.status} />
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#62746a" }}>
                      ₹{Number(ord.total_amount).toFixed(0)} · {ord.items_count || 1} items
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    {ord.status === "NEW" && (
                      <button
                        onClick={() =>
                          updateStatusMutation.mutate({ orderId: ord.id, status: "ACCEPTED" })
                        }
                        disabled={updateStatusMutation.isPending}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#991b1b",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Accept
                      </button>
                    )}
                    {ord.status === "ACCEPTED" && (
                      <button
                        onClick={() =>
                          updateStatusMutation.mutate({ orderId: ord.id, status: "PACKING" })
                        }
                        disabled={updateStatusMutation.isPending}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#c2410c",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Pack Now
                      </button>
                    )}
                    {ord.status === "PACKING" && (
                      <button
                        onClick={() =>
                          updateStatusMutation.mutate({ orderId: ord.id, status: "READY" })
                        }
                        disabled={updateStatusMutation.isPending}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#059669",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Ready ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "var(--vegito-card, #ffffff)",
              border: "1px solid #bbf7d0",
              borderRadius: "14px",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle size={18} color="#16a34a" />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#15803d",
                }}
              >
                {t("seller.allCaughtUp", "All Caught Up! No pending urgent bottlenecks.")}
              </span>
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "var(--vegito-text-muted, #62746a)",
              }}
            >
              Fulfillment queue operating at normal speed
            </span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            SECTION 4: TODAY'S COMMAND CENTER (KEY OPERATIONAL METRICS)
            ═══════════════════════════════════════════════════════ */}
        <div className="seller-kpi-grid">
          {/* Today's Orders */}
          <div
            className={`seller-kpi-card ${pipelineFilter === "ALL" ? "active" : ""}`}
            onClick={() => setPipelineFilter("ALL")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--vegito-text-muted, #62746a)",
                  textTransform: "uppercase",
                }}
              >
                Today&apos;s Orders
              </span>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#ffedd5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#c2410c",
                }}
              >
                <ClipboardList size={18} />
              </div>
            </div>
            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#9a3412",
                  lineHeight: 1,
                }}
              >
                {todayOrdersCount}
              </div>
              <span style={{ fontSize: "11px", color: "#62746a", marginTop: "4px", display: "block" }}>
                Click to show all
              </span>
            </div>
          </div>

          {/* Today's Revenue */}
          <div className="seller-kpi-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--vegito-text-muted, #62746a)",
                  textTransform: "uppercase",
                }}
              >
                {t("seller.todayRevenue", "Today's Revenue")}
              </span>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#d97706",
                }}
              >
                <DollarSign size={18} />
              </div>
            </div>
            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#b45309",
                  lineHeight: 1,
                }}
              >
                ₹{todayRevenue.toLocaleString("en-IN")}
              </div>
              <span style={{ fontSize: "11px", color: "#16a34a", marginTop: "4px", display: "block" }}>
                Real mandi earnings
              </span>
            </div>
          </div>

          {/* New Orders Pending */}
          <div
            className={`seller-kpi-card ${pipelineFilter === "NEW" ? "active" : ""}`}
            onClick={() => setPipelineFilter(pipelineFilter === "NEW" ? "ALL" : "NEW")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--vegito-text-muted, #62746a)",
                  textTransform: "uppercase",
                }}
              >
                New Incoming
              </span>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#ffedd5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ea580c",
                }}
              >
                <ShoppingBag size={18} />
              </div>
            </div>
            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: newCount > 0 ? "#ea580c" : "var(--vegito-text-main, #12221e)",
                  lineHeight: 1,
                }}
              >
                {newCount}
              </div>
              <span style={{ fontSize: "11px", color: "#62746a", marginTop: "4px", display: "block" }}>
                {newCount > 0 ? "⚠️ Needs acceptance" : "All accepted"}
              </span>
            </div>
          </div>

          {/* Packing Now */}
          <div
            className={`seller-kpi-card ${pipelineFilter === "PACKING" ? "active" : ""}`}
            onClick={() => setPipelineFilter(pipelineFilter === "PACKING" ? "ALL" : "PACKING")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--vegito-text-muted, #62746a)",
                  textTransform: "uppercase",
                }}
              >
                {t("seller.packingNow", "Packing In Progress")}
              </span>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#e0f2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0284c7",
                }}
              >
                <Clock size={18} />
              </div>
            </div>
            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#0369a1",
                  lineHeight: 1,
                }}
              >
                {packingCount}
              </div>
              <span style={{ fontSize: "11px", color: "#62746a", marginTop: "4px", display: "block" }}>
                Active in harvest station
              </span>
            </div>
          </div>

          {/* Ready for Pickup */}
          <div
            className={`seller-kpi-card ${pipelineFilter === "READY" ? "active" : ""}`}
            onClick={() => setPipelineFilter(pipelineFilter === "READY" ? "ALL" : "READY")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--vegito-text-muted, #62746a)",
                  textTransform: "uppercase",
                }}
              >
                {t("seller.readyPickup", "Ready for Pickup")}
              </span>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16a34a",
                }}
              >
                <CheckCircle size={18} />
              </div>
            </div>
            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#15803d",
                  lineHeight: 1,
                }}
              >
                {readyCount}
              </div>
              <span style={{ fontSize: "11px", color: "#62746a", marginTop: "4px", display: "block" }}>
                Waiting for delivery boy
              </span>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div
            className="seller-kpi-card"
            style={{
              borderColor: lowStockAlerts.length > 0 ? "#fca5a5" : undefined,
              backgroundColor: lowStockAlerts.length > 0 ? "#fffaf9" : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: lowStockAlerts.length > 0 ? "#b91c1c" : "var(--vegito-text-muted, #62746a)",
                  textTransform: "uppercase",
                }}
              >
                Low Stock Alerts
              </span>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: lowStockAlerts.length > 0 ? "#fee2e2" : "#f1f5f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: lowStockAlerts.length > 0 ? "#dc2626" : "#62746a",
                }}
              >
                <AlertTriangle size={18} />
              </div>
            </div>
            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: lowStockAlerts.length > 0 ? "#dc2626" : "var(--vegito-text-main, #12221e)",
                  lineHeight: 1,
                }}
              >
                {lowStockAlerts.length}
              </div>
              <span style={{ fontSize: "11px", color: "#62746a", marginTop: "4px", display: "block" }}>
                {lowStockAlerts.length > 0 ? "Requires restocking" : "Stock healthy"}
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 5: QUICK ACTIONS HUB (1-CLICK DIRECT SHORTCUTS)
            ═══════════════════════════════════════════════════════ */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--vegito-text-muted, #62746a)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {t("seller.quickActions", "Quick Operations Hub")}
            </span>
          </div>
          <div className="seller-action-hub">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="seller-action-btn"
              style={{ borderColor: "#059669", backgroundColor: "#f0fdf4" }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  backgroundColor: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16a34a",
                }}
              >
                <Plus size={18} />
              </div>
              <span>Add Vegetable</span>
            </button>

            <Link href="/seller/orders" className="seller-action-btn">
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  backgroundColor: "#ffedd5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ea580c",
                }}
              >
                <ClipboardList size={18} />
              </div>
              <span>All Orders ({orderItems.length})</span>
            </Link>

            <Link href="/seller/inventory" className="seller-action-btn">
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  backgroundColor: "#e0f2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0284c7",
                }}
              >
                <Layers size={18} />
              </div>
              <span>Inventory ({inventoryItems.length})</span>
            </Link>

            <Link href="/seller/bulk-orders" className="seller-action-btn">
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  backgroundColor: "#ede9fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#7c3aed",
                }}
              >
                <Building2 size={18} />
              </div>
              <span>B2B Bulk Orders</span>
            </Link>

            <Link href="/seller/analytics" className="seller-action-btn">
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  backgroundColor: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#d97706",
                }}
              >
                <TrendingUp size={18} />
              </div>
              <span>Sales Analytics</span>
            </Link>

            <Link href="/seller/promotions" className="seller-action-btn">
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  backgroundColor: "#fce7f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#db2777",
                }}
              >
                <Tag size={18} />
              </div>
              <span>Offers & Deals</span>
            </Link>

            <a href="#delivery-handoff" className="seller-action-btn">
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  backgroundColor: "#f0fdf4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                }}
              >
                <Truck size={18} />
              </div>
              <span>Delivery Fleet</span>
            </a>

            <Link href="/seller/profile" className="seller-action-btn">
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  backgroundColor: "#f1f5f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                }}
              >
                <Settings size={18} />
              </div>
              <span>Store Settings</span>
            </Link>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 5.5: TODAY'S DELIVERY ROUTE (5-10 ORDERS ROUTE)
            ═══════════════════════════════════════════════════════ */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a3d2b 0%, #29573e 100%)",
            borderRadius: "16px",
            padding: "20px 24px",
            color: "#ffffff",
            boxShadow: "0 4px 16px rgba(26,61,43,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ maxWidth: "600px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "999px",
                  background: "#6fcf3a",
                  color: "#1a3d2b",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                }}
              >
                1 SELLER = 1 DELIVERY PARTNER
              </span>
              <span style={{ fontSize: "12px", opacity: 0.85 }}>
                {t("seller.maxBatchNotice", "Max 10 orders per delivery round")}
              </span>
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800 }}>
              🚴 {t("seller.suggestedRoute", "Today's Delivery Route & Dispatch")}
            </h2>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.9, lineHeight: 1.4 }}>
              {readyCount > 0
                ? `${readyCount} packed orders are ready for delivery across Solapur. Create a batch of up to 10 nearby orders, load your bag, and start the round.`
                : "No packed orders ready yet. As soon as you pack orders, Vegito groups nearby customers into an optimal 5–10 order delivery route."}
            </p>

            {dashboardSummary.data?.suggested_route && dashboardSummary.data.suggested_route.batches.length > 0 && (
              <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {dashboardSummary.data.suggested_route.batches.map((b) => (
                  <span
                    key={b.group_number}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.15)",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    📍 Round #{b.group_number}: {b.order_count} orders ({b.areas.join(", ")})
                    {b.estimated_km ? ` · ~${b.estimated_km} km` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/seller/deliveries"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 22px",
              borderRadius: "12px",
              background: "#6fcf3a",
              color: "#1a3d2b",
              fontWeight: 800,
              fontSize: "14px",
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(111,207,58,0.35)",
            }}
          >
            <Truck size={18} />
            {readyCount > 0 ? `Open Delivery Route (${readyCount}) →` : "Manage Deliveries →"}
          </Link>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 5.6: TODAY'S REAL BUSINESS ANALYTICS & PROFIT NOTE
            ═══════════════════════════════════════════════════════ */}
        <div
          style={{
            backgroundColor: "var(--vegito-card, #ffffff)",
            border: "1px solid var(--vegito-border, #e8eee9)",
            borderRadius: "16px",
            padding: "20px 22px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
              borderBottom: "1px solid #f3f4f6",
              paddingBottom: "12px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--vegito-text-main, #12221e)" }}>
                📊 {t("seller.salesToday", "Today's Business Analytics")}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "var(--vegito-text-muted, #62746a)" }}>
                Real-time daily sales, items dispatched, customer locality distribution, and top-selling produce
              </p>
            </div>

            {/* Profit availability badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "999px",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                color: "#92400e",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <AlertCircle size={14} />
              <span>{t("seller.profitNotice", "Profit data unavailable (Gross sales shown)")}</span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            {/* Real Gross Sales Today */}
            <div style={{ padding: "14px", borderRadius: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                {t("seller.salesToday", "Today's Gross Sales")}
              </span>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#15803d", marginTop: "4px" }}>
                ₹{Number(dashboardSummary.data?.sales_today ?? todayRevenue).toLocaleString("en-IN")}
              </div>
              <span style={{ fontSize: "11px", color: "#166534" }}>Confirmed revenue today</span>
            </div>

            {/* Items Sold Today */}
            <div style={{ padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                {t("seller.itemsSoldToday", "Items Sold Today")}
              </span>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b", marginTop: "4px" }}>
                {dashboardSummary.data?.items_sold_today ?? 0}
              </div>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Vegetable & fruit units</span>
            </div>

            {/* Average Order Value */}
            <div style={{ padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                {t("seller.avgOrderValue", "Avg Order Value")}
              </span>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b", marginTop: "4px" }}>
                ₹{Number(dashboardSummary.data?.avg_order_value ?? 0).toFixed(0)}
              </div>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Per customer order</span>
            </div>
          </div>

          {/* Area Breakdown & Top Products Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {/* Orders by Area Breakdown */}
            <div style={{ padding: "14px", borderRadius: "12px", background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 800, color: "#374151" }}>
                📍 {t("seller.areaBreakdown", "Orders by Solapur Area")}
              </h4>
              {dashboardSummary.data?.area_orders && Object.keys(dashboardSummary.data.area_orders).length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {Object.entries(dashboardSummary.data.area_orders).map(([area, count]) => (
                    <span
                      key={area}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: "1px solid #d1d5db",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "#1f2937",
                      }}
                    >
                      {area}: <b style={{ color: "#15803d" }}>{count}</b>
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "12.5px", color: "#9ca3af" }}>
                  No customer orders logged today yet.
                </p>
              )}
            </div>

            {/* Top Products Today */}
            <div style={{ padding: "14px", borderRadius: "12px", background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 800, color: "#374151" }}>
                🥬 {t("seller.topSellingToday", "Top Selling Products Today")}
              </h4>
              {dashboardSummary.data?.top_products_today && dashboardSummary.data.top_products_today.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {dashboardSummary.data.top_products_today.map((prod, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "12.5px",
                        padding: "4px 0",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#1f2937" }}>
                        {idx + 1}. {prod.name} ({prod.quantity} sold)
                      </span>
                      <strong style={{ color: "#15803d" }}>₹{Number(prod.revenue).toFixed(0)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "12.5px", color: "#9ca3af" }}>
                  Product volume data will populate as orders are placed.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 6: FULFILLMENT PIPELINE & PACKING STATION (3-SEC SITUATION #4 & #5)
            ═══════════════════════════════════════════════════════ */}
        <div
          style={{
            backgroundColor: "var(--vegito-card, #ffffff)",
            border: "1px solid var(--vegito-border, #e8eee9)",
            borderRadius: "16px",
            padding: "20px 22px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "var(--vegito-text-main, #12221e)",
                }}
              >
                {t("seller.orderPipeline", "Fulfillment Pipeline & Packing Station")}
              </h2>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "12.5px",
                  color: "var(--vegito-text-muted, #62746a)",
                }}
              >
                Accept new orders, pack with real-time timer, and generate delivery OTP
              </p>
            </div>

            {/* Pipeline Stage Tabs */}
            <div className="seller-pipeline-nav">
              {[
                { id: "ALL", label: `All (${orderItems.length})` },
                { id: "NEW", label: `Incoming (${newCount})` },
                { id: "PACKING", label: `Packing Queue (${packingCount})` },
                { id: "READY", label: `Ready for Pickup (${readyCount})` },
                { id: "DELIVERED", label: `Fulfilled (${deliveredCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPipelineFilter(tab.id as any)}
                  className={`seller-pipeline-tab ${pipelineFilter === tab.id ? "active" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar inside pipeline if not using header search */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#62746a",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order # or status..."
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                borderRadius: "10px",
                border: "1.5px solid var(--vegito-border, #e8eee9)",
                backgroundColor: "var(--vegito-surface-muted, #f8faf7)",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Orders List / Cards */}
          {orders.isLoading ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "#62746a" }}>
              <RefreshCw size={24} style={{ animation: "spin 1s infinite linear" }} />
              <p style={{ marginTop: "8px", fontSize: "13px" }}>Loading real-time orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 16px",
                color: "var(--vegito-text-muted, #62746a)",
                backgroundColor: "var(--vegito-surface-muted, #f8faf7)",
                borderRadius: "12px",
              }}
            >
              <ShoppingBag size={36} color="#16a34a" style={{ margin: "0 auto 8px" }} />
              <h4 style={{ margin: 0, fontWeight: 800, color: "var(--vegito-text-main, #12221e)" }}>
                No orders in this stage
              </h4>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px" }}>
                Switch tab to &quot;All&quot; or wait for new incoming Solapur harvest orders.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredOrders.slice(0, 15).map((order) => {
                const placedDate = new Date(order.placed_at);
                const elapsedSeconds = Math.max(
                  0,
                  Math.floor((currentTime.getTime() - placedDate.getTime()) / 1000)
                );
                const elapsedMins = Math.floor(elapsedSeconds / 60);
                const elapsedSecsRem = elapsedSeconds % 60;
                const isPacking = ["ACCEPTED", "SELLER_ACCEPTED", "PACKING", "PREPARING"].includes(
                  order.status
                );

                return (
                  <div
                    key={order.id}
                    className={`seller-order-card ${order.is_urgent ? "urgent" : ""}`}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              fontWeight: 900,
                              color: "var(--vegito-text-main, #12221e)",
                              fontSize: "15px",
                            }}
                          >
                            #{order.order_number}
                          </span>
                          {order.is_urgent && (
                            <span
                              style={{
                                backgroundColor: "#fef2f2",
                                color: "#dc2626",
                                fontSize: "11px",
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: "6px",
                                border: "1px solid #fecaca",
                              }}
                            >
                              🔥 Urgent
                            </span>
                          )}
                          <StatusBadge status={order.status} />

                          {/* Packing elapsed live timer badge */}
                          {isPacking && (
                            <div className="seller-timer-badge">
                              <span className="seller-timer-dot" />
                              <span>
                                {elapsedMins}m {elapsedSecsRem}s
                              </span>
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginTop: "6px",
                            fontSize: "12.5px",
                            color: "var(--vegito-text-muted, #62746a)",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            Placed:{" "}
                            {placedDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            Total:{" "}
                            <b style={{ color: "var(--vegito-text-main, #12221e)" }}>
                              ₹{Number(order.total_amount).toFixed(2)}
                            </b>
                          </span>
                          {order.items_count && (
                            <>
                              <span>•</span>
                              <span>{order.items_count} items</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Pickup Handshake OTP (shown when READY) */}
                      {order.pickup_otp &&
                        ["READY", "READY_FOR_PICKUP", "PICKED_UP"].includes(order.status) && (
                          <div className="seller-otp-badge">
                            <ShieldCheck size={16} />
                            <div>
                              <div
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Delivery Boy OTP
                              </div>
                              <span className="seller-otp-digits">{order.pickup_otp}</span>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Operational Actions */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        paddingTop: "8px",
                        borderTop: "1px dashed var(--vegito-border, #e8eee9)",
                      }}
                    >
                      {/* Preparation Checklist Sheet Button */}
                      <button
                        onClick={() => setPrepOrderId(order.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          backgroundColor: "var(--vegito-surface-muted, #f1f5f3)",
                          border: "1px solid var(--vegito-border, #e8eee9)",
                          color: "var(--vegito-text-main, #12221e)",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        📋 Pack Checklist
                      </button>

                      {order.status === "NEW" && (
                        <>
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({
                                orderId: order.id,
                                status: "ACCEPTED",
                              })
                            }
                            disabled={updateStatusMutation.isPending}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "8px",
                              backgroundColor: "#064e3b",
                              color: "#ffffff",
                              fontSize: "12.5px",
                              fontWeight: 800,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Accept Order
                          </button>
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({
                                orderId: order.id,
                                status: "REJECTED",
                              })
                            }
                            disabled={updateStatusMutation.isPending}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              backgroundColor: "#fee2e2",
                              color: "#dc2626",
                              fontSize: "12px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {order.status === "ACCEPTED" && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              orderId: order.id,
                              status: "PACKING",
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            backgroundColor: "#c2410c",
                            color: "#ffffff",
                            fontSize: "12.5px",
                            fontWeight: 800,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Start Packing
                        </button>
                      )}

                      {order.status === "PACKING" && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              orderId: order.id,
                              status: "READY",
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                          style={{
                            padding: "6px 16px",
                            borderRadius: "8px",
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                            fontSize: "12.5px",
                            fontWeight: 800,
                            border: "none",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
                          }}
                        >
                          <CheckCircle size={15} /> Mark READY for Pickup
                        </button>
                      )}

                      {["READY", "READY_FOR_PICKUP"].includes(order.status) && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#16a34a",
                            fontWeight: 800,
                            padding: "4px 8px",
                            backgroundColor: "#f0fdf4",
                            borderRadius: "6px",
                          }}
                        >
                          ✓ Packed & Waiting for Fleet
                        </span>
                      )}

                      {["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status) && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            fontWeight: 700,
                          }}
                        >
                          Dispatched / Fulfilled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            SECTION 7 & 8: DUAL COLUMN — SALES REVENUE + FLEET & INVENTORY DESK
            ═══════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: "20px",
            alignItems: "start",
          }}
          className="seller-dual-col-layout"
        >
          {/* Left Column: Recharts Sales Performance Analytics */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                backgroundColor: "var(--vegito-card, #ffffff)",
                border: "1px solid var(--vegito-border, #e8eee9)",
                borderRadius: "16px",
                padding: "20px 22px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
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
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "var(--vegito-text-main, #12221e)",
                    }}
                  >
                    Revenue & Demand Performance
                  </h3>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "12px",
                      color: "var(--vegito-text-muted, #62746a)",
                    }}
                  >
                    Real-time sales earnings curve from your harvested produce
                  </p>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setRevenueRange("7d")}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      border:
                        revenueRange === "7d"
                          ? "1.5px solid #064e3b"
                          : "1px solid var(--vegito-border, #e8eee9)",
                      backgroundColor:
                        revenueRange === "7d" ? "#064e3b" : "var(--vegito-card, #ffffff)",
                      color: revenueRange === "7d" ? "#ffffff" : "var(--vegito-text-muted, #62746a)",
                      cursor: "pointer",
                    }}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setRevenueRange("30d")}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      border:
                        revenueRange === "30d"
                          ? "1.5px solid #064e3b"
                          : "1px solid var(--vegito-border, #e8eee9)",
                      backgroundColor:
                        revenueRange === "30d" ? "#064e3b" : "var(--vegito-card, #ffffff)",
                      color: revenueRange === "30d" ? "#ffffff" : "var(--vegito-text-muted, #62746a)",
                      cursor: "pointer",
                    }}
                  >
                    30 Days
                  </button>
                </div>
              </div>

              {/* Area Chart */}
              <div style={{ height: "240px", width: "100%" }}>
                {chartData.length === 0 ? (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#62746a",
                      fontSize: "13px",
                    }}
                  >
                    No revenue records available for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sellerRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.6} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={false}
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "10px",
                          border: "1px solid #e5e7eb",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#059669"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#sellerRevGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Low-Stock Quick Restock Desk (3-SEC SITUATION #6) */}
            <div
              style={{
                backgroundColor: "var(--vegito-card, #ffffff)",
                border: "1px solid var(--vegito-border, #e8eee9)",
                borderRadius: "16px",
                padding: "20px 22px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
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
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "var(--vegito-text-main, #12221e)",
                    }}
                  >
                    Inventory & Low-Stock Alerts ({lowStockAlerts.length})
                  </h3>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "12px",
                      color: "var(--vegito-text-muted, #62746a)",
                    }}
                  >
                    Click &quot;Restock&quot; to quickly add freshly harvested quantities in 1 click
                  </p>
                </div>
                <Link
                  href="/seller/inventory"
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#059669",
                    textDecoration: "none",
                  }}
                >
                  Manage All →
                </Link>
              </div>

              {lowStockAlerts.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <CheckCircle size={18} color="#15803d" />
                  <span style={{ fontSize: "13px", color: "#166534", fontWeight: 700 }}>
                    All produce inventory is above threshold! Zero stock-out risks today.
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {lowStockAlerts.slice(0, 5).map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "13.5px", color: "#991b1b" }}>
                          {inv.product_name || "Vegetable Produce"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#b91c1c" }}>
                          Current: <b>{inv.quantity} {inv.product_unit || "kg"}</b> (Alert at:{" "}
                          {inv.low_stock_threshold} {inv.product_unit || "kg"})
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setQuickRestockItem(inv);
                          setRestockQty(10);
                        }}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "8px",
                          backgroundColor: "#dc2626",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 800,
                          border: "none",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Plus size={14} /> Quick Restock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Delivery Handoff + Top Selling Produce + Fulfillment Donut */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Delivery Fleet Handoff Desk (3-SEC SITUATION #9) */}
            <div
              id="delivery-handoff"
              style={{
                backgroundColor: "var(--vegito-card, #ffffff)",
                border: "1px solid var(--vegito-border, #e8eee9)",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Truck size={18} color="#059669" />
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "var(--vegito-text-main, #12221e)",
                  }}
                >
                  {t("seller.partnerHandoff", "Delivery Fleet Handoff Desk")}
                </h3>
              </div>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: "12px",
                  color: "var(--vegito-text-muted, #62746a)",
                }}
              >
                Ready orders dispatched with OTP handshake. Customer GPS remains private.
              </p>

              {handoffStatus.isLoading ? (
                <p style={{ fontSize: "12px", color: "#62746a" }}>Checking fleet telemetry...</p>
              ) : (handoffStatus.data ?? []).length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    backgroundColor: "var(--vegito-surface-muted, #f8faf7)",
                    textAlign: "center",
                    fontSize: "12.5px",
                    color: "var(--vegito-text-muted, #62746a)",
                  }}
                >
                  No active pickups pending handoff.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(handoffStatus.data ?? []).map((handoff: any) => (
                    <div
                      key={handoff.order_id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "12px",
                        backgroundColor: "#fafcf9",
                        border: "1px solid #edf2ee",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontWeight: 800, fontSize: "13.5px", color: "#063c32" }}>
                          Order #{handoff.order_number}
                        </span>
                        <StatusBadge status={handoff.status} />
                      </div>

                      <div style={{ fontSize: "12px", color: "#62746a", margin: "4px 0" }}>
                        Driver: <b>{handoff.delivery_partner_name || "Assigning fleet..."}</b>
                        {handoff.delivery_partner_phone && (
                          <a
                            href={`tel:${handoff.delivery_partner_phone}`}
                            style={{
                              marginLeft: "6px",
                              color: "#059669",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <Phone size={11} /> {handoff.delivery_partner_phone}
                          </a>
                        )}
                      </div>

                      {handoff.pickup_otp && (
                        <div
                          style={{
                            marginTop: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: "#ecfdf5",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#065f46" }}>
                            Pickup OTP:
                          </span>
                          <span
                            style={{
                              fontSize: "15px",
                              fontWeight: 900,
                              color: "#064e3b",
                              letterSpacing: "1.5px",
                            }}
                          >
                            {handoff.pickup_otp}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Performing Produce (3-SEC SITUATION #8) */}
            <div
              style={{
                backgroundColor: "var(--vegito-card, #ffffff)",
                border: "1px solid var(--vegito-border, #e8eee9)",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={18} color="#d97706" />
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "var(--vegito-text-main, #12221e)",
                    }}
                  >
                    Top Selling Produce
                  </h3>
                </div>
                <Link
                  href="/seller/products"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#059669",
                    textDecoration: "none",
                  }}
                >
                  View All →
                </Link>
              </div>

              {topProducts.isLoading ? (
                <p style={{ fontSize: "12px", color: "#62746a" }}>Loading rankings...</p>
              ) : (topProducts.data ?? []).length === 0 ? (
                <p style={{ fontSize: "12px", color: "#62746a" }}>
                  No sales recorded yet. Add fresh harvests to start ranking.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(topProducts.data ?? []).map((prod: any, idx: number) => {
                    const medals = ["🥇", "🥈", "🥉", "4.", "5."];
                    return (
                      <div
                        key={prod.id || idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          backgroundColor: "var(--vegito-surface-muted, #f8faf7)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 800 }}>{medals[idx]}</span>
                          <div>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 800,
                                color: "var(--vegito-text-main, #12221e)",
                              }}
                            >
                              {prod.name || prod.product_name}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#62746a" }}>
                              {prod.units_sold != null || prod.orders_count != null
                                ? `${prod.units_sold ?? prod.orders_count} units sold`
                                : "Sales data unavailable"}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "13px", fontWeight: 900, color: "#064e3b" }}>
                            ₹{Number(prod.revenue || prod.price || 0).toFixed(0)}
                          </div>
                          <span style={{ fontSize: "11px", color: "#16a34a" }}>Top demand</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order Status Distribution Donut */}
            {statusDonutData.length > 0 && (
              <div
                style={{
                  backgroundColor: "var(--vegito-card, #ffffff)",
                  border: "1px solid var(--vegito-border, #e8eee9)",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "var(--vegito-text-main, #12221e)",
                  }}
                >
                  Live Order Status Mix
                </h4>
                <div style={{ height: "140px", width: "100%", position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDonutData}
                        innerRadius={44}
                        outerRadius={62}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusDonutData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "6px",
                    marginTop: "6px",
                    fontSize: "11.5px",
                  }}
                >
                  {statusDonutData.map((d) => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: d.color,
                        }}
                      />
                      <span style={{ color: "#62746a" }}>{d.name}:</span>
                      <b>{d.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            INLINE MODAL: QUICK RESTOCK DIALOG
            ═══════════════════════════════════════════════════════ */}
        {quickRestockItem && (
          <div className="seller-restock-dialog" onClick={() => setQuickRestockItem(null)}>
            <div className="seller-restock-panel" onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "17px",
                      fontWeight: 800,
                      color: "var(--vegito-text-main, #12221e)",
                    }}
                  >
                    Quick Restock Produce
                  </h3>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "12.5px",
                      color: "var(--vegito-text-muted, #62746a)",
                    }}
                  >
                    {quickRestockItem.product_name} · Current stock: {quickRestockItem.quantity}{" "}
                    {quickRestockItem.product_unit || "kg"}
                  </p>
                </div>
                <button
                  onClick={() => setQuickRestockItem(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#62746a",
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--vegito-text-muted, #62746a)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Quantity to Add ({quickRestockItem.product_unit || "kg"}):
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  {[5, 10, 25, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRestockQty(num)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border:
                          restockQty === num
                            ? "1.5px solid #064e3b"
                            : "1px solid var(--vegito-border, #e8eee9)",
                        backgroundColor:
                          restockQty === num ? "#064e3b" : "var(--vegito-card, #ffffff)",
                        color: restockQty === num ? "#ffffff" : "var(--vegito-text-main, #12221e)",
                        fontWeight: 700,
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      +{num} {quickRestockItem.product_unit || "kg"}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--vegito-border, #e8eee9)",
                    fontSize: "14px",
                    fontWeight: 700,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--vegito-text-muted, #62746a)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Restock Note / Harvest Source:
                </label>
                <input
                  type="text"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  placeholder="e.g. Fresh morning harvest from Solapur farms"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--vegito-border, #e8eee9)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setQuickRestockItem(null)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: "1px solid var(--vegito-border, #e8eee9)",
                    backgroundColor: "transparent",
                    color: "var(--vegito-text-muted, #62746a)",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={restockMutation.isPending || restockQty <= 0}
                  onClick={() =>
                    restockMutation.mutate({
                      sellerProductId: quickRestockItem.seller_product_id,
                      quantity: restockQty,
                      note: restockNote,
                    })
                  }
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "13.5px",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
                  }}
                >
                  {restockMutation.isPending ? "Restocking..." : `Confirm +${restockQty} ${quickRestockItem.product_unit || "kg"}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Product Multi-Step Modal */}
        <AddProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

        {/* Seller KYC Wizard Modal */}
        {isKycWizardOpen && (
          <SellerKycWizard
            onClose={() => setIsKycWizardOpen(false)}
            onSuccess={() => {
              setIsKycWizardOpen(false);
              queryClient.invalidateQueries({ queryKey: ["seller-kyc"] });
              queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
            }}
          />
        )}

        {/* Order Preparation Checklist Sheet */}
        <OrderPreparationSheet
          orderId={prepOrderId || 0}
          isOpen={Boolean(prepOrderId)}
          onClose={() => setPrepOrderId(null)}
        />
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .seller-dual-col-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardShell>
  );
}

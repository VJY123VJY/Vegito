"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Plus,
  RefreshCw,
  ShoppingCart,
  Truck,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Receipt,
  ListPlus,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Phone,
  Store,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  getBusinessProfile,
  updateBusinessProfile,
  getBulkCart,
  addToBulkCart,
  createBulkOrder,
  listBulkOrders,
  getBulkOrderDetail,
  handleQuoteAction,
  getB2BInvoice,
  listSavedLists,
  createSavedList,
  addSavedListToCart,
  listRecurringOrders,
  createRecurringOrder,
  toggleRecurringOrder,
  getEventGroceryEstimate,
  getB2BAnalytics,
  type BusinessProfile,
  type BulkCart,
  type BulkOrderSummary,
  type BulkOrderDetail,
  type SavedShoppingList,
  type RecurringBulkOrder,
  type EventGroceryEstimateResponse,
  type B2BAnalytics as B2BAnalyticsType,
  type B2BInvoice as B2BInvoiceType,
} from "@/lib/api/b2b";
import { fetchProducts, type Product } from "@/lib/api/products";
import { fetchAddresses, type Address } from "@/lib/api/addresses";

export function B2BDashboard() {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<"orders" | "create" | "saved" | "recurring" | "estimator" | "invoices">("orders");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Data states
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [analytics, setAnalytics] = useState<B2BAnalyticsType | null>(null);
  const [orders, setOrders] = useState<BulkOrderSummary[]>([]);
  const [savedLists, setSavedLists] = useState<SavedShoppingList[]>([]);
  const [recurringOrders, setRecurringOrders] = useState<RecurringBulkOrder[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Modals & Active Selections
  const [selectedOrder, setSelectedOrder] = useState<BulkOrderDetail | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<B2BInvoiceType | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<BusinessProfile>>({});

  // Create Bulk Order Form State
  const [selectedItems, setSelectedItems] = useState<Array<{ seller_product_id: number; product_name: string; quantity: number; unit: string; base_price: number }>>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState("06:00 AM – 08:00 AM");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Estimator Form State
  const [guestCount, setGuestCount] = useState(200);
  const [mealsPerDay, setMealsPerDay] = useState(2);
  const [daysCount, setDaysCount] = useState(1);
  const [eventType, setEventType] = useState("WEDDING_BANQUET");
  const [estimateResult, setEstimateResult] = useState<EventGroceryEstimateResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Load initial data
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profData, analData, ordersData, listsData, recData, productsData, addrData] = await Promise.all([
        getBusinessProfile().catch(() => null),
        getB2BAnalytics().catch(() => null),
        listBulkOrders().catch(() => []),
        listSavedLists().catch(() => []),
        listRecurringOrders().catch(() => []),
        fetchProducts({ pageSize: 40 }).catch(() => ({ items: [] })),
        fetchAddresses().catch(() => []),
      ]);

      setProfile(profData);
      setProfileForm(profData || {});
      setAnalytics(analData);
      setOrders(ordersData);
      setSavedLists(listsData);
      setRecurringOrders(recData);
      setCatalogProducts(productsData.items || []);
      setAddresses(addrData || []);

      if (addrData && addrData.length > 0) {
        const def = addrData.find((a: Address) => a.is_default) || addrData[0];
        setSelectedAddressId(def.id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load B2B dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateBusinessProfile(profileForm);
      setProfile(updated);
      setShowProfileModal(false);
      setActionSuccess("Business profile updated successfully!");
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert("Failed to save profile: " + (err?.response?.data?.message || err.message));
    }
  };

  // Add Item to Bulk Order Builder
  const handleAddItemToBuilder = (prod: Product) => {
    const sp = prod.seller_products && prod.seller_products.length > 0 ? prod.seller_products[0] : null;
    const seller_product_id = Number(sp?.seller_product_id ?? prod.id);
    const base_price = Number(sp?.price ?? prod.min_price ?? 30);

    const exists = selectedItems.find((i) => i.seller_product_id === seller_product_id);
    if (exists) {
      setSelectedItems(selectedItems.map((i) => (i.seller_product_id === seller_product_id ? { ...i, quantity: i.quantity + 10 } : i)));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          seller_product_id,
          product_name: prod.name,
          quantity: 20, // default commercial pack
          unit: prod.unit || "KG",
          base_price,
        },
      ]);
    }
  };

  // Submit Bulk Order Request
  const handleSubmitBulkOrder = async () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one produce item.");
      return;
    }
    if (!selectedAddressId) {
      alert("Please select a delivery address.");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const res = await createBulkOrder({
        items: selectedItems.map((it) => ({
          seller_product_id: it.seller_product_id,
          quantity: it.quantity,
          unit: it.unit,
        })),
        address_id: selectedAddressId,
        delivery_date: deliveryDate,
        delivery_time_window: deliveryTimeWindow,
        special_instructions: specialInstructions,
      });

      setActionSuccess(`Bulk Order #${res.order_number} submitted! Sellers in Solapur Mandi are preparing your quote.`);
      setSelectedItems([]);
      setActiveTab("orders");
      loadDashboardData();
    } catch (err: any) {
      alert("Failed to submit bulk order: " + (err?.response?.data?.message || err.message));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Quote Action (Accept / Reject)
  const handleQuote = async (orderId: number, action: "ACCEPT" | "REJECT") => {
    try {
      await handleQuoteAction(orderId, action);
      setActionSuccess(action === "ACCEPT" ? "Quote accepted! Order is now confirmed and reserved in Mandi inventory." : "Quote declined.");
      if (selectedOrder) {
        setSelectedOrder(null);
      }
      loadDashboardData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert("Quote action failed: " + (err?.response?.data?.message || err.message));
    }
  };

  // Run Event Grocery Estimator
  const handleRunEstimator = async () => {
    setIsEstimating(true);
    try {
      const res = await getEventGroceryEstimate({
        event_type: eventType,
        people_count: guestCount,
        meals_per_day: mealsPerDay,
        days_count: daysCount,
      });
      setEstimateResult(res);
    } catch (err: any) {
      alert("Estimation failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsEstimating(false);
    }
  };

  // Convert Estimate to Bulk Order Builder
  const handleLoadEstimateIntoBuilder = () => {
    if (!estimateResult) return;
    const newItems = estimateResult.suggested_items.map((it) => ({
      seller_product_id: it.product_id,
      product_name: it.product_name,
      quantity: Number(it.estimated_quantity),
      unit: it.unit,
      base_price: Number(it.approximate_price),
    }));
    setSelectedItems(newItems);
    setActiveTab("create");
    setActionSuccess("Estimated items populated into your Bulk Order Builder!");
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // View Invoice
  const handleOpenInvoice = async (orderId: number) => {
    try {
      const inv = await getB2BInvoice(orderId);
      setSelectedInvoice(inv);
    } catch (err: any) {
      alert("Invoice not yet generated or order not confirmed.");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px", minHeight: "85vh" }}>
      {/* Mode Selector Top Bar */}
      <div
        style={{
          background: "linear-gradient(135deg, #0a4d3c 0%, #16835b 100%)",
          borderRadius: 16,
          padding: "16px 24px",
          color: "#ffffff",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          boxShadow: "0 10px 30px rgba(10, 77, 60, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building2 size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.85 }}>
              Commercial Mandi Desk
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {profile?.business_name ? profile.business_name : "B2B Bulk & Commercial Ordering"}
            </div>
          </div>
        </div>

        {/* Home vs Business Mode Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.22)", padding: 4, borderRadius: 12 }}>
          <button
            onClick={() => router.push("/customer")}
            style={{
              border: "none",
              background: "transparent",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🏠 Home Retail
          </button>
          <button
            style={{
              border: "none",
              background: "#ffffff",
              color: "#0a4d3c",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "default",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            🏢 B2B Commercial
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "12px 18px",
            borderRadius: 12,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={20} color="#059669" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Business Profile Status Strip */}
      <div
        style={{
          background: "var(--vegito-card, #ffffff)",
          border: "1px solid var(--vegito-border, #e8eee9)",
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>Business Type: </span>
            <span style={{ fontWeight: 700, color: "var(--vegito-text-main, #12221e)" }}>
              {profile?.business_type || "Restaurant / Catering"}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>GSTIN: </span>
            <span style={{ fontWeight: 700, color: "var(--vegito-text-main, #12221e)" }}>
              {profile?.gstin || "Not Provided"}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>Solapur Slot: </span>
            <span style={{ fontWeight: 700, color: "var(--vegito-primary, #0a4d3c)" }}>
              {profile?.preferred_delivery_time || "06:00 AM – 08:00 AM"}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowProfileModal(true)}
          style={{
            background: "var(--vegito-surface-muted, #f0f4f1)",
            border: "1px solid var(--vegito-border, #e8eee9)",
            color: "var(--vegito-text-main, #12221e)",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ⚙️ Edit Business Info
        </button>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "var(--vegito-card, #ffffff)",
            border: "1px solid var(--vegito-border, #e8eee9)",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--vegito-text-muted, #62746a)", marginBottom: 6 }}>
            30-Day Bulk Spend
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--vegito-primary, #0a4d3c)" }}>
            ₹{analytics ? Number(analytics.monthly_spend).toLocaleString("en-IN") : "0"}
          </div>
          <div style={{ fontSize: 11, color: "var(--vegito-text-muted, #62746a)", marginTop: 4 }}>
            Wholesale mandi purchases
          </div>
        </div>

        <div
          style={{
            background: "var(--vegito-card, #ffffff)",
            border: "1px solid var(--vegito-border, #e8eee9)",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--vegito-text-muted, #62746a)", marginBottom: 6 }}>
            Active Bulk Orders
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--vegito-text-main, #12221e)" }}>
            {analytics ? analytics.active_orders_count : 0}
          </div>
          <div style={{ fontSize: 11, color: "var(--vegito-text-muted, #62746a)", marginTop: 4 }}>
            In preparation or dispatch
          </div>
        </div>

        <div
          style={{
            background: (analytics?.pending_quotes_count || 0) > 0 ? "#fffbeb" : "var(--vegito-card, #ffffff)",
            border: (analytics?.pending_quotes_count || 0) > 0 ? "1px solid #fef3c7" : "1px solid var(--vegito-border, #e8eee9)",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 13, color: (analytics?.pending_quotes_count || 0) > 0 ? "#92400e" : "var(--vegito-text-muted, #62746a)", marginBottom: 6 }}>
            Seller Quotes Waiting
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: (analytics?.pending_quotes_count || 0) > 0 ? "#b45309" : "var(--vegito-text-main, #12221e)" }}>
            {analytics ? analytics.pending_quotes_count : 0}
          </div>
          <div style={{ fontSize: 11, color: (analytics?.pending_quotes_count || 0) > 0 ? "#b45309" : "var(--vegito-text-muted, #62746a)", marginTop: 4 }}>
            Requires your review & acceptance
          </div>
        </div>

        <div
          style={{
            background: "var(--vegito-card, #ffffff)",
            border: "1px solid var(--vegito-border, #e8eee9)",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--vegito-text-muted, #62746a)", marginBottom: 6 }}>
            Average Bulk Order
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--vegito-text-main, #12221e)" }}>
            ₹{analytics ? Number(analytics.average_order_value).toLocaleString("en-IN") : "0"}
          </div>
          <div style={{ fontSize: 11, color: "var(--vegito-text-muted, #62746a)", marginTop: 4 }}>
            Purchase frequency: {analytics?.purchase_frequency || "Regular"}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--vegito-border, #e8eee9)",
          paddingBottom: 12,
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        {[
          { key: "orders", label: "📋 Orders & Quotes", badge: analytics?.pending_quotes_count ? `${analytics.pending_quotes_count} New` : null },
          { key: "create", label: "📦 Create Bulk Request" },
          { key: "saved", label: "📝 Commercial Lists" },
          { key: "recurring", label: "🔁 Scheduled Mandi Orders" },
          { key: "estimator", label: "🍽️ Catering & Event Estimator" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              background: activeTab === tab.key ? "var(--vegito-primary, #0a4d3c)" : "var(--vegito-surface-muted, #f0f4f1)",
              color: activeTab === tab.key ? "#ffffff" : "var(--vegito-text-main, #12221e)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
            {tab.badge && (
              <span
                style={{
                  background: "#e2724f",
                  color: "#ffffff",
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 6,
                  fontWeight: 700,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: ORDERS & QUOTES */}
      {activeTab === "orders" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Your Bulk Order History & Quotes</h3>
            <button
              onClick={() => setActiveTab("create")}
              style={{
                background: "var(--vegito-primary, #0a4d3c)",
                color: "#ffffff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={16} /> New Bulk Order
            </button>
          </div>

          {orders.length === 0 ? (
            <div
              style={{
                background: "var(--vegito-card, #ffffff)",
                borderRadius: 14,
                padding: "48px 24px",
                textAlign: "center",
                border: "1px dashed var(--vegito-border, #e8eee9)",
              }}
            >
              <Building2 size={40} color="var(--vegito-text-muted, #62746a)" style={{ margin: "0 auto 12px" }} />
              <h4 style={{ margin: "0 0 6px 0", fontSize: 16 }}>No bulk orders placed yet</h4>
              <p style={{ margin: "0 0 16px 0", color: "var(--vegito-text-muted, #62746a)", fontSize: 14 }}>
                Submit a bulk request to get wholesale quotes from registered Solapur Mandi farmers and distributors.
              </p>
              <button
                onClick={() => setActiveTab("create")}
                style={{
                  background: "var(--vegito-primary, #0a4d3c)",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Start First Bulk Request
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {orders.map((ord) => {
                const isQuotePending = ord.quote_status === "SENT";
                return (
                  <div
                    key={ord.id}
                    style={{
                      background: "var(--vegito-card, #ffffff)",
                      border: isQuotePending ? "2px solid #f59e0b" : "1px solid var(--vegito-border, #e8eee9)",
                      borderRadius: 14,
                      padding: 20,
                      boxShadow: isQuotePending ? "0 8px 24px rgba(245, 158, 11, 0.12)" : "var(--shadow-premium)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 16, fontWeight: 800 }}>#{ord.order_number}</span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: 6,
                              background:
                                ord.status === "CONFIRMED" || ord.status === "DELIVERED"
                                  ? "#ecfdf5"
                                  : ord.status === "QUOTE_SENT"
                                  ? "#fffbeb"
                                  : "#eff6ff",
                              color:
                                ord.status === "CONFIRMED" || ord.status === "DELIVERED"
                                  ? "#059669"
                                  : ord.status === "QUOTE_SENT"
                                  ? "#b45309"
                                  : "#2563eb",
                            }}
                          >
                            {ord.status.replace("_", " ")}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--vegito-text-muted, #62746a)", marginTop: 4 }}>
                          Seller: {ord.seller_business_name || "Solapur Mandi Producer"} · Delivery: {ord.requested_delivery_date || "Tomorrow"} ({ord.requested_delivery_window || "Morning Slot"})
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--vegito-primary, #0a4d3c)" }}>
                          ₹{ord.quote_total ? Number(ord.quote_total).toLocaleString("en-IN") : Number(ord.total_amount).toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>
                          {ord.items_count} produce items
                        </div>
                      </div>
                    </div>

                    {/* Pending Quote Callout */}
                    {isQuotePending && (
                      <div
                        style={{
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: 10,
                          padding: 14,
                          marginBottom: 14,
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: "#92400e", fontSize: 14 }}>
                            📋 Custom Mandi Quote Received: ₹{ord.quote_total}
                          </div>
                          <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
                            Delivery Fee: ₹{ord.quote_delivery_fee || "0"} · Valid until: {ord.quote_expires_at ? new Date(ord.quote_expires_at).toLocaleTimeString() : "24 hours"}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleQuote(ord.id, "ACCEPT")}
                            style={{
                              background: "#059669",
                              color: "#ffffff",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            ✓ Accept Quote
                          </button>
                          <button
                            onClick={() => handleQuote(ord.id, "REJECT")}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #dc2626",
                              color: "#dc2626",
                              padding: "8px 14px",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--vegito-border, #e8eee9)" }}>
                      <span style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>
                        Placed on {new Date(ord.created_at).toLocaleDateString()}
                      </span>
                      <div style={{ display: "flex", gap: 10 }}>
                        {(ord.status === "CONFIRMED" || ord.status === "DELIVERED") && (
                          <button
                            onClick={() => handleOpenInvoice(ord.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--vegito-primary, #0a4d3c)",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Receipt size={14} /> Tax Invoice
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            const detail = await getBulkOrderDetail(ord.id);
                            setSelectedOrder(detail);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--vegito-primary, #0a4d3c)",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          View Items & Timeline →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE BULK REQUEST */}
      {activeTab === "create" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
          {/* Produce Catalog Selection */}
          <div
            style={{
              background: "var(--vegito-card, #ffffff)",
              border: "1px solid var(--vegito-border, #e8eee9)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 800 }}>
              Select Fresh Produce for Bulk Delivery
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "var(--vegito-text-muted, #62746a)", fontSize: 14 }}>
              Tiered wholesale rates automatically apply for 20kg+, 50kg+, and 100kg+ orders directly from Solapur APMC.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {catalogProducts.map((p) => {
                const sp = p.seller_products && p.seller_products.length > 0 ? p.seller_products[0] : null;
                const price = sp ? sp.price : (p.min_price || 30);
                const isSelected = selectedItems.some((it) => it.seller_product_id === (sp?.seller_product_id || p.id));

                return (
                  <div
                    key={p.id}
                    style={{
                      border: isSelected ? "2px solid var(--vegito-primary, #0a4d3c)" : "1px solid var(--vegito-border, #e8eee9)",
                      borderRadius: 12,
                      padding: 14,
                      background: isSelected ? "#f0fdf4" : "var(--vegito-surface, #ffffff)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--vegito-text-main, #12221e)" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--vegito-text-muted, #62746a)", marginTop: 4 }}>
                        ₹{price}/{p.unit || "KG"} base mandi price
                      </div>
                      <div style={{ fontSize: 11, color: "#16835b", fontWeight: 600, marginTop: 4 }}>
                        🏷️ Volume tier: 50kg+ ~15% off
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddItemToBuilder(p)}
                      style={{
                        marginTop: 12,
                        background: isSelected ? "var(--vegito-primary, #0a4d3c)" : "var(--vegito-surface-muted, #f0f4f1)",
                        color: isSelected ? "#ffffff" : "var(--vegito-text-main, #12221e)",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {isSelected ? "✓ Add +10 KG" : "+ Add to Bulk Order"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bulk Order Summary & Submission Form */}
          <div
            style={{
              background: "var(--vegito-card, #ffffff)",
              border: "1px solid var(--vegito-border, #e8eee9)",
              borderRadius: 16,
              padding: 20,
              boxShadow: "var(--shadow-premium)",
              position: "sticky",
              top: 20,
            }}
          >
            <h4 style={{ margin: "0 0 16px 0", fontSize: 17, fontWeight: 800 }}>
              Bulk Order Requisition
            </h4>

            {selectedItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--vegito-text-muted, #62746a)" }}>
                No items added yet. Click &apos;+ Add&apos; on any vegetable above to start assembling your bulk delivery.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {selectedItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--vegito-surface-muted, #f0f4f1)",
                      padding: "8px 12px",
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{item.product_name}</div>
                      <div style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>
                        ~₹{item.base_price}/{item.unit}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          setSelectedItems(selectedItems.map((it, i) => (i === idx ? { ...it, quantity: val } : it)));
                        }}
                        style={{
                          width: 65,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--vegito-border, #e8eee9)",
                          fontSize: 14,
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{item.unit}</span>
                      <button
                        onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    borderTop: "1px solid var(--vegito-border, #e8eee9)",
                    paddingTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  <span>Est. Subtotal:</span>
                  <span>
                    ₹
                    {selectedItems
                      .reduce((acc, curr) => acc + curr.quantity * curr.base_price, 0)
                      .toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}

            {/* Delivery Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--vegito-border, #e8eee9)", paddingTop: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--vegito-text-main, #12221e)" }}>
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--vegito-border, #e8eee9)",
                    marginTop: 4,
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--vegito-text-main, #12221e)" }}>
                  Delivery Time Window (Solapur Early Morning)
                </label>
                <select
                  value={deliveryTimeWindow}
                  onChange={(e) => setDeliveryTimeWindow(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--vegito-border, #e8eee9)",
                    marginTop: 4,
                    fontSize: 13,
                  }}
                >
                  <option value="05:00 AM – 07:00 AM">05:00 AM – 07:00 AM (Kitchen Prep Slot)</option>
                  <option value="06:00 AM – 08:00 AM">06:00 AM – 08:00 AM (Standard Mandi Slot)</option>
                  <option value="08:00 AM – 10:00 AM">08:00 AM – 10:00 AM (Morning Delivery)</option>
                  <option value="04:00 PM – 06:00 PM">04:00 PM – 06:00 PM (Evening Dinner Slot)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--vegito-text-main, #12221e)" }}>
                  Destination Address
                </label>
                <select
                  value={selectedAddressId || ""}
                  onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--vegito-border, #e8eee9)",
                    marginTop: 4,
                    fontSize: 13,
                  }}
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.address_line1}, {a.city} ({a.landmark || "Solapur"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--vegito-text-main, #12221e)" }}>
                  Special Quality / Delivery Instructions
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g., Sorted Grade-A large potatoes for fries, delivery at rear service entrance."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--vegito-border, #e8eee9)",
                    marginTop: 4,
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <button
                onClick={handleSubmitBulkOrder}
                disabled={isSubmittingOrder || selectedItems.length === 0}
                style={{
                  background: "var(--vegito-primary, #0a4d3c)",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: isSubmittingOrder || selectedItems.length === 0 ? "not-allowed" : "pointer",
                  opacity: isSubmittingOrder || selectedItems.length === 0 ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {isSubmittingOrder ? "Submitting Request..." : "Request Wholesale Mandi Quote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SAVED COMMERCIAL LISTS */}
      {activeTab === "saved" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 800 }}>Saved Commercial Pantry Lists</h3>
              <p style={{ margin: 0, color: "var(--vegito-text-muted, #62746a)", fontSize: 14 }}>
                Speed up kitchen procurement with 1-click reordering for daily and weekly menus.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {savedLists.map((list) => (
              <div
                key={list.id}
                style={{
                  background: "var(--vegito-card, #ffffff)",
                  border: "1px solid var(--vegito-border, #e8eee9)",
                  borderRadius: 14,
                  padding: 20,
                  boxShadow: "var(--shadow-premium)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{list.name}</h4>
                  <span style={{ fontSize: 12, background: "var(--vegito-surface-muted, #f0f4f1)", padding: "2px 8px", borderRadius: 6 }}>
                    {list.item_count} items
                  </span>
                </div>
                {list.description && (
                  <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "var(--vegito-text-muted, #62746a)" }}>
                    {list.description}
                  </p>
                )}

                <div style={{ marginBottom: 16, maxHeight: 120, overflowY: "auto" }}>
                  {list.items.map((it) => (
                    <div key={it.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span>{it.product_name}</span>
                      <span style={{ fontWeight: 600 }}>{it.quantity} {it.unit}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    const count = await addSavedListToCart(list.id);
                    setActionSuccess(`Added ${count} items from '${list.name}' to your bulk requisition!`);
                    setActiveTab("create");
                  }}
                  style={{
                    width: "100%",
                    background: "var(--vegito-surface-muted, #f0f4f1)",
                    border: "1px solid var(--vegito-border, #e8eee9)",
                    color: "var(--vegito-primary, #0a4d3c)",
                    padding: "10px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <ShoppingCart size={15} /> 1-Click Load into Bulk Order
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RECURRING ORDERS */}
      {activeTab === "recurring" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 800 }}>Automated Standing Orders</h3>
              <p style={{ margin: 0, color: "var(--vegito-text-muted, #62746a)", fontSize: 14 }}>
                Direct morning dispatch schedules to keep restaurant & hotel kitchens fully supplied.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recurringOrders.map((rec) => (
              <div
                key={rec.id}
                style={{
                  background: "var(--vegito-card, #ffffff)",
                  border: "1px solid var(--vegito-border, #e8eee9)",
                  borderRadius: 14,
                  padding: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{rec.title}</h4>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: rec.is_active ? "#ecfdf5" : "#f3f4f6",
                        color: rec.is_active ? "#059669" : "#6b7280",
                      }}
                    >
                      {rec.is_active ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--vegito-text-muted, #62746a)", marginTop: 4 }}>
                    Frequency: <b>{rec.frequency}</b> · Next Run: <b>{rec.next_run_date}</b> ({rec.delivery_time_window})
                  </div>
                  <div style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)", marginTop: 2 }}>
                    {rec.items.length} produce varieties assigned
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={async () => {
                      await toggleRecurringOrder(rec.id);
                      loadDashboardData();
                    }}
                    style={{
                      background: rec.is_active ? "#fee2e2" : "#ecfdf5",
                      color: rec.is_active ? "#dc2626" : "#059669",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {rec.is_active ? "Pause Schedule" : "Resume Schedule"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CATERING & EVENT GROCERY ESTIMATOR */}
      {activeTab === "estimator" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Input Controls */}
          <div
            style={{
              background: "var(--vegito-card, #ffffff)",
              border: "1px solid var(--vegito-border, #e8eee9)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Sparkles size={20} color="#e2724f" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Catering Requirements Calculator</h3>
            </div>
            <p style={{ margin: "0 0 20px 0", color: "var(--vegito-text-muted, #62746a)", fontSize: 14 }}>
              Calculates exact wholesale kg based on authentic Indian catering metrics and live Solapur Mandi rates.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700 }}>Event / Gathering Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--vegito-border, #e8eee9)",
                    marginTop: 4,
                  }}
                >
                  <option value="WEDDING_BANQUET">Wedding Banquet (Lagan Karyakram)</option>
                  <option value="CORPORATE_CONFERENCE">Corporate Conference / Seminar</option>
                  <option value="HOSTEL_MESS">Hostel Mess / Institutional Canteen</option>
                  <option value="PARTY_CATERING">Birthday / Anniversary Gathering</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700 }}>Guest / People Count</label>
                <input
                  type="number"
                  min="20"
                  max="10000"
                  step="10"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--vegito-border, #e8eee9)",
                    marginTop: 4,
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>Meals per Day</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={mealsPerDay}
                    onChange={(e) => setMealsPerDay(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--vegito-border, #e8eee9)",
                      marginTop: 4,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>Days Count</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={daysCount}
                    onChange={(e) => setDaysCount(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--vegito-border, #e8eee9)",
                      marginTop: 4,
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleRunEstimator}
                disabled={isEstimating}
                style={{
                  background: "var(--vegito-primary, #0a4d3c)",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  marginTop: 10,
                }}
              >
                {isEstimating ? "Calculating Mandi Metrics..." : "⚡ Estimate Wholesale Groceries"}
              </button>
            </div>
          </div>

          {/* Results View */}
          <div
            style={{
              background: "var(--vegito-card, #ffffff)",
              border: "1px solid var(--vegito-border, #e8eee9)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", fontSize: 17, fontWeight: 800 }}>
              Estimated Catering Requirements
            </h4>

            {!estimateResult ? (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--vegito-text-muted, #62746a)" }}>
                Click &apos;Estimate Wholesale Groceries&apos; to view required kg per vegetable and total estimated mandi budget.
              </div>
            ) : (
              <div>
                <div
                  style={{
                    background: "var(--vegito-surface-muted, #f0f4f1)",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>
                      Total Estimated Budget ({estimateResult.people_count} People)
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--vegito-primary, #0a4d3c)" }}>
                      ₹{Number(estimateResult.total_estimated_budget).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <button
                    onClick={handleLoadEstimateIntoBuilder}
                    style={{
                      background: "var(--vegito-primary, #0a4d3c)",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Load into Bulk Builder →
                  </button>
                </div>

                <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  {estimateResult.suggested_items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--vegito-border, #e8eee9)",
                        fontSize: 13,
                      }}
                    >
                      <div>
                        <b>{it.product_name}</b> ({it.category})
                      </div>
                      <div style={{ fontWeight: 700, color: "var(--vegito-primary, #0a4d3c)" }}>
                        {it.estimated_quantity} {it.unit} (~₹{it.approximate_price}/{it.unit})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL: Bulk Order Details */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "var(--vegito-card, #ffffff)",
              borderRadius: 18,
              maxWidth: 620,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  Order #{selectedOrder.order_number}
                </h3>
                <span style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>
                  Status: {selectedOrder.status} · Quote: {selectedOrder.quote_status || "Standard"}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Produce Items</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedOrder.items.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      background: "var(--vegito-surface-muted, #f0f4f1)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                    }}
                  >
                    <span>
                      <b>{it.product_name}</b> ({it.quantity} {it.unit})
                    </span>
                    <span>₹{it.quoted_subtotal || it.subtotal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--vegito-border, #e8eee9)",
                paddingTop: 12,
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              <span>Total Payable:</span>
              <span style={{ color: "var(--vegito-primary, #0a4d3c)" }}>
                ₹{selectedOrder.quote_total || selectedOrder.total_amount}
              </span>
            </div>

            {selectedOrder.status === "QUOTE_SENT" && (
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => handleQuote(selectedOrder.id, "ACCEPT")}
                  style={{
                    flex: 1,
                    background: "#059669",
                    color: "#ffffff",
                    border: "none",
                    padding: "12px",
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✓ Accept Mandi Quote
                </button>
                <button
                  onClick={() => handleQuote(selectedOrder.id, "REJECT")}
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "none",
                    padding: "12px 18px",
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL: B2B GST Tax Invoice */}
      {selectedInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: 580,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#16835b" }}>VEGITO COMMERCIAL TAX INVOICE</div>
                <h3 style={{ margin: "4px 0 0 0", fontSize: 20, fontWeight: 800 }}>{selectedInvoice.invoice_number}</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <b>Billed To:</b>
                <div>{selectedInvoice.business_name}</div>
                <div>GSTIN: {selectedInvoice.gstin || "N/A"}</div>
                <div>{selectedInvoice.business_address}</div>
              </div>
              <div>
                <b>Seller / Supplier:</b>
                <div>{selectedInvoice.seller_name}</div>
                <div>Solapur APMC Mandi, MH</div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                <span>Subtotal:</span>
                <span>₹{selectedInvoice.subtotal}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                <span>Delivery & Freight:</span>
                <span>₹{selectedInvoice.delivery_fee}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
                <span>Total Amount:</span>
                <span style={{ color: "#0a4d3c" }}>₹{selectedInvoice.total_amount}</span>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              style={{
                width: "100%",
                background: "#0a4d3c",
                color: "#ffffff",
                border: "none",
                padding: "10px",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showProfileModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <form
            onSubmit={handleSaveProfile}
            style={{
              background: "var(--vegito-card, #ffffff)",
              borderRadius: 16,
              maxWidth: 500,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Business Profile Setup</h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Business / Establishment Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.business_name || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Business Type</label>
                <select
                  value={profileForm.business_type || "RESTAURANT"}
                  onChange={(e) => setProfileForm({ ...profileForm, business_type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", marginTop: 4 }}
                >
                  <option value="RESTAURANT">Restaurant / Dhaba</option>
                  <option value="HOTEL">Hotel / Resort</option>
                  <option value="CATERER">Catering Service</option>
                  <option value="HOSTEL_MESS">Hostel / College Mess</option>
                  <option value="GROCERY_STORE">Kirana / Retail Reseller</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>GSTIN (Optional)</label>
                <input
                  type="text"
                  value={profileForm.gstin || ""}
                  placeholder="27AAAAA0000A1Z5"
                  onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Contact Person</label>
                <input
                  type="text"
                  value={profileForm.contact_person || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, contact_person: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Phone Number</label>
                <input
                  type="text"
                  value={profileForm.phone || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", marginTop: 4 }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: "var(--vegito-primary, #0a4d3c)",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  marginTop: 10,
                }}
              >
                Save Business Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

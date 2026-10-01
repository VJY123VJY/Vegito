"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Send,
  Eye,
  Layers,
  Phone,
  MapPin,
  Tag,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import {
  listSellerBulkOrders,
  getSellerBulkOrderDetail,
  acceptSellerBulkOrder,
  sendSellerQuote,
  rejectSellerBulkOrder,
  type BulkOrderSummary,
  type BulkOrderDetail,
} from "@/lib/api/b2b";

export function SellerBulkOrders() {
  const [orders, setOrders] = useState<BulkOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<BulkOrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Quote Modal State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteItems, setQuoteItems] = useState<Array<{ order_item_id: number; product_name: string; quantity: number; unit: string; quoted_unit_price: number; seller_notes: string }>>([]);
  const [quoteDeliveryFee, setQuoteDeliveryFee] = useState<number>(100);
  const [quoteNotes, setQuoteNotes] = useState<string>("Grade-A harvest fresh from Solapur APMC yard.");
  const [quoteExpiryHours, setQuoteExpiryHours] = useState<number>(24);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Notification Banner
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus === "ALL" ? undefined : filterStatus;
      const data = await listSellerBulkOrders(statusParam);
      setOrders(data);
    } catch (err: any) {
      console.error("Failed to load seller bulk orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filterStatus]);

  // Open Detailed Order
  const handleOpenDetail = async (orderId: number) => {
    setLoadingDetail(true);
    try {
      const detail = await getSellerBulkOrderDetail(orderId);
      setSelectedOrder(detail);
    } catch (err: any) {
      alert("Failed to load order details: " + (err?.response?.data?.message || err.message));
    } finally {
      setLoadingDetail(false);
    }
  };

  // Accept at Standard Price
  const handleAcceptStandard = async (orderId: number) => {
    if (!confirm("Accept this bulk order at standard rates? This will atomically reserve inventory.")) {
      return;
    }
    try {
      const res = await acceptSellerBulkOrder(orderId);
      setActionSuccess(`Bulk order accepted! Status is now CONFIRMED and stock is reserved.`);
      if (selectedOrder) {
        setSelectedOrder(null);
      }
      loadOrders();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert("Failed to accept order: " + (err?.response?.data?.message || err.message));
    }
  };

  // Open Custom Quote Modal
  const handlePrepareQuote = async (orderId: number) => {
    try {
      const detail = await getSellerBulkOrderDetail(orderId);
      setSelectedOrder(detail);
      setQuoteItems(
        detail.items.map((it) => ({
          order_item_id: it.id,
          product_name: it.product_name,
          quantity: Number(it.quantity),
          unit: it.unit,
          quoted_unit_price: Number(it.unit_price) * 0.95, // default 5% bulk discount
          seller_notes: "",
        }))
      );
      setShowQuoteModal(true);
    } catch (err: any) {
      alert("Failed to prepare quote: " + (err?.response?.data?.message || err.message));
    }
  };

  // Submit Custom Quote
  const handleSubmitQuote = async () => {
    if (!selectedOrder) return;
    setIsSubmittingQuote(true);
    try {
      await sendSellerQuote(selectedOrder.id, {
        items: quoteItems.map((q) => ({
          order_item_id: q.order_item_id,
          quoted_unit_price: q.quoted_unit_price,
          seller_notes: q.seller_notes,
        })),
        delivery_fee: quoteDeliveryFee,
        notes: quoteNotes,
        expires_in_hours: quoteExpiryHours,
      });

      setActionSuccess(`Custom quote submitted to ${selectedOrder.business?.business_name || "customer"}!`);
      setShowQuoteModal(false);
      setSelectedOrder(null);
      loadOrders();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert("Failed to send quote: " + (err?.response?.data?.message || err.message));
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Decline Bulk Order
  const handleConfirmReject = async () => {
    if (!selectedOrder) return;
    setIsSubmittingReject(true);
    try {
      await rejectSellerBulkOrder(selectedOrder.id, rejectReason);
      setActionSuccess("Bulk order request declined.");
      setShowRejectModal(false);
      setSelectedOrder(null);
      loadOrders();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert("Failed to decline order: " + (err?.response?.data?.message || err.message));
    } finally {
      setIsSubmittingReject(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #12221e 0%, #0a4d3c 100%)",
          borderRadius: 16,
          padding: "20px 24px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
          boxShadow: "0 10px 30px rgba(10, 77, 60, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building2 size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.85 }}>
              Solapur Mandi Wholesale Desk
            </div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>B2B Restaurant & Hotel Orders</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => loadOrders()}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔄 Refresh Desk
          </button>
        </div>
      </div>

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

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--vegito-border, #e8eee9)",
          paddingBottom: 12,
          marginBottom: 20,
          overflowX: "auto",
        }}
      >
        {[
          { key: "ALL", label: "All Orders" },
          { key: "BULK_REQUESTED", label: "⚡ New Requests" },
          { key: "QUOTE_SENT", label: "📋 Quotes Sent" },
          { key: "CONFIRMED", label: "✓ Confirmed & Reserved" },
          { key: "DELIVERED", label: "🚚 Fulfilled" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: filterStatus === tab.key ? 700 : 500,
              background: filterStatus === tab.key ? "var(--vegito-primary, #0a4d3c)" : "var(--vegito-surface-muted, #f0f4f1)",
              color: filterStatus === tab.key ? "#ffffff" : "var(--vegito-text-main, #12221e)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk Order Cards List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--vegito-text-muted, #62746a)" }}>
          Loading wholesale requests...
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            background: "var(--vegito-card, #ffffff)",
            borderRadius: 14,
            padding: "48px 20px",
            textAlign: "center",
            border: "1px dashed var(--vegito-border, #e8eee9)",
          }}
        >
          <Building2 size={36} color="var(--vegito-text-muted, #62746a)" style={{ margin: "0 auto 12px" }} />
          <h4 style={{ margin: "0 0 6px 0", fontSize: 16 }}>No bulk orders in this queue</h4>
          <p style={{ margin: 0, fontSize: 14, color: "var(--vegito-text-muted, #62746a)" }}>
            New bulk requests from commercial buyers in Solapur will appear here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {orders.map((ord) => {
            const isNewRequest = ord.status === "BULK_REQUESTED";
            const isQuoteSent = ord.status === "QUOTE_SENT";

            return (
              <div
                key={ord.id}
                style={{
                  background: "var(--vegito-card, #ffffff)",
                  border: isNewRequest ? "2px solid #3b82f6" : "1px solid var(--vegito-border, #e8eee9)",
                  borderRadius: 14,
                  padding: 20,
                  boxShadow: "var(--shadow-premium)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>#{ord.order_number}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background:
                            ord.status === "CONFIRMED"
                              ? "#ecfdf5"
                              : ord.status === "QUOTE_SENT"
                              ? "#fffbeb"
                              : "#eff6ff",
                          color:
                            ord.status === "CONFIRMED"
                              ? "#059669"
                              : ord.status === "QUOTE_SENT"
                              ? "#b45309"
                              : "#2563eb",
                        }}
                      >
                        {ord.status.replace("_", " ")}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                      🏢 {ord.business_name || "Commercial Buyer"} ({ord.business_type || "Restaurant"})
                    </div>
                    <div style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)", marginTop: 2 }}>
                      📍 {ord.delivery_address || "Solapur"} · ⏰ Slot: {ord.requested_delivery_window || "Morning"} ({ord.requested_delivery_date})
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--vegito-primary, #0a4d3c)" }}>
                      ₹{ord.quote_total || ord.total_amount}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>
                      {ord.items_count} produce varieties
                    </div>
                  </div>
                </div>

                {/* Items preview */}
                {ord.items_summary && (
                  <div
                    style={{
                      background: "var(--vegito-surface-muted, #f0f4f1)",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 14,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    {ord.items_summary.map((it, idx) => (
                      <span key={idx} style={{ fontSize: 13, background: "#ffffff", padding: "4px 10px", borderRadius: 6, border: "1px solid var(--vegito-border, #e8eee9)" }}>
                        <b>{it.product_name}</b>: {it.quantity} {it.unit}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 10, borderTop: "1px solid var(--vegito-border, #e8eee9)" }}>
                  <button
                    onClick={() => handleOpenDetail(ord.id)}
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
                    🔍 Inspect Live Stock & Requisition
                  </button>

                  <div style={{ display: "flex", gap: 8 }}>
                    {isNewRequest && (
                      <>
                        <button
                          onClick={() => handleAcceptStandard(ord.id)}
                          style={{
                            background: "#059669",
                            color: "#ffffff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✓ Accept Standard Price
                        </button>
                        <button
                          onClick={() => handlePrepareQuote(ord.id)}
                          style={{
                            background: "var(--vegito-primary, #0a4d3c)",
                            color: "#ffffff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Tag size={14} /> Send Custom Quote
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder({ id: ord.id } as any);
                            setShowRejectModal(true);
                          }}
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {isQuoteSent && (
                      <span style={{ fontSize: 13, color: "#b45309", fontWeight: 600 }}>
                        ⏳ Quote sent (₹{ord.quote_total}). Waiting for customer confirmation.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL with Live Inventory Stock Auditor */}
      {selectedOrder && !showQuoteModal && !showRejectModal && (
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
              maxWidth: 680,
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
                  {selectedOrder.business?.business_name} ({selectedOrder.business?.business_type}) · {selectedOrder.business?.phone}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Warehouse Stock Auditor */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={16} /> Live Mandi Stock Audit
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedOrder.items.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      background: it.is_sufficient_stock ? "var(--vegito-surface-muted, #f0f4f1)" : "#fef2f2",
                      border: it.is_sufficient_stock ? "1px solid var(--vegito-border, #e8eee9)" : "1px solid #fecaca",
                      padding: "10px 14px",
                      borderRadius: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{it.product_name}</div>
                      <div style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>
                        Requested: <b>{it.quantity} {it.unit}</b> @ ₹{it.unit_price}/{it.unit}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: it.is_sufficient_stock ? "#059669" : "#dc2626",
                        }}
                      >
                        {it.is_sufficient_stock ? `✓ In Stock (${it.available_stock} ${it.unit} avail)` : `⚠️ Insufficient (${it.available_stock} ${it.unit} avail)`}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                        Subtotal: ₹{it.subtotal}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrder.status === "BULK_REQUESTED" && (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => handleAcceptStandard(selectedOrder.id)}
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
                  ✓ Accept Standard Price
                </button>
                <button
                  onClick={() => handlePrepareQuote(selectedOrder.id)}
                  style={{
                    flex: 1,
                    background: "var(--vegito-primary, #0a4d3c)",
                    color: "#ffffff",
                    border: "none",
                    padding: "12px",
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  🏷️ Send Custom Quote
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM QUOTE BUILDER MODAL */}
      {showQuoteModal && selectedOrder && (
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
              maxWidth: 600,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Custom Wholesale Quote #{selectedOrder.order_number}
              </h3>
              <button
                onClick={() => setShowQuoteModal(false)}
                style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {quoteItems.map((item, idx) => (
                <div
                  key={item.order_item_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--vegito-surface-muted, #f0f4f1)",
                    padding: "10px 14px",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.product_name}</div>
                    <div style={{ fontSize: 12, color: "var(--vegito-text-muted, #62746a)" }}>
                      {item.quantity} {item.unit} requested
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>Quoted ₹:</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quoted_unit_price}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 1;
                        setQuoteItems(quoteItems.map((q, i) => (i === idx ? { ...q, quoted_unit_price: val } : q)));
                      }}
                      style={{
                        width: 75,
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--vegito-border, #e8eee9)",
                        fontSize: 14,
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                    />
                    <span style={{ fontSize: 12 }}>/{item.unit}</span>
                  </div>
                </div>
              ))}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Freight / Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={quoteDeliveryFee}
                    onChange={(e) => setQuoteDeliveryFee(Number(e.target.value) || 0)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Quote Expiry (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={quoteExpiryHours}
                    onChange={(e) => setQuoteExpiryHours(Number(e.target.value) || 24)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", marginTop: 4 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Seller Notes for Buyer</label>
                <input
                  type="text"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", marginTop: 4 }}
                />
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
                <span>Total Quoted to Buyer:</span>
                <span style={{ color: "var(--vegito-primary, #0a4d3c)" }}>
                  ₹
                  {(
                    quoteItems.reduce((acc, q) => acc + q.quantity * q.quoted_unit_price, 0) +
                    quoteDeliveryFee
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmitQuote}
              disabled={isSubmittingQuote}
              style={{
                width: "100%",
                background: "var(--vegito-primary, #0a4d3c)",
                color: "#ffffff",
                border: "none",
                padding: "12px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 800,
                cursor: isSubmittingQuote ? "not-allowed" : "pointer",
              }}
            >
              {isSubmittingQuote ? "Submitting..." : "Send Custom Quote to Customer"}
            </button>
          </div>
        </div>
      )}

      {/* DECLINE MODAL */}
      {showRejectModal && selectedOrder && (
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
              borderRadius: 16,
              maxWidth: 450,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: 17, fontWeight: 800 }}>Decline Bulk Order Request</h3>
            <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "var(--vegito-text-muted, #62746a)" }}>
              Provide a reason to inform the customer why this request cannot be fulfilled.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Insufficient mandi harvest available for requested delivery date."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", marginBottom: 16, fontFamily: "inherit" }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--vegito-border, #e8eee9)", background: "transparent", cursor: "pointer", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmittingReject}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#dc2626", color: "#ffffff", cursor: "pointer", fontWeight: 700 }}
              >
                {isSubmittingReject ? "Declining..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

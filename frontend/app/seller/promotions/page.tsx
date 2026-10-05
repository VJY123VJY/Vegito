"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  Plus,
  Play,
  Pause,
  Trash2,
  Package,
  Layers,
  Sparkles,
  Percent,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  Calendar,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import {
  listSellerPromotions,
  createPromotion,
  updatePromotionStatus,
  deletePromotion,
  Promotion,
} from "@/lib/api/promotions";
import { listSellerProducts, SellerProduct } from "@/lib/api/seller-products";
import { getErrorMessage } from "@/lib/api/client";

export default function SellerPromotionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [promoType, setPromoType] = useState<"BUNDLE" | "DISCOUNT" | "CLEARANCE">("BUNDLE");
  const [offerPrice, setOfferPrice] = useState("");
  const [periodDays, setPeriodDays] = useState("30");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");

  // Queries
  const { data: promotions = [], isLoading: isLoadingPromos } = useQuery({
    queryKey: ["seller-promotions"],
    queryFn: listSellerPromotions,
  });

  const { data: sellerProducts = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["seller-products"],
    queryFn: listSellerProducts,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createPromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-promotions"] });
      setFeedback({ type: "success", msg: "Promotion published successfully!" });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) || "Failed to create promotion" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updatePromotionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-promotions"] });
      setFeedback({ type: "success", msg: "Promotion status updated" });
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) || "Failed to update status" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-promotions"] });
      setFeedback({ type: "success", msg: "Promotion deleted" });
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) || "Failed to delete promotion" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPromoType("BUNDLE");
    setOfferPrice("");
    setPeriodDays("30");
    setSelectedProductId(null);
    setQuantity("1");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setFeedback({ type: "error", msg: "Please select at least one produce item." });
      return;
    }
    const priceNum = parseFloat(offerPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFeedback({ type: "error", msg: "Please enter a valid offer price." });
      return;
    }

    createMutation.mutate({
      title,
      description: description || undefined,
      type: promoType,
      price: priceNum,
      period_days: parseInt(periodDays, 10) || 30,
      status: "ACTIVE",
      items: [
        {
          seller_product_id: selectedProductId,
          quantity: parseFloat(quantity) || 1,
        },
      ],
    });
  };

  const selectedProduct = sellerProducts.find((p) => p.id === selectedProductId);

  return (
    <RoleGuard allow={["SELLER"]}>
      <DashboardShell
        role="seller"
        greeting="Promotions & Deals"
        subtitle="Manage discounts, bundle offers, and clearance pricing"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 0" }}>
          {/* Action Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#063c32", margin: 0 }}>
                Offers & Promotions
              </h1>
              <p style={{ color: "#6b7280", margin: "4px 0 0 0", fontSize: "14px" }}>
                Active offers are visible to all customers on the Home Carousel and Deals page.
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
              }}
            >
              <Plus size={18} />
              Create Promotion
            </button>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "12px",
                marginBottom: "20px",
                backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: feedback.type === "success" ? "#065f46" : "#991b1b",
                border: `1px solid ${feedback.type === "success" ? "#a7f3d0" : "#fecaca"}`,
              }}
            >
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span style={{ fontSize: "14px", fontWeight: 600 }}>{feedback.msg}</span>
              <button
                onClick={() => setFeedback(null)}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                }}
              >
                <Tag size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Total Promotions</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                  {promotions.length}
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563eb",
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Active Offers</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                  {promotions.filter((p) => p.status === "ACTIVE").length}
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#fff7ed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ea580c",
                }}
              >
                <Percent size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Discounted Produce</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                  {promotions.reduce((acc, p) => acc + (p.items?.length || 0), 0)} items
                </div>
              </div>
            </div>
          </div>

          {/* Promotions Table */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
          >
            {isLoadingPromos ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#6b7280" }}>
                Loading promotions...
              </div>
            ) : promotions.length === 0 ? (
              <div style={{ padding: "64px 20px", textAlign: "center" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                    color: "#9ca3af",
                  }}
                >
                  <Tag size={28} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: "0 0 6px 0" }}>
                  No promotions created yet
                </h3>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 16px 0" }}>
                  Boost your sales by offering deals and discounted combos to customers.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Create Your First Offer
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        OFFER / TITLE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        TYPE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        INCLUDED PRODUCE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        ORIGINAL VALUE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        OFFER PRICE
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        STATUS
                      </th>
                      <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "#4b5563", textAlign: "right" }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map((promo) => {
                      const isActive = promo.status === "ACTIVE";
                      const discountPct = promo.discount_percent ?? (
                        promo.original_price && promo.original_price > promo.price
                          ? Math.round(((Number(promo.original_price) - Number(promo.price)) / Number(promo.original_price)) * 100)
                          : 0
                      );

                      return (
                        <tr
                          key={promo.id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                            transition: "background 0.15s",
                          }}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 700, color: "#111827", fontSize: "14px" }}>
                              {promo.title}
                            </div>
                            {promo.description && (
                              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                                {promo.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                backgroundColor:
                                  promo.type === "BUNDLE"
                                    ? "#eff6ff"
                                    : promo.type === "CLEARANCE"
                                    ? "#fef2f2"
                                    : "#ecfdf5",
                                color:
                                  promo.type === "BUNDLE"
                                    ? "#1e40af"
                                    : promo.type === "CLEARANCE"
                                    ? "#991b1b"
                                    : "#065f46",
                              }}
                            >
                              {promo.type}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: "13px", color: "#374151" }}>
                            {promo.items && promo.items.length > 0 ? (
                              promo.items.map((it, idx) => (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <span>• {it.product_name || `Product #${it.seller_product_id}`}</span>
                                  <span style={{ color: "#9ca3af", fontSize: "11px" }}>
                                    ({it.quantity} {it.unit || "kg"})
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: "13px", color: "#6b7280" }}>
                            {promo.original_price ? (
                              <span style={{ textDecoration: "line-through" }}>
                                ₹{Number(promo.original_price).toFixed(2)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontWeight: 800, color: "#059669", fontSize: "15px" }}>
                              ₹{Number(promo.price).toFixed(2)}
                            </span>
                            {discountPct > 0 && (
                              <span
                                style={{
                                  marginLeft: "6px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#dc2626",
                                  backgroundColor: "#fee2e2",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                {discountPct}% OFF
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                backgroundColor: isActive ? "#ecfdf5" : "#f3f4f6",
                                color: isActive ? "#065f46" : "#6b7280",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: isActive ? "#10b981" : "#9ca3af",
                                }}
                              />
                              {promo.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: promo.id,
                                    status: isActive ? "PAUSED" : "ACTIVE",
                                  })
                                }
                                title={isActive ? "Pause offer" : "Activate offer"}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  border: "1px solid #e5e7eb",
                                  background: "#ffffff",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: isActive ? "#ea580c" : "#059669",
                                }}
                              >
                                {isActive ? <Pause size={14} /> : <Play size={14} />}
                                {isActive ? "Pause" : "Resume"}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${promo.title}"?`)) {
                                    deleteMutation.mutate(promo.id);
                                  }
                                }}
                                title="Delete offer"
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: "8px",
                                  border: "1px solid #fee2e2",
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Create Promotion */}
        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                padding: "24px",
                width: "100%",
                maxWidth: "520px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: 0 }}>
                  Create New Offer / Combo
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Title */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Offer Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh Salad Veggie Combo / Weekend Special Tomato"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Crisp garden produce sorted fresh this morning"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Type Selection */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Promotion Type
                  </label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value as any)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="BUNDLE">BUNDLE (Value Pack / Combo)</option>
                    <option value="DISCOUNT">DISCOUNT (Price Drop / Deal)</option>
                    <option value="CLEARANCE">CLEARANCE (Fresh Stock Clearance)</option>
                  </select>
                </div>

                {/* Product Selection */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Select Produce Item *
                  </label>
                  <select
                    required
                    value={selectedProductId ?? ""}
                    onChange={(e) => setSelectedProductId(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="">-- Choose from your catalog --</option>
                    {sellerProducts.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.product?.name || `Product #${sp.product_id}`} — Current: ₹{Number(sp.price).toFixed(2)} / {sp.product?.unit || "kg"} (Stock: {sp.stock_quantity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity & Unit */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      Quantity Included
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      Validity (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={periodDays}
                      onChange={(e) => setPeriodDays(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Offer Price */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Special Offer Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    placeholder="e.g. 29.00"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      fontWeight: 700,
                      color: "#059669",
                    }}
                  />
                  {selectedProduct && offerPrice && (
                    <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>
                      Regular price for this item is ₹
                      {(Number(selectedProduct.price) * (parseFloat(quantity) || 1)).toFixed(2)}.
                      {Number(offerPrice) < Number(selectedProduct.price) * (parseFloat(quantity) || 1) && (
                        <span style={{ color: "#059669", fontWeight: 700, marginLeft: "4px" }}>
                          (You are offering a{" "}
                          {Math.round(
                            ((Number(selectedProduct.price) * (parseFloat(quantity) || 1) - Number(offerPrice)) /
                              (Number(selectedProduct.price) * (parseFloat(quantity) || 1))) *
                              100
                          )}
                          % discount)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: "#059669",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity: createMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {createMutation.isPending ? "Publishing..." : "Publish Offer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}

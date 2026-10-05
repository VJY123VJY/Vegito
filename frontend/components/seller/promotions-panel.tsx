"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  Plus,
  Trash2,
  ShoppingBasket,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { listSellerProducts } from "@/lib/api/seller-products";
import {
  createPromotion,
  listSellerPromotions,
  deletePromotion,
  type Promotion,
} from "@/lib/api/promotions";
import { getErrorMessage } from "@/lib/api/client";

export function PromotionsPanel() {
  const queryClient = useQueryClient();
  const sellerProducts = useQuery({ queryKey: ["seller-products"], queryFn: listSellerProducts });
  const promotionsQuery = useQuery({ queryKey: ["promotions", "seller"], queryFn: listSellerPromotions });

  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isRepeatOnly, setIsRepeatOnly] = useState(false);
  const [minOrderCount, setMinOrderCount] = useState("2");
  const [periodDays, setPeriodDays] = useState("7");
  const [selectedItems, setSelectedItems] = useState<{ spId: number; name: string; qty: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addPromoMutation = useMutation({
    mutationFn: (payload: any) => createPromotion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setShowAddForm(false);
      resetForm();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deletePromoMutation = useMutation({
    mutationFn: (id: number) => deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setIsRepeatOnly(false);
    setSelectedItems([]);
    setError(null);
  };

  const handleAddItem = (spId: number, name: string) => {
    if (selectedItems.find((i) => i.spId === spId)) return;
    setSelectedItems([...selectedItems, { spId, name, qty: 1 }]);
  };

  const handleRemoveItem = (spId: number) => {
    setSelectedItems(selectedItems.filter((i) => i.spId !== spId));
  };

  const applyPreset = (type: "FAMILY" | "VEG_COMBO" | "FRUIT_COMBO") => {
    setShowAddForm(true);
    const prods = sellerProducts.data ?? [];
    if (type === "FAMILY") {
      setTitle("Family Essential Pack");
      setDescription("Weekly essentials: Potato, Onion, and Tomato for home cooking");
      setPrice("179");
      const matched = prods.filter((p) => {
        const n = p.product?.name?.toLowerCase() || "";
        return n.includes("potato") || n.includes("onion") || n.includes("tomato") || n.includes("aloo") || n.includes("kanda");
      });
      setSelectedItems(matched.slice(0, 3).map((p) => ({ spId: p.id, name: p.product?.name || "Produce", qty: 2 })));
    } else if (type === "VEG_COMBO") {
      setTitle("Daily Fresh Vegetable Combo");
      setDescription("Handpicked fresh curry vegetables");
      setPrice("99");
      const matched = prods.filter((p) => {
        const n = p.product?.name?.toLowerCase() || "";
        return n.includes("spinach") || n.includes("palak") || n.includes("tomato") || n.includes("chilli") || n.includes("coriander");
      });
      setSelectedItems(matched.slice(0, 3).map((p) => ({ spId: p.id, name: p.product?.name || "Produce", qty: 1 })));
    } else if (type === "FRUIT_COMBO") {
      setTitle("Fresh Fruit Basket");
      setDescription("Fresh morning immunity fruit combo");
      setPrice("199");
      const matched = prods.filter((p) => {
        const n = p.product?.name?.toLowerCase() || "";
        return n.includes("apple") || n.includes("banana") || n.includes("orange") || n.includes("pomegranate") || n.includes("grape");
      });
      setSelectedItems(matched.slice(0, 3).map((p) => ({ spId: p.id, name: p.product?.name || "Fruit", qty: 1 })));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setError("Please add at least one product to the bundle.");
      return;
    }

    addPromoMutation.mutate({
      title,
      description,
      price: parseFloat(price),
      type: "BUNDLE",
      is_repeat_only: isRepeatOnly,
      min_order_count: isRepeatOnly ? parseInt(minOrderCount) : 0,
      period_days: isRepeatOnly ? parseInt(periodDays) : 30,
      items: selectedItems.map((i) => ({ seller_product_id: i.spId, quantity: i.qty })),
    });
  };

  const activeOffers = promotionsQuery.data ?? [];

  return (
    <div style={{ paddingBottom: "40px" }}>
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#063c32", margin: "0 0 4px" }}>
            Offers &amp; Promotions
          </h2>
          <p style={{ fontSize: "14px", color: "#62746a", margin: 0 }}>
            Create vegetable combos, family packs, and rewards for your loyal Solapur customers.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => applyPreset("FAMILY")}
            style={{
              padding: "10px 14px",
              background: "#ecfdf5",
              color: "#166534",
              border: "1.5px solid #86efac",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🥬 Family Pack
          </button>
          <button
            type="button"
            onClick={() => applyPreset("VEG_COMBO")}
            style={{
              padding: "10px 14px",
              background: "#ecfdf5",
              color: "#166534",
              border: "1.5px solid #86efac",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🥦 Veggie Combo
          </button>
          <button
            type="button"
            onClick={() => applyPreset("FRUIT_COMBO")}
            style={{
              padding: "10px 14px",
              background: "#fef3c7",
              color: "#92400e",
              border: "1.5px solid #fde68a",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            🍎 Fruit Basket
          </button>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: "10px 18px",
                background: "#16835b",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "13.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(22, 131, 91, 0.2)",
              }}
            >
              <Plus size={16} /> Custom Offer
            </button>
          )}
        </div>
      </header>

      {showAddForm && (
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "24px",
            border: "1.5px solid #16835b",
            marginBottom: "32px",
            boxShadow: "0 10px 30px rgba(6, 60, 50, 0.1)",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#063c32",
              margin: "0 0 20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <ShoppingBasket color="#16835b" /> Configure Bundle Offer
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Offer Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Veggie Basket"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Bundle Price (₹) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="199"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "14px" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                Select Produce to Include *
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                {(sellerProducts.data ?? []).map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => handleAddItem(sp.id, sp.product?.name || "Product")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "1px solid #e2e8f0",
                      background: selectedItems.find((i) => i.spId === sp.id) ? "#ecfdf5" : "#f8fafc",
                      color: selectedItems.find((i) => i.spId === sp.id) ? "#16835b" : "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    + {sp.product?.name}
                  </button>
                ))}
              </div>

              <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "14px", border: "1px solid #f1f5f9" }}>
                {selectedItems.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
                    No items added yet. Click tags above to include produce in this offer.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedItems.map((item) => (
                      <div
                        key={item.spId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#fff",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                          🥬 {item.name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>Qty:</span>
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 1;
                                setSelectedItems(selectedItems.map((si) => (si.spId === item.spId ? { ...si, qty: val } : si)));
                              }}
                              style={{ width: "50px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.spId)}
                            style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div
                style={{
                  color: "#dc2626",
                  background: "#fef2f2",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ padding: "10px 20px", background: "transparent", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontWeight: 700, color: "#64748b", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addPromoMutation.isPending}
                style={{
                  padding: "10px 24px",
                  background: "#16835b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 800,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {addPromoMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Publish Offer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Store Offers List */}
      <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e1e8e2", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#063c32", margin: 0 }}>
            Active Store Offers ({activeOffers.length})
          </h3>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Available directly on customer storefront
          </span>
        </div>

        {promotionsQuery.isLoading ? (
          <div style={{ padding: "36px", textAlign: "center", color: "#94a3b8" }}>Loading offers...</div>
        ) : activeOffers.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
            <Tag size={44} style={{ marginBottom: "12px", opacity: 0.3 }} />
            <p style={{ fontWeight: 700, margin: "0 0 4px", color: "#374151" }}>No active offers yet</p>
            <p style={{ fontSize: "13px", margin: 0 }}>
              Use the buttons above to quickly launch a Family Pack, Veggie Combo, or Fruit Basket.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {activeOffers.map((promo) => (
              <div
                key={promo.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 24px",
                  borderBottom: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 800, color: "#111827" }}>{promo.title}</span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "#dcfce7",
                        color: "#166534",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      LIVE
                    </span>
                  </div>
                  {promo.description && (
                    <p style={{ margin: "0 0 6px", fontSize: "12.5px", color: "#64748b" }}>{promo.description}</p>
                  )}
                  {promo.items && promo.items.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {promo.items.map((it, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            fontSize: "11px",
                            color: "#166534",
                            fontWeight: 600,
                          }}
                        >
                          🥬 {it.product_name || `Produce #${it.seller_product_id}`} × {it.quantity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "18px", fontWeight: 900, color: "#15803d" }}>
                      ₹{Number(promo.price).toFixed(0)}
                    </span>
                    <p style={{ margin: 0, fontSize: "11px", color: "#6b7280" }}>Bundle Price</p>
                  </div>
                  <button
                    onClick={() => deletePromoMutation.mutate(promo.id)}
                    disabled={deletePromoMutation.isPending}
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #fee2e2",
                      background: "#fff",
                      color: "#dc2626",
                      cursor: "pointer",
                    }}
                    title="Remove Offer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

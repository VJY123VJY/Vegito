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
  ArrowRight
} from "lucide-react";
import { listSellerProducts } from "@/lib/api/seller-products";
import { createPromotion } from "@/lib/api/promotions";
import { getErrorMessage } from "@/lib/api/client";

export function PromotionsPanel() {
  const queryClient = useQueryClient();
  const sellerProducts = useQuery({ queryKey: ["seller-products"], queryFn: listSellerProducts });

  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isRepeatOnly, setIsRepeatOnly] = useState(false);
  const [minOrderCount, setMinOrderCount] = useState("2");
  const [periodDays, setPeriodDays] = useState("7");
  const [selectedItems, setSelectedItems] = useState<{spId: number, name: string, qty: number}[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addPromoMutation = useMutation({
    mutationFn: (payload: any) => createPromotion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setShowAddForm(false);
      resetForm();
    },
    onError: (err) => setError(getErrorMessage(err))
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
    if (selectedItems.find(i => i.spId === spId)) return;
    setSelectedItems([...selectedItems, { spId, name, qty: 1 }]);
  };

  const handleRemoveItem = (spId: number) => {
    setSelectedItems(selectedItems.filter(i => i.spId !== spId));
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
      items: selectedItems.map(i => ({ seller_product_id: i.spId, quantity: i.qty }))
    });
  };

  return (
    <div style={{ paddingBottom: "40px" }}>
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#063c32", margin: "0 0 4px" }}>
            Offers &amp; Promotions
          </h2>
          <p style={{ fontSize: "14px", color: "#62746a", margin: 0 }}>
            Create vegetable bundles and rewards for your loyal Solapur customers.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: "12px 20px",
              background: "#16835b",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontWeight: 800,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(22, 131, 91, 0.2)"
            }}
          >
            <Plus size={18} /> Create New Offer
          </button>
        )}
      </header>

      {showAddForm && (
        <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", border: "1.5px solid #16835b", marginBottom: "32px", boxShadow: "0 10px 30px rgba(6, 60, 50, 0.1)" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#063c32", margin: "0 0 20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <ShoppingBasket color="#16835b" /> Configure Bundle Offer
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>Offer Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Veggie Basket"
                  required
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>Bundle Price (₹) *</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="500"
                  required
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "14px" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "12px" }}>Included Vegetables *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                {(sellerProducts.data ?? []).map(sp => (
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
                      background: selectedItems.find(i => i.spId === sp.id) ? "#ecfdf5" : "#f8fafc",
                      color: selectedItems.find(i => i.spId === sp.id) ? "#16835b" : "#64748b",
                      cursor: "pointer"
                    }}
                  >
                    {sp.product?.name}
                  </button>
                ))}
              </div>

              <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px", border: "1px solid #f1f5f9" }}>
                {selectedItems.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>No items added to bundle yet. Click tags above to add.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedItems.map(item => (
                      <div key={item.spId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>{item.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>Qty:</span>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                setSelectedItems(selectedItems.map(si => si.spId === item.spId ? {...si, qty: val} : si));
                              }}
                              style={{ width: "50px", padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                            />
                          </div>
                          <button type="button" onClick={() => handleRemoveItem(item.spId)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: "#f1f5f9", padding: "20px", borderRadius: "14px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <input
                  type="checkbox"
                  id="repeat_only"
                  checked={isRepeatOnly}
                  onChange={e => setIsRepeatOnly(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#16835b" }}
                />
                <label htmlFor="repeat_only" style={{ fontSize: "14px", fontWeight: 700, color: "#334155", cursor: "pointer" }}>Repeat Customer Offer Only</label>
              </div>

              {isRepeatOnly && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingLeft: "28px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>Min Order Count</label>
                    <input
                      type="number"
                      value={minOrderCount}
                      onChange={e => setMinOrderCount(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>Lookback Period (Days)</label>
                    <input
                      type="number"
                      value={periodDays}
                      onChange={e => setPeriodDays(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div style={{ color: "#dc2626", background: "#fef2f2", padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ padding: "12px 24px", background: "transparent", border: "1.5px solid #e2e8f0", borderRadius: "12px", fontWeight: 700, color: "#64748b", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addPromoMutation.isPending}
                style={{
                  padding: "12px 32px",
                  background: "#16835b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 800,
                  fontSize: "15px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(22, 131, 91, 0.2)"
                }}
              >
                {addPromoMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Publish Offer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Placeholder for list of existing offers */}
      <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e1e8e2", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#063c32", margin: 0 }}>Active Store Offers</h3>
        </div>
        <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
          <Tag size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
          <p style={{ fontWeight: 600 }}>You haven't created any promotional offers yet.</p>
          <p style={{ fontSize: "13px" }}>Bundles and loyalty offers help increase your store's visibility in the marketplace.</p>
        </div>
      </div>
    </div>
  );
}

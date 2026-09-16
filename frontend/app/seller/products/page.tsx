"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  AlertCircle,
  Tag,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import {
  listSellerProducts,
  updateSellerProduct,
  deleteSellerProduct,
  SellerProductItem,
} from "@/lib/api/seller";
import { getSellerProfile } from "@/lib/api/seller-products";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AddProductModal } from "@/components/seller/add-product-modal";
import { RoleGuard } from "@/components/role/role-guard";
import { getErrorMessage } from "@/lib/api/client";

export default function SellerProductsPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const profile = useQuery({
    queryKey: ["seller-profile"],
    queryFn: getSellerProfile,
  });

  const productsQuery = useQuery({
    queryKey: ["seller-products"],
    queryFn: listSellerProducts,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { price?: number; stock_quantity?: number; is_available?: boolean };
    }) => updateSellerProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["seller-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingId(null);
      setFeedbackMsg({ type: "success", text: "Product updated successfully!" });
      setTimeout(() => setFeedbackMsg(null), 3000);
    },
    onError: (err) => {
      setFeedbackMsg({ type: "error", text: getErrorMessage(err) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSellerProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["seller-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setFeedbackMsg({ type: "success", text: "Product deactivated/deleted successfully." });
      setTimeout(() => setFeedbackMsg(null), 3000);
    },
    onError: (err) => {
      setFeedbackMsg({ type: "error", text: getErrorMessage(err) });
    },
  });

  const businessName = profile.data?.business_name || "Farm Fresh Solapur";
  const rawProducts = productsQuery.data ?? [];
  const filteredProducts = rawProducts.filter((p) => {
    const name = (p.product_name || p.product?.name || "").toLowerCase();
    const cat = (p.category_name || "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || cat.includes(q);
  });

  const handleStartEdit = (p: SellerProductItem) => {
    setEditingId(p.id);
    setEditPrice(String(p.price));
    setEditStock(String(p.stock_quantity));
  };

  const handleSaveEdit = (p: SellerProductItem) => {
    const numPrice = parseFloat(editPrice);
    const numStock = parseFloat(editStock);
    if (isNaN(numPrice) || numPrice < 0) {
      setFeedbackMsg({ type: "error", text: "Price must be a valid positive number" });
      return;
    }
    if (isNaN(numStock) || numStock < 0) {
      setFeedbackMsg({ type: "error", text: "Stock must be a valid positive number" });
      return;
    }

    updateMutation.mutate({
      id: p.id,
      payload: {
        price: numPrice,
        stock_quantity: numStock,
        is_available: numStock > 0 ? p.is_available : false,
      },
    });
  };

  const handleToggleAvailability = (p: SellerProductItem) => {
    updateMutation.mutate({
      id: p.id,
      payload: { is_available: !p.is_available },
    });
  };

  return (
    <RoleGuard allow={["SELLER", "ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="seller"
        userName={businessName}
        userRole="Verified Seller"
        greeting={`Vegetable Catalog · ${businessName}`}
        subtitle="Manage your listed vegetables, set selling prices, and control stock availability"
        searchPlaceholder="Search vegetables..."
      >
        {/* Header Action Row */}
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
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#063c32" }}>
              My Products ({rawProducts.length})
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
              Prices entered here are immediately reflected for customer orders and checkout.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link
              href="/seller/products/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 16px",
                backgroundColor: "#ffffff",
                border: "1.5px solid #d8e5dc",
                color: "#063c32",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Full Page Form
            </Link>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: "#16835b",
                color: "#ffffff",
                borderRadius: "12px",
                border: "none",
                fontSize: "13.5px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(22, 131, 91, 0.2)",
              }}
            >
              <Plus size={18} /> + Add Vegetable
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "12px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: feedbackMsg.type === "success" ? "#e9f6ee" : "#fee2e2",
              color: feedbackMsg.type === "success" ? "#16835b" : "#dc2626",
              border: `1px solid ${feedbackMsg.type === "success" ? "#c4e8d3" : "#fca5a5"}`,
              fontSize: "13.5px",
              fontWeight: 700,
            }}
          >
            {feedbackMsg.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
            {feedbackMsg.text}
          </div>
        )}

        {/* Filter Bar */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e1e8e2",
            borderRadius: "14px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Search size={18} color="#62746a" />
          <input
            type="text"
            placeholder="Search by vegetable name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "14px",
              color: "#13221b",
              backgroundColor: "transparent",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#62746a",
                fontSize: "12px",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Products Table Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e1e8e2",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
          }}
        >
          {productsQuery.isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#62746a" }}>
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#62746a" }}>
              <Package size={42} color="#16835b" style={{ margin: "0 auto 12px" }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: "16px", color: "#063c32" }}>
                No vegetables found
              </p>
              <p style={{ margin: "6px 0 18px", fontSize: "13px" }}>
                {search ? "No products matched your search." : "Start listing your fresh farm harvest today."}
              </p>
              {!search && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  style={{
                    padding: "9px 18px",
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    borderRadius: "10px",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={16} style={{ display: "inline", marginRight: "4px" }} /> Add Your First Product
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fbf8", borderBottom: "1.5px solid #edf2ee" }}>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Vegetable</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Category</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Unit</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Your Price (₹)</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Stock (kg)</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Status</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700, textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const isEditing = editingId === p.id;
                    const isOutOfStock = Number(p.stock_quantity) <= 0;

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: "1px solid #f1f5f2",
                          backgroundColor: isEditing ? "#f0fdf4" : "transparent",
                          transition: "background-color 0.15s",
                        }}
                      >
                        {/* Vegetable & Image */}
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "10px",
                                backgroundColor: "#e9f6ee",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                border: "1px solid #d8e5dc",
                              }}
                            >
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.product_name || "Vegetable"}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <span style={{ fontSize: "20px" }}>🥬</span>
                              )}
                            </div>
                            <div>
                              <strong style={{ color: "#063c32", fontSize: "14px", display: "block" }}>
                                {p.product_name || "Vegetable"}
                              </strong>
                              {p.description && (
                                <span
                                  style={{
                                    fontSize: "11.5px",
                                    color: "#62746a",
                                    display: "block",
                                    maxWidth: "240px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {p.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: "14px 18px", color: "#475569" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#f1f5f9",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            {p.category_name || "Vegetables"}
                          </span>
                        </td>

                        {/* Unit */}
                        <td style={{ padding: "14px 18px", color: "#62746a", fontWeight: 600 }}>
                          {p.product_unit || "1 KG"}
                        </td>

                        {/* Price (Inline edit) */}
                        <td style={{ padding: "14px 18px" }}>
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ fontWeight: 800, color: "#16835b" }}>₹</span>
                              <input
                                type="number"
                                step="0.5"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                style={{
                                  width: "80px",
                                  padding: "6px 8px",
                                  borderRadius: "8px",
                                  border: "1.5px solid #16835b",
                                  fontSize: "13px",
                                  fontWeight: 800,
                                  outline: "none",
                                }}
                              />
                            </div>
                          ) : (
                            <span style={{ fontWeight: 800, fontSize: "14.5px", color: "#063c32" }}>
                              ₹{Number(p.price).toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Stock (Inline edit) */}
                        <td style={{ padding: "14px 18px" }}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="1"
                              value={editStock}
                              onChange={(e) => setEditStock(e.target.value)}
                              style={{
                                width: "75px",
                                padding: "6px 8px",
                                borderRadius: "8px",
                                border: "1.5px solid #16835b",
                                fontSize: "13px",
                                fontWeight: 800,
                                outline: "none",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontWeight: 700,
                                color: isOutOfStock ? "#dc2626" : Number(p.stock_quantity) <= 5 ? "#d97706" : "#16835b",
                              }}
                            >
                              {p.stock_quantity} kg
                            </span>
                          )}
                        </td>

                        {/* Availability Toggle */}
                        <td style={{ padding: "14px 18px" }}>
                          <button
                            onClick={() => handleToggleAvailability(p)}
                            disabled={updateMutation.isPending}
                            title={p.is_available ? "Click to mark Inactive" : "Click to mark Active"}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              border: "none",
                              backgroundColor: p.is_available && !isOutOfStock ? "#e9f6ee" : "#fee2e2",
                              color: p.is_available && !isOutOfStock ? "#16835b" : "#dc2626",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                backgroundColor: p.is_available && !isOutOfStock ? "#16835b" : "#dc2626",
                              }}
                            />
                            {isOutOfStock ? "Out of Stock" : p.is_available ? "Active" : "Hidden"}
                          </button>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          {isEditing ? (
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                onClick={() => handleSaveEdit(p)}
                                disabled={updateMutation.isPending}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  backgroundColor: "#16835b",
                                  color: "#ffffff",
                                  border: "none",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <Check size={14} /> Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  backgroundColor: "#f1f5f9",
                                  color: "#64748b",
                                  border: "none",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <X size={14} /> Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                onClick={() => handleStartEdit(p)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  backgroundColor: "#ffffff",
                                  color: "#063c32",
                                  border: "1px solid #d8e5dc",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to deactivate and remove ${p.product_name || "this product"}?`)) {
                                    deleteMutation.mutate(p.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                title="Delete / Deactivate"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  backgroundColor: "#fef2f2",
                                  color: "#dc2626",
                                  border: "1px solid #fecaca",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Product Modal */}
        <AddProductModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      </DashboardShell>
    </RoleGuard>
  );
}

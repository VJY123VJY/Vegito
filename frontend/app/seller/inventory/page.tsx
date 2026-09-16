"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  Package,
  Search,
  Filter,
  RefreshCw,
  TrendingDown,
  Info,
} from "lucide-react";
import {
  listInventory,
  adjustInventory,
  InventoryItem,
  InventoryAdjust,
} from "@/lib/api/inventory";
import { getSellerProfile } from "@/lib/api/seller-products";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getErrorMessage } from "@/lib/api/client";

export default function SellerInventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryItem | null>(null);
  const [customQty, setCustomQty] = useState("");
  const [customType, setCustomType] = useState<"STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT">("STOCK_IN");
  const [customNote, setCustomNote] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const profile = useQuery({
    queryKey: ["seller-profile"],
    queryFn: getSellerProfile,
  });

  const inventoryQuery = useQuery({
    queryKey: ["seller-inventory", lowStockFilter],
    queryFn: () => listInventory(lowStockFilter),
  });

  const adjustMutation = useMutation({
    mutationFn: ({
      sellerProductId,
      payload,
    }: {
      sellerProductId: number;
      payload: InventoryAdjust;
    }) => adjustInventory(sellerProductId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setAdjustModalItem(null);
      setCustomQty("");
      setCustomNote("");
      setFeedback({ type: "success", msg: "Inventory updated successfully!" });
      setTimeout(() => setFeedback(null), 3500);
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) });
    },
  });

  const businessName = profile.data?.business_name || "Farm Fresh Solapur";
  const items = inventoryQuery.data?.items ?? [];
  const filteredItems = items.filter((inv) => {
    const name = (inv.product_name || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const totalStockKg = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const lowStockCount = items.filter(
    (item) => Number(item.quantity) <= Number(item.low_stock_threshold)
  ).length;

  const handleQuickAdjust = (item: InventoryItem, delta: number) => {
    const newQty = Number(item.quantity) + delta;
    if (newQty < 0) {
      setFeedback({ type: "error", msg: "Adjustment would reduce stock below 0 kg." });
      return;
    }
    adjustMutation.mutate({
      sellerProductId: item.seller_product_id,
      payload: {
        quantity_change: delta,
        transaction_type: delta > 0 ? "STOCK_IN" : "STOCK_OUT",
        note: delta > 0 ? "Quick restock (+10 kg)" : "Quick deduction (-10 kg)",
      },
    });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem) return;

    const qty = parseFloat(customQty);
    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: "error", msg: "Please enter a valid positive quantity." });
      return;
    }

    const change = customType === "STOCK_OUT" ? -qty : qty;
    if (Number(adjustModalItem.quantity) + change < 0) {
      setFeedback({ type: "error", msg: "Stock deduction exceeds available inventory." });
      return;
    }

    adjustMutation.mutate({
      sellerProductId: adjustModalItem.seller_product_id,
      payload: {
        quantity_change: change,
        transaction_type: customType,
        note: customNote || (customType === "STOCK_IN" ? "Fresh harvest restock" : "Manual deduction"),
      },
    });
  };

  return (
    <RoleGuard allow={["SELLER", "ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="seller"
        userName={businessName}
        userRole="Verified Seller"
        greeting={`Inventory Management · ${businessName}`}
        subtitle="Track stock levels, monitor low-stock thresholds, and log fresh harvest batches"
        searchPlaceholder="Search inventory..."
      >
        {/* KPI Banner */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "#e9f6ee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#16835b",
              }}
            >
              <Package size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#62746a", fontWeight: 600 }}>Total Items</p>
              <h3 style={{ margin: "2px 0 0", fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
                {items.length}
              </h3>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
              }}
            >
              <Layers size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#62746a", fontWeight: 600 }}>Stock On Hand</p>
              <h3 style={{ margin: "2px 0 0", fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
                {totalStockKg.toFixed(1)} kg
              </h3>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: lowStockCount > 0 ? "#fee2e2" : "#e9f6ee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: lowStockCount > 0 ? "#dc2626" : "#16835b",
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#62746a", fontWeight: 600 }}>Low Stock Alerts</p>
              <h3
                style={{
                  margin: "2px 0 0",
                  fontSize: "20px",
                  fontWeight: 800,
                  color: lowStockCount > 0 ? "#dc2626" : "#16835b",
                }}
              >
                {lowStockCount}
              </h3>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "12px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: feedback.type === "success" ? "#e9f6ee" : "#fee2e2",
              color: feedback.type === "success" ? "#16835b" : "#dc2626",
              border: `1px solid ${feedback.type === "success" ? "#c4e8d3" : "#fca5a5"}`,
              fontSize: "13.5px",
              fontWeight: 700,
            }}
          >
            {feedback.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            {feedback.msg}
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e1e8e2",
            borderRadius: "14px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "220px" }}>
            <Search size={18} color="#62746a" />
            <input
              type="text"
              placeholder="Search inventory items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: "#13221b",
                backgroundColor: "transparent",
                width: "100%",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: `1px solid ${lowStockFilter ? "#dc2626" : "#e1e8e2"}`,
                backgroundColor: lowStockFilter ? "#fee2e2" : "#ffffff",
                color: lowStockFilter ? "#dc2626" : "#475569",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <AlertTriangle size={14} />
              {lowStockFilter ? "Showing Low Stock Only" : "Filter Low Stock"}
            </button>
          </div>
        </div>

        {/* Inventory Items Table */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e1e8e2",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
          }}
        >
          {inventoryQuery.isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#62746a" }}>
              Loading inventory records...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#62746a" }}>
              <Layers size={40} color="#16835b" style={{ margin: "0 auto 10px" }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: "16px", color: "#063c32" }}>
                No inventory items found
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "13px" }}>
                Products added to your catalog will automatically generate inventory tracking.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fbf8", borderBottom: "1.5px solid #edf2ee" }}>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Vegetable Item</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Stock on Hand</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Reserved</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Available</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Threshold</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700 }}>Status</th>
                    <th style={{ padding: "14px 18px", color: "#62746a", fontWeight: 700, textAlign: "right" }}>
                      Stock Adjustments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((inv) => {
                    const isLow = Number(inv.quantity) <= Number(inv.low_stock_threshold);
                    const isOut = Number(inv.quantity) <= 0;

                    return (
                      <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f2" }}>
                        <td style={{ padding: "14px 18px" }}>
                          <strong style={{ color: "#063c32", fontSize: "14px" }}>
                            {inv.product_name || "Vegetable Item"}
                          </strong>
                          <span style={{ display: "block", fontSize: "11.5px", color: "#62746a" }}>
                            Unit: {inv.product_unit || "1 KG"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", fontWeight: 800, color: "#063c32" }}>
                          {Number(inv.quantity).toFixed(1)} kg
                        </td>
                        <td style={{ padding: "14px 18px", color: "#62746a" }}>
                          {Number(inv.reserved_quantity || 0).toFixed(1)} kg
                        </td>
                        <td
                          style={{
                            padding: "14px 18px",
                            fontWeight: 800,
                            color: isOut ? "#dc2626" : isLow ? "#d97706" : "#16835b",
                          }}
                        >
                          {Number(inv.available_quantity ?? (Number(inv.quantity) - Number(inv.reserved_quantity || 0))).toFixed(1)} kg
                        </td>
                        <td style={{ padding: "14px 18px", color: "#62746a" }}>
                          {inv.low_stock_threshold} kg
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: 700,
                              backgroundColor: isOut ? "#fee2e2" : isLow ? "#fef3c7" : "#e9f6ee",
                              color: isOut ? "#dc2626" : isLow ? "#b45309" : "#16835b",
                            }}
                          >
                            {isOut ? "Out of Stock" : isLow ? "Low Stock" : "Healthy Stock"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            {/* Quick +10 */}
                            <button
                              onClick={() => handleQuickAdjust(inv, 10)}
                              disabled={adjustMutation.isPending}
                              title="Add 10 kg from fresh harvest"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                                padding: "5px 9px",
                                borderRadius: "8px",
                                border: "1px solid #c4e8d3",
                                backgroundColor: "#f0fdf4",
                                color: "#16835b",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <Plus size={13} /> 10kg
                            </button>

                            {/* Quick -10 */}
                            <button
                              onClick={() => handleQuickAdjust(inv, -10)}
                              disabled={adjustMutation.isPending}
                              title="Deduct 10 kg (spoilage/offline sale)"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                                padding: "5px 9px",
                                borderRadius: "8px",
                                border: "1px solid #fee2e2",
                                backgroundColor: "#fff5f5",
                                color: "#dc2626",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <Minus size={13} /> 10kg
                            </button>

                            {/* Custom Adjust */}
                            <button
                              onClick={() => {
                                setAdjustModalItem(inv);
                                setCustomQty("");
                                setCustomNote("");
                              }}
                              style={{
                                padding: "5px 12px",
                                borderRadius: "8px",
                                border: "1px solid #d8e5dc",
                                backgroundColor: "#ffffff",
                                color: "#063c32",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Adjust...
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

        {/* Custom Stock Adjustment Modal */}
        {adjustModalItem && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(6, 60, 50, 0.45)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "16px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                padding: "26px",
                width: "100%",
                maxWidth: "460px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
              }}
            >
              <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                Adjust Stock: {adjustModalItem.product_name}
              </h3>
              <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#62746a" }}>
                Current quantity: <b>{adjustModalItem.quantity} kg</b>
              </p>

              <form onSubmit={handleCustomSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                    Action Type
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setCustomType("STOCK_IN")}
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        border: `1.5px solid ${customType === "STOCK_IN" ? "#16835b" : "#e1e8e2"}`,
                        backgroundColor: customType === "STOCK_IN" ? "#e9f6ee" : "#ffffff",
                        color: customType === "STOCK_IN" ? "#16835b" : "#475569",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      + Stock In (Harvest)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomType("STOCK_OUT")}
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        border: `1.5px solid ${customType === "STOCK_OUT" ? "#dc2626" : "#e1e8e2"}`,
                        backgroundColor: customType === "STOCK_OUT" ? "#fee2e2" : "#ffffff",
                        color: customType === "STOCK_OUT" ? "#dc2626" : "#475569",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      - Stock Out (Spoilage)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                    Quantity (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="e.g. 25"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                    Reason / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fresh harvest arrival from field"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setAdjustModalItem(null)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustMutation.isPending}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "10px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {adjustMutation.isPending ? "Updating..." : "Save Stock Adjustment"}
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


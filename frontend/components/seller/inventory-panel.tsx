"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listInventory, adjustInventory } from "@/lib/api/inventory";
import { AlertTriangle, Package, Plus, Minus } from "lucide-react";

function StockBar({ quantity, threshold }: { quantity: number; threshold: number }) {
  const max = Math.max(quantity, threshold * 3, 1);
  const pct = Math.min(100, (quantity / max) * 100);
  const color = quantity <= 0 ? "#ef4444" : quantity <= threshold ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ flex: 1, height: "6px", background: "#f3f4f6", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 300ms ease" }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: "700", color, minWidth: "30px", textAlign: "right" }}>{quantity}</span>
    </div>
  );
}

function AdjustModal({ item, onClose }: { item: { id: number; seller_product_id: number; product_name?: string | null; quantity: number }; onClose: () => void }) {
  const client = useQueryClient();
  const [change, setChange] = useState("0");
  const [type, setType] = useState<"STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT">("STOCK_IN");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const adjust = useMutation({
    mutationFn: () => adjustInventory(item.seller_product_id, { quantity_change: Number(change), transaction_type: type, note }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ["inventory"] }); onClose(); },
    onError: (e: unknown) => setError(String(e)),
  });

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: "9px", fontSize: "14px", outline: "none", background: "#fafafa" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: "18px", padding: "28px", width: "min(420px, 95vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: "800", color: "#111827" }}>Adjust Stock</h3>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>{item.product_name ?? `Product #${item.seller_product_id}`} · Current: <strong>{item.quantity}</strong></p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "5px" }}>Transaction Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} style={inputStyle}>
              <option value="STOCK_IN">Stock In (+)</option>
              <option value="STOCK_OUT">Stock Out (−)</option>
              <option value="ADJUSTMENT">Manual Adjustment</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "5px" }}>
              {type === "STOCK_IN" ? "Units to Add" : type === "STOCK_OUT" ? "Units to Remove" : "New Quantity"}
            </label>
            <input type="number" value={change} onChange={(e) => setChange(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "5px" }}>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Fresh stock arrived" style={inputStyle} />
          </div>
          {error && <p style={{ color: "#dc2626", fontSize: "13px" }}>{error}</p>}
          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button onClick={() => adjust.mutate()} disabled={adjust.isPending || !change}
              style={{ flex: 1, padding: "12px", background: "#1a3d2b", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
              {adjust.isPending ? "Saving..." : "Confirm Adjustment"}
            </button>
            <button onClick={onClose} style={{ padding: "12px 16px", background: "#f3f4f6", border: "none", borderRadius: "10px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InventoryPanel() {
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<null | { id: number; seller_product_id: number; product_name?: string | null; quantity: number }>(null);

  const inventory = useQuery({
    queryKey: ["inventory", showLowOnly],
    queryFn: () => listInventory(showLowOnly),
  });

  const items = inventory.data?.items ?? [];
  const lowCount = items.filter((i) => i.quantity <= i.low_stock_threshold).length;
  const outCount = items.filter((i) => i.quantity <= 0).length;

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#111827" }}>Inventory</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Track stock levels and adjust quantities</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { label: "Total Products", value: items.length, color: "#dbeafe", icon: "📦" },
          { label: "Low Stock", value: lowCount, color: "#fef3c7", icon: "⚠️" },
          { label: "Out of Stock", value: outCount, color: "#fee2e2", icon: "🚫" },
        ].map((c) => (
          <div key={c.label} style={{ padding: "16px 20px", background: "#fff", borderRadius: "12px", border: "1px solid #f0f1f3", display: "flex", alignItems: "center", gap: "12px", minWidth: "140px" }}>
            <div style={{ width: "40px", height: "40px", background: c.color, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{c.icon}</div>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "12px", color: "#9ca3af" }}>{c.label}</p>
              <p style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#111827" }}>{c.value}</p>
            </div>
          </div>
        ))}
        <button onClick={() => setShowLowOnly(!showLowOnly)}
          style={{ padding: "12px 18px", background: showLowOnly ? "#1a3d2b" : "#fff", color: showLowOnly ? "#fff" : "#374151", border: "1px solid #e5e7eb", borderRadius: "12px", fontWeight: "600", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
          <AlertTriangle size={15} color={showLowOnly ? "#6fcf3a" : "#d97706"} />
          {showLowOnly ? "Showing Low Stock" : "Show Low Stock Only"}
        </button>
      </div>

      {/* Inventory Table */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f0f1f3", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", gap: "12px", padding: "10px 20px", background: "#f9fafb", borderBottom: "1px solid #f0f1f3" }}>
          {["", "Product", "Available", "Stock Level", "Low Threshold", ""].map((h, i) => (
            <span key={i} style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {inventory.isLoading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: "60px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }} />)
          : items.length === 0
            ? <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>
                <p style={{ fontSize: "40px" }}>📦</p>
                <p>No inventory records. Add products first.</p>
              </div>
            : items.map((item) => {
                const available = Math.max(0, item.quantity - (item.reserved_quantity ?? 0));
                const isLow = item.quantity <= item.low_stock_threshold;
                const isOut = item.quantity <= 0;
                return (
                  <div key={item.id} style={{
                    display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", gap: "12px",
                    alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #f3f4f6",
                    background: isOut ? "#fff5f5" : isLow ? "#fffbeb" : "#fff",
                  }}>
                    <div style={{ width: "36px", height: "36px", background: "#f0fdf4", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                      {isOut ? "🚫" : isLow ? "⚠️" : "🥦"}
                    </div>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "700", color: "#111827" }}>
                        {item.product_name ?? `Product #${item.seller_product_id}`}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>{item.product_unit ?? ""}</p>
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: isOut ? "#ef4444" : isLow ? "#f59e0b" : "#16a34a" }}>
                      {available} avail.
                    </span>
                    <div style={{ width: "120px" }}>
                      <StockBar quantity={item.quantity} threshold={item.low_stock_threshold} />
                    </div>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Min: {item.low_stock_threshold}</span>
                    <button onClick={() => setAdjusting({ id: item.id, seller_product_id: item.seller_product_id, product_name: item.product_name, quantity: item.quantity })}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: "#f0fdf4", border: "1px solid #d1fae5", borderRadius: "7px", fontSize: "12px", fontWeight: "600", cursor: "pointer", color: "#1a6b3a" }}>
                      <Package size={13} /> Adjust
                    </button>
                  </div>
                );
              })
        }
      </div>

      {adjusting && <AdjustModal item={adjusting} onClose={() => setAdjusting(null)} />}
    </div>
  );
}

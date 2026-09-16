"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSellerProducts, updateSellerProduct, addSellerProduct, type SellerProduct } from "@/lib/api/seller-products";
import { getProducts } from "@/lib/api/products";
import { getErrorMessage } from "@/lib/api/client";
import { Plus, Pencil, X, Check, ToggleLeft, ToggleRight } from "lucide-react";

function AvailabilityToggle({ product }: { product: SellerProduct }) {
  const client = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => updateSellerProduct(product.id, { is_available: !product.is_available }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["seller-products"] }),
  });
  return (
    <button onClick={() => toggle.mutate()} disabled={toggle.isPending}
      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", color: product.is_available ? "#16a34a" : "#9ca3af", fontWeight: "600", fontSize: "12px" }}>
      {product.is_available ? <ToggleRight size={22} color="#16a34a" /> : <ToggleLeft size={22} color="#d1d5db" />}
      {product.is_available ? "Available" : "Unavailable"}
    </button>
  );
}

function EditRow({ product, onDone }: { product: SellerProduct; onDone: () => void }) {
  const client = useQueryClient();
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock_quantity));
  const update = useMutation({
    mutationFn: () => updateSellerProduct(product.id, { price: Number(price), stock_quantity: Number(stock) }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ["seller-products"] }); onDone(); },
  });
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "12px", color: "#6b7280" }}>₹</span>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: "70px", padding: "5px 8px", border: "1.5px solid #d1fae5", borderRadius: "6px", fontSize: "13px" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "12px", color: "#6b7280" }}>Qty:</span>
        <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={{ width: "60px", padding: "5px 8px", border: "1.5px solid #d1fae5", borderRadius: "6px", fontSize: "13px" }} />
      </div>
      <button onClick={() => update.mutate()} disabled={update.isPending}
        style={{ width: "28px", height: "28px", background: "#1a3d2b", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Check size={14} />
      </button>
      <button onClick={onDone} style={{ width: "28px", height: "28px", background: "#f3f4f6", border: "none", borderRadius: "7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X size={14} />
      </button>
    </div>
  );
}

function AddProductForm({ onDone }: { onDone: () => void }) {
  const client = useQueryClient();
  const masterProducts = useQuery({ queryKey: ["products", "public"], queryFn: () => getProducts({ pageSize: 50 }) });
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [error, setError] = useState("");

  const add = useMutation({
    mutationFn: () => addSellerProduct({ product_id: Number(productId), price: Number(price), stock_quantity: Number(stock), is_available: true }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ["seller-products"] }); onDone(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: "9px", fontSize: "14px", outline: "none" };

  return (
    <div style={{ background: "#f0fdf4", border: "1.5px solid #d1fae5", borderRadius: "14px", padding: "20px 22px", marginBottom: "16px" }}>
      <h4 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: "700", color: "#1a3d2b" }}>Add New Product Listing</h4>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "10px", alignItems: "end" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "5px" }}>Product</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ ...inputStyle, background: "#fff" }}>
            <option value="">Select a product...</option>
            {(masterProducts.data?.items ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "5px" }}>Price (₹)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "5px" }}>Stock Qty</label>
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => add.mutate()} disabled={!productId || !price || !stock || add.isPending}
            style={{ padding: "10px 18px", background: "#1a3d2b", color: "#fff", border: "none", borderRadius: "9px", fontWeight: "700", fontSize: "13px", cursor: "pointer", height: "42px" }}>
            {add.isPending ? "..." : "Add"}
          </button>
          <button onClick={onDone} style={{ padding: "10px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "9px", fontSize: "13px", cursor: "pointer", height: "42px" }}>
            Cancel
          </button>
        </div>
      </div>
      {error && <p style={{ margin: "10px 0 0", color: "#dc2626", fontSize: "13px" }}>{error}</p>}
    </div>
  );
}

export function ProductPanel() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const products = useQuery({ queryKey: ["seller-products"], queryFn: listSellerProducts });
  const items = products.data ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#111827" }}>Products</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Manage your product listings, prices, and stock</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", background: "#1a3d2b", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {showAdd && <AddProductForm onDone={() => setShowAdd(false)} />}

      <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f0f1f3", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", gap: "12px", padding: "10px 20px", background: "#f9fafb", borderBottom: "1px solid #f0f1f3" }}>
          {["", "Product", "Price", "Stock", "Availability", "Actions"].map((h, i) => (
            <span key={i} style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {products.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: "64px", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }} />)
          : items.length === 0
            ? <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>
                <p style={{ fontSize: "40px", marginBottom: "12px" }}>📦</p>
                <p style={{ fontSize: "14px" }}>No products yet. Click "Add Product" to list your first item.</p>
              </div>
            : items.map((product) => (
                <div key={product.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", gap: "12px", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ width: "36px", height: "36px", background: "#f0fdf4", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🥦</div>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "700", color: "#111827" }}>{product.product?.name ?? `Product #${product.product_id}`}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>{product.product?.unit ?? ""}</p>
                  </div>
                  {editingId === product.id
                    ? <EditRow product={product} onDone={() => setEditingId(null)} />
                    : <>
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>₹{Number(product.price).toFixed(0)}</span>
                        <span style={{ fontSize: "13px", color: product.stock_quantity <= 5 ? "#dc2626" : "#374151", fontWeight: product.stock_quantity <= 5 ? "700" : "400" }}>
                          {product.stock_quantity} units
                        </span>
                        <AvailabilityToggle product={product} />
                        <button onClick={() => setEditingId(product.id)}
                          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: "#f3f4f6", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "600", cursor: "pointer", color: "#374151" }}>
                          <Pencil size={13} /> Edit
                        </button>
                      </>
                  }
                </div>
              ))
        }
      </div>
    </div>
  );
}

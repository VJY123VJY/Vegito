"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  UploadCloud,
  Plus,
  Loader2,
  AlertCircle,
  Check,
  Trash2,
} from "lucide-react";
import { addSellerProduct, AddProductInput } from "@/lib/api/seller";
import { getCategories } from "@/lib/api/categories";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getErrorMessage } from "@/lib/api/client";

const PRESET_VEGETABLE_IMAGES = [
  { label: "Tomatoes", url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80" },
  { label: "Potatoes", url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80" },
  { label: "Onions", url: "https://images.unsplash.com/photo-1508747703725-719777637510?w=600&auto=format&fit=crop&q=80" },
  { label: "Spinach", url: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80" },
  { label: "Carrots", url: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80" },
  { label: "Cauliflower", url: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80" },
];

export default function NewSellerProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [unit, setUnit] = useState("1 KG");
  const [price, setPrice] = useState("40");
  const [stockQuantity, setStockQuantity] = useState("50");
  const [moq, setMoq] = useState("1");
  const [isAvailable, setIsAvailable] = useState(true);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const addMutation = useMutation({
    mutationFn: (payload: AddProductInput) => addSellerProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["seller-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/seller/products");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productName.trim()) {
      setError("Product name is required.");
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError("Please enter a valid price greater than 0.");
      return;
    }
    const numStock = parseFloat(stockQuantity);
    if (isNaN(numStock) || numStock < 0) {
      setError("Please enter a valid stock quantity.");
      return;
    }

    addMutation.mutate({
      product_name: productName.trim(),
      category_id: categoryId || (categoriesQuery.data?.[0]?.id ?? 1),
      unit: unit,
      price: numPrice,
      stock_quantity: numStock,
      minimum_order_quantity: parseFloat(moq) || 1,
      is_available: isAvailable,
      description: description.trim() || undefined,
      image_url: imageUrl || undefined,
    });
  };

  return (
    <RoleGuard allow={["SELLER", "ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="seller"
        userName="Farm Seller"
        userRole="Verified Seller"
        greeting="Add New Vegetable Listing"
        subtitle="Publish farm-fresh vegetables directly to the Vegito marketplace"
      >
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          {/* Back button link */}
          <div style={{ marginBottom: "20px" }}>
            <Link
              href="/seller/products"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                backgroundColor: "#ffffff",
                border: "1px solid #e1e8e2",
                color: "#063c32",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} /> Back to Products Catalog
            </Link>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 4px 20px rgba(6, 60, 50, 0.05)",
              padding: "32px",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#063c32", margin: "0 0 6px" }}>
              Vegetable Details
            </h2>
            <p style={{ fontSize: "13px", color: "#62746a", margin: "0 0 24px" }}>
              Provide accurate vegetable information, unit, and inventory stock to ensure seamless customer orders.
            </p>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: "#fef2f2",
                  color: "#dc2626",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  marginBottom: "20px",
                }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Product Photo */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#063c32", marginBottom: "8px" }}>
                  Product Photo
                </label>

                {imageUrl ? (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "200px",
                      borderRadius: "14px",
                      overflow: "hidden",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        backgroundColor: "rgba(220, 38, 38, 0.9)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Trash2 size={14} /> Remove Photo
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <label
                      style={{
                        border: "2px dashed #cbd5e1",
                        borderRadius: "14px",
                        padding: "32px 20px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        cursor: "pointer",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <UploadCloud size={32} color="#16835b" />
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#16835b" }}>
                        Click to Upload Vegetable Photo
                      </span>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowPresets(!showPresets)}
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 700,
                        color: "#16835b",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                      }}
                    >
                      {showPresets ? "Hide preset vegetable images" : "Or choose from preset farm harvest images"}
                    </button>

                    {showPresets && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                        {PRESET_VEGETABLE_IMAGES.map((preset) => (
                          <div
                            key={preset.label}
                            onClick={() => setImageUrl(preset.url)}
                            style={{
                              padding: "8px",
                              borderRadius: "10px",
                              border: "1px solid #cbd5e1",
                              cursor: "pointer",
                              textAlign: "center",
                              fontSize: "12px",
                              fontWeight: 700,
                              backgroundColor: "#f8fafc",
                            }}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              style={{ width: "100%", height: "60px", objectFit: "cover", borderRadius: "6px" }}
                            />
                            <span style={{ display: "block", marginTop: "6px", color: "#334155" }}>{preset.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Product Name & Category */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Vegetable Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Fresh Red Tomatoes"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Category *
                  </label>
                  <select
                    value={categoryId || ""}
                    onChange={(e) => setCategoryId(Number(e.target.value) || undefined)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="">Select Category...</option>
                    {(categoriesQuery.data ?? []).map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit & Price & Stock */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Unit *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="1 KG">1 KG</option>
                    <option value="500 G">500 G</option>
                    <option value="250 G">250 G</option>
                    <option value="1 Bunch">1 Bunch</option>
                    <option value="1 Piece">1 Piece</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Your Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="40"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Stock Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="50"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                    }}
                  />
                </div>
              </div>

              {/* MOQ & Availability */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Minimum Order Qty (MOQ)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={moq}
                    onChange={(e) => setMoq(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Store Status
                  </label>
                  <select
                    value={isAvailable ? "yes" : "no"}
                    onChange={(e) => setIsAvailable(e.target.value === "yes")}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="yes">Active &amp; Ready for Orders</option>
                    <option value="no">Temporarily Inactive</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Product Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fresh harvest from Solapur soil, hand-picked daily..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <Link
                  href="/seller/products"
                  style={{
                    padding: "11px 22px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#64748b",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "10px",
                    textDecoration: "none",
                  }}
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  style={{
                    padding: "11px 28px",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    color: "#ffffff",
                    backgroundColor: addMutation.isPending ? "#94a3b8" : "#16835b",
                    border: "none",
                    borderRadius: "10px",
                    cursor: addMutation.isPending ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(22, 131, 91, 0.25)",
                  }}
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Publishing Listing...
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Publish Vegetable
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

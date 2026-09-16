"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Check,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { addSellerProduct, AddProductInput } from "@/lib/api/seller";
import { getCategories } from "@/lib/api/categories";
import { getErrorMessage } from "@/lib/api/client";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_VEGETABLE_IMAGES = [
  { label: "Tomatoes", url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80" },
  { label: "Potatoes", url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80" },
  { label: "Onions", url: "https://images.unsplash.com/photo-1508747703725-719777637510?w=600&auto=format&fit=crop&q=80" },
  { label: "Spinach", url: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80" },
  { label: "Carrots", url: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80" },
  { label: "Cauliflower", url: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80" },
];

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
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
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const handleClose = () => {
    setProductName("");
    setPrice("40");
    setStockQuantity("50");
    setDescription("");
    setImageUrl("");
    setError(null);
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use browser FileReader for immediate local preview
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          border: "1px solid #e1e8e2",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e1e8e2",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#063c32", margin: 0 }}>
              + Add Product Listing
            </h2>
            <p style={{ fontSize: "12px", color: "#62746a", margin: "2px 0 0" }}>
              Publish fresh vegetables directly to the Solapur customer marketplace.
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#f1f5f9",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Image Upload & Preview Section */}
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#063c32", marginBottom: "6px" }}>
                Product Photo
              </label>

              {imageUrl ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "160px",
                    borderRadius: "12px",
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
                      top: "10px",
                      right: "10px",
                      backgroundColor: "rgba(220, 38, 38, 0.9)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label
                    style={{
                      border: "2px dashed #cbd5e1",
                      borderRadius: "12px",
                      padding: "24px 16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      backgroundColor: "#f8fafc",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <UploadCloud size={28} color="#16835b" />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#16835b" }}>
                      Choose Photo From Gallery or Camera
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>PNG, JPG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setShowPresets(!showPresets)}
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#16835b",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {showPresets ? "Hide preset vegetable images" : "Select from preset farm images"}
                    </button>
                  </div>

                  {showPresets && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                      {PRESET_VEGETABLE_IMAGES.map((preset) => (
                        <div
                          key={preset.label}
                          onClick={() => setImageUrl(preset.url)}
                          style={{
                            padding: "6px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            cursor: "pointer",
                            textAlign: "center",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: "#f8fafc",
                          }}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            style={{ width: "100%", height: "48px", objectFit: "cover", borderRadius: "4px" }}
                          />
                          <span style={{ display: "block", marginTop: "4px", color: "#334155" }}>{preset.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product Name & Category */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Fresh Red Tomatoes"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Category *
                </label>
                <select
                  value={categoryId || ""}
                  onChange={(e) => setCategoryId(Number(e.target.value) || undefined)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    borderRadius: "8px",
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Unit *
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    borderRadius: "8px",
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
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Your Price (₹) *
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
                    padding: "8px 12px",
                    fontSize: "13px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Stock Quantity *
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
                    padding: "8px 12px",
                    fontSize: "13px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>
            </div>

            {/* MOQ & Availability */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
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
                    padding: "8px 12px",
                    fontSize: "13px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Store Availability
                </label>
                <select
                  value={isAvailable ? "yes" : "no"}
                  onChange={(e) => setIsAvailable(e.target.value === "yes")}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option value="yes">Available for Sale</option>
                  <option value="no">Temporarily Unavailable</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fresh hybrid tomatoes with high nutritional value and farm freshness..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#64748b",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={addMutation.isPending}
                style={{
                  padding: "10px 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#ffffff",
                  backgroundColor: addMutation.isPending ? "#94a3b8" : "#16835b",
                  border: "none",
                  borderRadius: "10px",
                  cursor: addMutation.isPending ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(22, 131, 91, 0.25)",
                }}
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Publishing...
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Publish Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

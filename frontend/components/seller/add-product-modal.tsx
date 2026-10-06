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
  Sparkles,
} from "lucide-react";
import { addSellerProduct, AddProductInput } from "@/lib/api/seller";
import { getCategories } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
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

const PRESET_FRUIT_IMAGES = [
  { label: "Apples", url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80" },
  { label: "Bananas", url: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80" },
  { label: "Oranges", url: "https://images.unsplash.com/photo-1547514701-42782101795e?w=600&auto=format&fit=crop&q=80" },
  { label: "Grapes", url: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600&auto=format&fit=crop&q=80" },
  { label: "Pomegranates", url: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80" },
  { label: "Watermelon", url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80" },
];

const VEGETABLE_CATEGORY_IDS = [1, 3, 4, 50, 51, 52, 53, 54, 55];
const FRUIT_CATEGORY_IDS = [2, 56, 57, 58, 59, 60];

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
  const queryClient = useQueryClient();

  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(null);
  const [productType, setProductType] = useState<"VEGETABLE" | "FRUIT">("VEGETABLE");
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [unit, setUnit] = useState("1 KG");
  const [price, setPrice] = useState("40");
  const [stockQuantity, setStockQuantity] = useState("50");
  const [moq, setMoq] = useState("1");
  const [isAvailable, setIsAvailable] = useState(true);
  const [addedDate, setAddedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [addedTime, setAddedTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [harvestDate, setHarvestDate] = useState("");
  const [harvestTime, setHarvestTime] = useState("");
  const [storageCondition, setStorageCondition] = useState("Naturally Ventilated");
  const [origin, setOrigin] = useState("Solapur Local Farm");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const masterCatalogQuery = useQuery({
    queryKey: ["master-catalog-products-modal"],
    queryFn: () => getProducts({ pageSize: 100 }),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const handleSelectMasterProduce = (productId: number | "") => {
    if (!productId) {
      setSelectedCatalogId(null);
      return;
    }
    const found = masterCatalogQuery.data?.items?.find((p) => p.id === Number(productId));
    if (!found) return;
    setSelectedCatalogId(found.id);
    setProductName(found.name);
    if (found.category_id) setCategoryId(found.category_id);
    else if (found.category?.id) setCategoryId(found.category.id);
    setUnit(found.unit || "1 KG");
    if (found.description) setDescription(found.description);
    if (found.images?.[0]?.image_url) setImageUrl(found.images[0].image_url);
    if (found.market_price) {
      setPrice(String(found.market_price.reference_price));
    }
  };

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
    setHarvestDate("");
    setHarvestTime("");
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

  const handleProductNameChange = (newName: string) => {
    setProductName(newName);
    const lower = newName.toLowerCase().trim();
    if (!lower) return;

    const fruitKeywords = ["apple", "banana", "orange", "grape", "mango", "pomegranate", "watermelon", "melon", "papaya", "guava", "chikoo", "pineapple", "strawberry", "kiwi", "dragon fruit", "pear", "plum", "citrus", "berry", "seb", "kela", "santra", "anar", "angoor"];
    const vegKeywords = ["tomato", "potato", "onion", "spinach", "palak", "methi", "coriander", "cabbage", "cauliflower", "gourd", "karela", "dudhi", "chilli", "mirchi", "cucumber", "ginger", "garlic", "peas", "matar", "beans", "corn", "carrot", "radish", "beetroot", "mushroom", "batata", "aloo", "kanda", "pyaz"];

    const isF = fruitKeywords.some((k) => lower.includes(k));
    const isV = vegKeywords.some((k) => lower.includes(k));

    if (isF && !isV) {
      setProductType("FRUIT");
      if (lower.includes("orange") || lower.includes("santra") || lower.includes("citrus")) setCategoryId(56);
      else if (lower.includes("banana") || lower.includes("mango") || lower.includes("pomegranate") || lower.includes("papaya")) setCategoryId(57);
      else if (lower.includes("watermelon") || lower.includes("melon")) setCategoryId(58);
      else if (lower.includes("grape") || lower.includes("strawberr") || lower.includes("berr")) setCategoryId(59);
      else if (lower.includes("apple") || lower.includes("kiwi") || lower.includes("dragon")) setCategoryId(60);
      else setCategoryId(2);
    } else if (isV && !isF) {
      setProductType("VEGETABLE");
      if (lower.includes("spinach") || lower.includes("palak") || lower.includes("methi") || lower.includes("coriander")) setCategoryId(3);
      else if (lower.includes("potato") || lower.includes("onion") || lower.includes("carrot") || lower.includes("radish") || lower.includes("beetroot")) setCategoryId(4);
      else if (lower.includes("tomato") || lower.includes("cucumber") || lower.includes("chilli") || lower.includes("pepper")) setCategoryId(50);
      else if (lower.includes("gourd") || lower.includes("karela") || lower.includes("dudhi")) setCategoryId(51);
      else if (lower.includes("pea") || lower.includes("matar") || lower.includes("bean")) setCategoryId(52);
      else if (lower.includes("cabbage") || lower.includes("cauliflower") || lower.includes("broccoli")) setCategoryId(53);
      else if (lower.includes("ginger") || lower.includes("garlic") || lower.includes("lemon")) setCategoryId(54);
      else setCategoryId(1);
    }
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

    const effectiveCatId = categoryId || (productType === "FRUIT" ? 2 : 1);

    // Validate category does not conflict with productType
    if (productType === "VEGETABLE" && FRUIT_CATEGORY_IDS.includes(effectiveCatId)) {
      setError("Invalid classification: A vegetable cannot belong to a fruit category.");
      return;
    }
    if (productType === "FRUIT" && VEGETABLE_CATEGORY_IDS.includes(effectiveCatId)) {
      setError("Invalid classification: A fruit cannot belong to a vegetable category.");
      return;
    }

    addMutation.mutate({
      product_id: selectedCatalogId || undefined,
      product_name: productName.trim(),
      product_type: productType,
      category_id: effectiveCatId,
      unit: unit,
      price: numPrice,
      stock_quantity: numStock,
      minimum_order_quantity: parseFloat(moq) || 1,
      is_available: isAvailable,
      description: description.trim() || undefined,
      image_url: imageUrl || undefined,
      added_date: addedDate || undefined,
      added_time: addedTime ? `${addedTime}:00` : undefined,
      harvest_date: harvestDate || undefined,
      harvest_time: harvestTime ? `${harvestTime}:00` : undefined,
      storage_condition: storageCondition || undefined,
      origin: origin.trim() || undefined,
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
            {/* Quick Select from Master Indian Produce Catalog */}
            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: "#f0fdf4",
                border: "1.5px solid #bbf7d0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <Sparkles size={16} color="#16a34a" />
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#166534" }}>
                  Quick Select from Master Produce Catalog (55 Items)
                </span>
              </div>
              <select
                value={selectedCatalogId || ""}
                onChange={(e) => handleSelectMasterProduce(e.target.value ? Number(e.target.value) : "")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: "1px solid #86efac",
                  backgroundColor: "#ffffff",
                  color: "#063c32",
                }}
              >
                <option value="">-- Choose Master Produce (or enter custom below) --</option>
                {(masterCatalogQuery.data?.items ?? []).map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} ({prod.unit}) {prod.market_price ? `• Mandi Avg ₹${prod.market_price.reference_price}` : ""}
                  </option>
                ))}
              </select>

              {selectedCatalogId && (
                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: "#166534",
                  }}
                >
                  <span>✓ Linked to #{selectedCatalogId}</span>
                  {masterCatalogQuery.data?.items?.find((p) => p.id === selectedCatalogId)?.market_price && (
                    <span
                      style={{
                        backgroundColor: "#dcfce7",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        border: "1px solid #86efac",
                      }}
                    >
                      Mandi: ₹{masterCatalogQuery.data?.items?.find((p) => p.id === selectedCatalogId)?.market_price?.suggested_range_min} - ₹{masterCatalogQuery.data?.items?.find((p) => p.id === selectedCatalogId)?.market_price?.suggested_range_max}
                    </span>
                  )}
                </div>
              )}
            </div>

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
                      {showPresets ? `Hide preset ${productType.toLowerCase()} images` : `Select from preset ${productType.toLowerCase()} images`}
                    </button>
                  </div>

                  {showPresets && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                      {(productType === "VEGETABLE" ? PRESET_VEGETABLE_IMAGES : PRESET_FRUIT_IMAGES).map((preset) => (
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

            {/* Product Type Selector */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                Product Type *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setProductType("VEGETABLE");
                    if (categoryId && FRUIT_CATEGORY_IDS.includes(categoryId)) {
                      setCategoryId(undefined);
                    }
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    border: productType === "VEGETABLE" ? "2px solid #16835b" : "1px solid #cbd5e1",
                    backgroundColor: productType === "VEGETABLE" ? "#f0fdf4" : "#ffffff",
                    color: productType === "VEGETABLE" ? "#166534" : "#64748b",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  🥦 VEGETABLE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductType("FRUIT");
                    if (categoryId && VEGETABLE_CATEGORY_IDS.includes(categoryId)) {
                      setCategoryId(undefined);
                    }
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    border: productType === "FRUIT" ? "2px solid #ea580c" : "1px solid #cbd5e1",
                    backgroundColor: productType === "FRUIT" ? "#fff7ed" : "#ffffff",
                    color: productType === "FRUIT" ? "#c2410c" : "#64748b",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  🍎 FRUIT
                </button>
              </div>
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
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  placeholder={productType === "VEGETABLE" ? "e.g. Fresh Red Tomatoes" : "e.g. Royal Kashmiri Apples"}
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
                  Category ({productType === "VEGETABLE" ? "Vegetable Categories" : "Fruit Categories"}) *
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
                  {(categoriesQuery.data ?? [])
                    .filter((cat: any) =>
                      productType === "VEGETABLE"
                        ? VEGETABLE_CATEGORY_IDS.includes(cat.id)
                        : FRUIT_CATEGORY_IDS.includes(cat.id)
                    )
                    .map((cat: any) => (
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

            {/* Freshness & Harvest Factual Details */}
            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#166534" }}>
                  🌱 Farm Freshness &amp; Harvest Timestamps
                </span>
                <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                  Calculated automatically by Vegito engine
                </span>
              </div>

              {/* Added Date and Added Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#166534", marginBottom: "4px" }}>
                    Listing / Added Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={addedDate}
                    onChange={(e) => setAddedDate(e.target.value)}
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
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#166534", marginBottom: "4px" }}>
                    Listing / Added Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={addedTime}
                    onChange={(e) => setAddedTime(e.target.value)}
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

              {/* Harvest Date and Harvest Time (Optional) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Harvest Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
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
                    Harvest Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={harvestTime}
                    onChange={(e) => setHarvestTime(e.target.value)}
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

              {/* Storage Condition & Farm Origin */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Storage Condition (Optional)
                  </label>
                  <select
                    value={storageCondition}
                    onChange={(e) => setStorageCondition(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "13px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="Naturally Ventilated">Naturally Ventilated</option>
                    <option value="Ambient / Room Temperature">Ambient / Room Temperature</option>
                    <option value="Cold Storage / Refrigerated">Cold Storage / Refrigerated</option>
                    <option value="Cool &amp; Dry Ventilated">Cool &amp; Dry Ventilated</option>
                    <option value="Hydro-Cooled">Hydro-Cooled</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Farm Origin (Optional)
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Solapur Local Farm"
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

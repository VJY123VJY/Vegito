"use client";

import React, { useState } from "react";
import { AlertCircle, X, CheckCircle2, Upload, Camera, Loader2 } from "lucide-react";
import { createComplaint } from "@/lib/api/complaints";
import { getErrorMessage } from "@/lib/api/client";

interface OrderComplaintModalProps {
  orderId: number;
  orderNumber?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COMPLAINT_TYPES = [
  { id: "ROTTEN_PRODUCT", label: "Rotten / Spoiled produce", icon: "🥬" },
  { id: "DAMAGED_PRODUCT", label: "Damaged / Crushed packaging", icon: "📦" },
  { id: "WRONG_QUANTITY", label: "Wrong quantity or weight", icon: "⚖️" },
  { id: "WRONG_PRODUCT", label: "Wrong product delivered", icon: "🔄" },
  { id: "MISSING_ITEM", label: "Missing item in basket", icon: "❌" },
  { id: "POOR_FRESHNESS", label: "Poor freshness / Stale produce", icon: "🌿" },
  { id: "OTHER", label: "Other issue", icon: "💬" },
];

export function OrderComplaintModal({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onSuccess,
}: OrderComplaintModalProps) {
  const [selectedType, setSelectedType] = useState<string>("ROTTEN_PRODUCT");
  const [description, setDescription] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the issue with your produce.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createComplaint({
        order_id: orderId,
        complaint_type: selectedType,
        description: description.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1800);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(6, 40, 32, 0.65)",
          backdropFilter: "blur(6px)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "460px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          border: "1px solid #dce8df",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
              Report Order Issue
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
              Order #{orderNumber || orderId} · Solapur Customer Support
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#f1f5f2",
              color: "#62746a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                color: "#16835b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 800, color: "#063c32" }}>
              Complaint Registered
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>
              Our support team has received your ticket and will contact you regarding a replacement or refund.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "12px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  fontSize: "12.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>
                What went wrong?
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {COMPLAINT_TYPES.map((t) => {
                  const isSelected = selectedType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedType(t.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "12px",
                        border: isSelected ? "1.5px solid #16835b" : "1px solid #e2e8e5",
                        backgroundColor: isSelected ? "#ecfdf5" : "#ffffff",
                        color: "#063c32",
                        fontSize: "13px",
                        fontWeight: isSelected ? 800 : 500,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>{t.icon}</span>
                      <span style={{ flex: 1 }}>{t.label}</span>
                      {isSelected && <span style={{ color: "#16835b", fontWeight: 800 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                Describe the problem
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what was wrong with the items received..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1.5px solid #d1d5db",
                  fontSize: "13.5px",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>

            {/* Photo upload preview */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                Attach Photo (Optional)
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1.5px dashed #cbd5e1",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                <Camera size={18} />
                <span>{previewImage ? "Change Photo" : "Upload Produce Photo"}</span>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              </label>

              {previewImage && (
                <div style={{ marginTop: "8px" }}>
                  <img
                    src={previewImage}
                    alt="Complaint Preview"
                    style={{ width: "100%", maxHeight: "140px", objectFit: "cover", borderRadius: "10px" }}
                  />
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>
                    ℹ️ Photo preview attached. Note: Backend file upload service is required for cloud storage; ticket description submitted.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "13px",
                borderRadius: "14px",
                backgroundColor: "#063c32",
                color: "#ffffff",
                border: "none",
                fontSize: "14px",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(6, 60, 50, 0.2)",
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              <span>Submit Complaint</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

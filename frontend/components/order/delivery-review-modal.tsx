"use client";

import React, { useState } from "react";
import { Star, X, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { createReview } from "@/lib/api/reviews";
import { getErrorMessage } from "@/lib/api/client";

interface DeliveryReviewModalProps {
  orderId: number;
  orderNumber?: string;
  partnerName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REVIEW_TAGS = [
  "⚡ On Time Delivery",
  "😊 Courteous & Polite",
  "📦 Handled Produce Carefully",
  "🥬 Super Fresh Quality",
  "🛡️ Accurate Order Items",
];

export function DeliveryReviewModal({
  orderId,
  orderNumber,
  partnerName = "Delivery Partner",
  isOpen,
  onClose,
  onSuccess,
}: DeliveryReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fullComment = [
      selectedTags.join(", "),
      comment.trim(),
    ].filter(Boolean).join(" — ");

    try {
      await createReview({
        order_id: orderId,
        target_type: "DELIVERY_PARTNER",
        delivery_rating: rating,
        seller_rating: rating,
        rating,
        comment: fullComment || "Great delivery service!",
      });
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1600);
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
          maxWidth: "440px",
          padding: "26px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          border: "1px solid #dce8df",
          textAlign: "center",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
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

        {submitted ? (
          <div style={{ padding: "24px 10px" }}>
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
            <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
              Thank You for Rating!
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>
              Your feedback helps {partnerName} and our Solapur farmers keep produce quality high.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <div style={{ fontSize: "28px", marginBottom: "4px" }}>🎉</div>
              <h3 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                How was your delivery?
              </h3>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#62746a" }}>
                Order #{orderNumber || orderId} delivered by <strong>{partnerName}</strong>
              </p>
            </div>

            {/* Star Rating */}
            <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      transition: "transform 0.1s",
                      transform: (hoverRating || rating) >= star ? "scale(1.15)" : "scale(1)",
                    }}
                  >
                    <Star
                      size={32}
                      fill={filled ? "#f59e0b" : "transparent"}
                      color={filled ? "#f59e0b" : "#cbd5e1"}
                    />
                  </button>
                );
              })}
            </div>

            {/* Quick feedback tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
              {REVIEW_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "20px",
                      border: isSelected ? "1.5px solid #16835b" : "1px solid #dce8df",
                      backgroundColor: isSelected ? "#ecfdf5" : "#f8faf8",
                      color: isSelected ? "#16835b" : "#475569",
                      fontSize: "12px",
                      fontWeight: isSelected ? 800 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave a short note for the delivery partner..."
              rows={2}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1.5px solid #d1d5db",
                fontSize: "13px",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

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
              <span>Submit Rating</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

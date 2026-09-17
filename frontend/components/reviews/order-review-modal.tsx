"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Star,
  CheckCircle2,
  ExternalLink,
  Store,
  Truck,
  Package,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { submitOrderReview, getReviewConfig } from "@/lib/api/reviews";
import { getErrorMessage } from "@/lib/api/client";
import type { OrderDetail } from "@/lib/api/orders";

interface OrderReviewModalProps {
  order: OrderDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StarPickerProps {
  rating: number;
  onChange: (val: number) => void;
  label?: string;
}

function StarPicker({ rating, onChange, label }: StarPickerProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} aria-label={label || "Star Rating"}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(null)}
          onFocus={() => setHoverRating(star)}
          onBlur={() => setHoverRating(null)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "3px",
            color: star <= displayRating ? "#f59e0b" : "#d1d5db",
            transition: "transform 0.15s ease, color 0.15s ease",
            transform: star <= displayRating ? "scale(1.15)" : "scale(1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Star
            size={24}
            fill={star <= displayRating ? "#f59e0b" : "transparent"}
            stroke={star <= displayRating ? "#f59e0b" : "#9ca3af"}
            strokeWidth={1.75}
          />
        </button>
      ))}
      {rating > 0 && (
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#92400e", marginLeft: "4px" }}>
          {rating}/5
        </span>
      )}
    </div>
  );
}

export function OrderReviewModal({ order, isOpen, onClose, onSuccess }: OrderReviewModalProps) {
  const queryClient = useQueryClient();

  const [sellerRating, setSellerRating] = useState<number>(0);
  const [sellerComment, setSellerComment] = useState("");

  const [deliveryRating, setDeliveryRating] = useState<number>(0);
  const [deliveryComment, setDeliveryComment] = useState("");

  const [productRatings, setProductRatings] = useState<Record<number, number>>({});
  const [productComments, setProductComments] = useState<Record<number, string>>({});

  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ["review-config"],
    queryFn: getReviewConfig,
    staleTime: 1000 * 60 * 30,
  });

  const reviewMutation = useMutation({
    mutationFn: submitOrderReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", String(order.id)] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-review-status", order.id] });
      setSubmitted(true);
      onSuccess?.();
    },
    onError: (err) => {
      setErrorMessage(getErrorMessage(err));
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const hasProductRating = Object.values(productRatings).some((r) => r > 0);
    if (sellerRating === 0 && deliveryRating === 0 && !hasProductRating) {
      setErrorMessage("Please select at least one rating (Produce, Shop, or Delivery Partner) from 1 to 5.");
      return;
    }

    const productReviewsList = Object.entries(productRatings)
      .filter(([_, r]) => r > 0)
      .map(([prodId, r]) => ({
        product_id: Number(prodId),
        rating: r,
        comment: productComments[Number(prodId)] || undefined,
      }));

    reviewMutation.mutate({
      order_id: order.id,
      seller_rating: sellerRating > 0 ? sellerRating : undefined,
      seller_comment: sellerComment.trim() ? sellerComment.trim() : undefined,
      delivery_rating: deliveryRating > 0 ? deliveryRating : undefined,
      delivery_comment: deliveryComment.trim() ? deliveryComment.trim() : undefined,
      product_reviews: productReviewsList.length > 0 ? productReviewsList : undefined,
    });
  };

  const googleUrl =
    configQuery.data?.google_review_url ||
    process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ||
    "https://g.page/r/vegito-solapur/review";

  const handleOpenGoogleReview = () => {
    window.open(googleUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(6, 60, 50, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f1f5f2",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            backgroundColor: "#ffffff",
            zIndex: 10,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
              How was your Vegito experience?
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
              Order #{order.order_number} · Delivered
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              color: "#62746a",
              borderRadius: "8px",
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {submitted ? (
            /* Post-submission Thank You + Google Review CTA */
            <div style={{ textAlign: "center", padding: "16px 8px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: "#064e3b" }}>
                Thanks for reviewing Vegito! ❤️
              </h4>
              <p style={{ margin: "0 0 24px", fontSize: "13.5px", color: "#4b5563" }}>
                Your feedback helps our local farmers and delivery partners continuously improve fresh produce delivery across Solapur.
              </p>

              {/* Google Review Card */}
              <div
                style={{
                  backgroundColor: "#fffbeb",
                  border: "1.5px solid #fde68a",
                  borderRadius: "16px",
                  padding: "20px",
                  marginBottom: "24px",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "18px" }}>⭐</span>
                  <strong style={{ fontSize: "14.5px", color: "#92400e" }}>
                    Want to help more customers discover us?
                  </strong>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#78350f" }}>
                  Share your experience on Google Business to support local organic farmers in our community.
                </p>
                <button
                  type="button"
                  onClick={handleOpenGoogleReview}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    backgroundColor: "#1e40af",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(30, 64, 175, 0.25)",
                  }}
                >
                  <ExternalLink size={15} /> Review Vegito on Google
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#063c32",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {errorMessage && (
                <div
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    color: "#991b1b",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Products Review Section */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Package size={17} color="#16835b" />
                  <span style={{ fontWeight: 800, fontSize: "14px", color: "#111827" }}>
                    1. 🥬 Produce & Vegetable Quality
                  </span>
                </div>

                {order.items && order.items.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {order.items.map((item) => {
                      const pId = item.id; // unique per item
                      const currentPVal = productRatings[pId] || 0;
                      return (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "6px",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            <strong style={{ fontSize: "13px", color: "#1f2937" }}>
                              {item.product_name} ({item.quantity} {item.unit})
                            </strong>
                            <StarPicker
                              rating={currentPVal}
                              onChange={(val) => setProductRatings({ ...productRatings, [pId]: val })}
                              label={`Rating for ${item.product_name}`}
                            />
                          </div>
                          {currentPVal > 0 && (
                            <input
                              type="text"
                              placeholder="Optional comments on freshness, taste..."
                              value={productComments[pId] || ""}
                              onChange={(e) =>
                                setProductComments({ ...productComments, [pId]: e.target.value })
                              }
                              style={{
                                width: "100%",
                                padding: "7px 10px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                fontSize: "12px",
                                marginTop: "4px",
                                outline: "none",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "12.5px", color: "#6b7280" }}>
                    Produce items in order.
                  </p>
                )}
              </div>

              {/* 2. Shop / Seller Review Section */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Store size={17} color="#059669" />
                  <span style={{ fontWeight: 800, fontSize: "14px", color: "#111827" }}>
                    2. 🏪 Shop & Packaging ({order.shop_name || "Vegito Fresh Farm"})
                  </span>
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <StarPicker
                    rating={sellerRating}
                    onChange={setSellerRating}
                    label="Rating for Shop"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="How was the packing and overall produce packaging?"
                  value={sellerComment}
                  onChange={(e) => setSellerComment(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "12.5px",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* 3. Delivery Partner Review Section */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Truck size={17} color="#2563eb" />
                  <span style={{ fontWeight: 800, fontSize: "14px", color: "#111827" }}>
                    3. 🚚 Delivery Partner
                  </span>
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <StarPicker
                    rating={deliveryRating}
                    onChange={setDeliveryRating}
                    label="Rating for Delivery Partner"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Was the delivery timely, professional, and courteous?"
                  value={deliveryComment}
                  onChange={(e) => setDeliveryComment(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "12.5px",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={reviewMutation.isPending}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 24px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#063c32",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(6, 60, 50, 0.25)",
                    opacity: reviewMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {reviewMutation.isPending ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Submitting...
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

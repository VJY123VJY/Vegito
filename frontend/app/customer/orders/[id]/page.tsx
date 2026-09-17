"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, RotateCcw, Star, CheckCircle2, ExternalLink } from "lucide-react";
import { getOrder, reorder } from "@/lib/api/orders";
import { getOrderReviewStatus, getReviewConfig } from "@/lib/api/reviews";
import { OrderReviewModal } from "@/components/reviews/order-review-modal";
import { getErrorMessage } from "@/lib/api/client";
import { useState } from "react";

const steps = ["NEW", "ACCEPTED", "PACKING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? "";
  const client = useQueryClient();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const order = useQuery({ queryKey: ["order", orderId], queryFn: () => getOrder(orderId), enabled: Boolean(orderId), refetchInterval: (query) => query.state.data?.status === "DELIVERED" ? false : 15000 });
  const reviewStatus = useQuery({
    queryKey: ["order-review-status", orderId],
    queryFn: () => getOrderReviewStatus(Number(orderId)),
    enabled: Boolean(orderId && order.data?.status === "DELIVERED"),
  });
  const reviewConfig = useQuery({
    queryKey: ["review-config"],
    queryFn: getReviewConfig,
    staleTime: 1000 * 60 * 30,
  });

  const repeat = useMutation({ mutationFn: () => reorder(Number(orderId)), onSuccess: () => client.invalidateQueries({ queryKey: ["cart"] }) });
  if (order.isLoading) return <main className="simple-page"><p className="helper">Loading order...</p></main>;
  if (order.isError || !order.data) return <main className="simple-page"><Link className="back-link" href="/customer/orders"><ArrowLeft size={16} /> Orders</Link><p className="form-error">{order.isError ? getErrorMessage(order.error) : "Order not found."}</p></main>;
  const data = order.data;
  const normalizedStatus =
    data.status === "SELLER_ACCEPTED" ? "ACCEPTED" :
    data.status === "PREPARING" ? "PACKING" :
    data.status === "READY_FOR_PICKUP" ? "READY" :
    data.status === "PICKED_UP" ? "READY" :
    data.status;
  const currentIndex = steps.indexOf(normalizedStatus);

  const isDelivered = data.status === "DELIVERED";
  const hasReviewed = reviewStatus.data?.has_reviewed ?? false;

  const handleOpenGoogleReview = () => {
    const url = reviewConfig.data?.google_review_url || "https://g.page/r/vegito-solapur/review";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="simple-page">
      <Link className="back-link" href="/customer/orders"><ArrowLeft size={16} /> Orders</Link>
      <div className="order-title">
        <div><p className="section-kicker">ORDER DETAILS</p><h1>#{data.order_number}</h1></div>
        <span className="status-badge">{data.status.replaceAll("_", " ")}</span>
      </div>

      <section className="timeline">
        {steps.map((step, index) => (
          <div className={index <= currentIndex ? "timeline-step active" : "timeline-step"} key={step}>
            <span>{index <= currentIndex ? <Check size={14} /> : index + 1}</span>
            <b>{step.replaceAll("_", " ")}</b>
          </div>
        ))}
      </section>

      <section className="checkout-panel">
        <p className="section-kicker">ITEMS</p>
        {data.items.map((item) => (
          <div className="order-line" key={item.id}>
            <span>
              <b>{item.product_name}</b>
              <small>{item.quantity} {item.unit} x ₹{Number(item.unit_price).toFixed(2)}</small>
            </span>
            <strong>₹{Number(item.subtotal).toFixed(2)}</strong>
          </div>
        ))}
      </section>

      <section className="cart-total">
        <span>Subtotal <b>₹{Number(data.subtotal).toFixed(2)}</b></span>
        <span>Delivery <b>₹{Number(data.delivery_charge).toFixed(2)}</b></span>
        <span>Discount <b>-₹{Number(data.discount_amount).toFixed(2)}</b></span>
        <strong>Total <b>₹{Number(data.total_amount).toFixed(2)}</b></strong>
        <small>{data.address?.address_line1}, {data.address?.city} {data.address?.pincode}</small>
      </section>

      {/* Review Section for DELIVERED Orders */}
      {isDelivered && (
        <section
          style={{
            margin: "18px 0",
            padding: "18px 20px",
            backgroundColor: hasReviewed ? "#ecfdf5" : "#fffbeb",
            border: `1.5px solid ${hasReviewed ? "#a7f3d0" : "#fde68a"}`,
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {hasReviewed ? (
                  <CheckCircle2 size={20} color="#059669" />
                ) : (
                  <span style={{ fontSize: "18px" }}>⭐</span>
                )}
                <strong style={{ fontSize: "15px", color: hasReviewed ? "#064e3b" : "#92400e" }}>
                  {hasReviewed ? "Order Reviewed ✓" : "How was your Vegito experience?"}
                </strong>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: hasReviewed ? "#047857" : "#78350f" }}>
                {hasReviewed
                  ? "Thank you for rating your produce, shop, and delivery partner!"
                  : "Rate your produce quality, seller packaging, and delivery partner."}
              </p>
            </div>

            {hasReviewed ? (
              <button
                type="button"
                onClick={handleOpenGoogleReview}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  backgroundColor: "#ffffff",
                  color: "#1e40af",
                  border: "1.5px solid #bfdbfe",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                <ExternalLink size={14} /> Review on Google
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  backgroundColor: "#063c32",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(6, 60, 50, 0.2)",
                }}
              >
                <Star size={14} fill="#f59e0b" color="#f59e0b" /> Rate Order
              </button>
            )}
          </div>

          {/* If reviewed, show badge summary of ratings */}
          {hasReviewed && reviewStatus.data && (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
              {reviewStatus.data.seller_rating && (
                <span
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#065f46",
                    border: "1px solid #d1fae5",
                  }}
                >
                  🏪 Shop: {reviewStatus.data.seller_rating}★
                </span>
              )}
              {reviewStatus.data.delivery_rating && (
                <span
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#065f46",
                    border: "1px solid #d1fae5",
                  }}
                >
                  🚚 Delivery: {reviewStatus.data.delivery_rating}★
                </span>
              )}
              {reviewStatus.data.reviewed_product_ids.length > 0 && (
                <span
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#065f46",
                    border: "1px solid #d1fae5",
                  }}
                >
                  🥬 {reviewStatus.data.reviewed_product_ids.length} Produce Item(s) Rated
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {/* Track Live Delivery */}
      {data.status !== "CANCELLED" && data.status !== "REJECTED" ? (
        <section style={{ margin: "16px 0" }}>
          <Link
            href={`/customer/orders/${data.id}/track`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              textDecoration: "none",
              backgroundColor: "#063c32",
              color: "#ffffff",
              padding: "14px 20px",
              borderRadius: "12px",
              fontWeight: 800,
              fontSize: "14px",
              boxShadow: "0 4px 14px rgba(6, 60, 50, 0.2)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "18px" }}>🚴</span> Track Live Delivery on Map
          </Link>
        </section>
      ) : null}

      {data.delivery_otp ? (
        <section className="otp-card">
          <b>Delivery OTP</b>
          <span>Share this code with your delivery partner when the order arrives.</span>
          <strong>{data.delivery_otp}</strong>
        </section>
      ) : null}

      {data.status === "DELIVERED" ? (
        <button className="primary-action" disabled={repeat.isPending} onClick={() => repeat.mutate()}>
          <RotateCcw size={16} /> {repeat.isPending ? "Adding..." : "Reorder available items"}
        </button>
      ) : null}

      {repeat.isError ? <p className="form-error">{getErrorMessage(repeat.error)}</p> : null}

      {/* Review Modal */}
      <OrderReviewModal
        order={data}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSuccess={() => reviewStatus.refetch()}
      />
    </main>
  );
}


"use client";

import React from "react";
import Link from "next/link";
import { Package, Clock, ChevronRight, Truck, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { Order } from "@/lib/api/orders";

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  onReorder?: (orderId: number) => void;
  showTrackButton?: boolean;
}

export function OrderCard({
  order,
  onClick,
  onReorder,
  showTrackButton = true,
}: OrderCardProps) {
  const isOutForDelivery = order.status === "OUT_FOR_DELIVERY";
  const isDelivered = order.status === "DELIVERED" || order.status === "COMPLETED";
  const isCancelled = order.status === "CANCELLED" || order.status === "REJECTED";

  const formattedDate = order.placed_at || order.created_at
    ? new Date(order.placed_at || order.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <article
      onClick={onClick}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        border: order.is_urgent ? "1.5px solid #f87171" : "1px solid #e1e8e2",
        padding: "18px 20px",
        boxShadow: "0 2px 10px rgba(6, 60, 50, 0.04)",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {/* Top row: Order # & Status Badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              backgroundColor: isOutForDelivery ? "#e9f6ee" : isDelivered ? "#f0fdf4" : "#f4f7f4",
              color: isOutForDelivery ? "#16835b" : isDelivered ? "#16835b" : "#4a5a51",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isOutForDelivery ? <Truck size={18} /> : isDelivered ? <CheckCircle2 size={18} /> : <Package size={18} />}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "14.5px", fontWeight: 800, color: "#063c32" }}>
              #{order.order_number}
            </h4>
            <span style={{ fontSize: "11.5px", color: "#62746a" }}>
              {formattedDate}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {order.is_urgent && (
            <span
              style={{
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                fontSize: "11px",
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: "8px",
                border: "1px solid #fecaca",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              🔥 Urgent
            </span>
          )}
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Middle row: Items count & Total Amount */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          backgroundColor: "#f8faf8",
          borderRadius: "14px",
        }}
      >
        <span style={{ fontSize: "13px", color: "#4a5a51", fontWeight: 600 }}>
          {order.items_count ? `${order.items_count} items` : "Farm Produce Order"} · {order.payment_method}
        </span>
        <span style={{ fontSize: "15px", fontWeight: 800, color: "#063c32" }}>
          ₹{Number(order.total_amount).toFixed(0)}
        </span>
      </div>

      {/* Bottom action row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        {isOutForDelivery && showTrackButton ? (
          <Link
            href={`/customer/orders/${order.id}/track`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "12px",
              backgroundColor: "#16835b",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(22, 131, 91, 0.2)",
            }}
          >
            <Truck size={15} />
            <span>Track Live Delivery</span>
          </Link>
        ) : (
          <span style={{ fontSize: "12px", color: "#62746a" }}>
            {order.customer_name ? `Customer: ${order.customer_name}` : "Tap for details"}
          </span>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isDelivered && onReorder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReorder(order.id);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "10px",
                backgroundColor: "#e9f6ee",
                color: "#16835b",
                border: "1px solid #c7e3d2",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={13} />
              <span>Buy Again</span>
            </button>
          )}

          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: "#f4f7f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#62746a",
            }}
          >
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </article>
  );
}
export default OrderCard;

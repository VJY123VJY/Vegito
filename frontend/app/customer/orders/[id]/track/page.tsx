"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Clock, MapPin, Store, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import { getOrder } from "@/lib/api/orders";
import { getStoredToken } from "@/lib/api/auth";
import { subscribeToOrderTracking } from "@/lib/api/location";
import { MapboxTrackingMap, type LatLng } from "@/components/map/mapbox-tracking-map";
import { getErrorMessage } from "@/lib/api/client";

export default function CustomerOrderTrackPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = Number(params?.id ?? 0);

  const [deliveryCoords, setDeliveryCoords] = useState<LatLng | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "live" | "reconnecting" | "error">("connecting");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch complete order details
  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["order-track", orderId],
    queryFn: () => getOrder(orderId),
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "DELIVERED" || status === "CANCELLED" ? false : 10000;
    },
  });

  // Subscribe to WebSocket live GPS stream
  useEffect(() => {
    if (!orderId) return;

    const token = getStoredToken() || "";
    let cleanup: (() => void) | null = null;

    setWsStatus("connecting");
    cleanup = subscribeToOrderTracking(
      orderId,
      token,
      (data) => {
        setDeliveryCoords({ lat: data.latitude, lng: data.longitude });
        setWsStatus("live");
        setLastUpdated(new Date().toLocaleTimeString());
      },
      () => {
        setWsStatus("reconnecting");
      },
    );

    return () => {
      cleanup?.();
    };
  }, [orderId]);

  if (isLoading) {
    return (
      <main className="simple-page" style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
          <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontWeight: 700 }}>Connecting to order #{orderId}...</p>
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="simple-page" style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>
        <Link className="back-link" href="/customer/orders">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
        <div style={{ marginTop: "24px", padding: "24px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <AlertCircle size={20} />
            <strong style={{ fontSize: "15px" }}>Unable to load order tracking</strong>
          </div>
          <p style={{ margin: 0, fontSize: "13.5px" }}>
            {isError ? getErrorMessage(error) : "Order was not found or you do not have permission to view it."}
          </p>
        </div>
      </main>
    );
  }

  const isDelivered = order.status === "DELIVERED";
  const isOutForDelivery = order.status === "OUT_FOR_DELIVERY";
  const isReady = order.status === "READY" || order.status === "READY_FOR_PICKUP";
  const isPickedUp = order.status === "PICKED_UP";

  // Coordinates
  const shopCoords: LatLng | null = order.shop_latitude != null && order.shop_longitude != null
    ? { lat: Number(order.shop_latitude), lng: Number(order.shop_longitude) }
    : null;

  const customerCoords: LatLng | null = order.customer_latitude != null && order.customer_longitude != null
    ? { lat: Number(order.customer_latitude), lng: Number(order.customer_longitude) }
    : order.delivery_latitude != null && order.delivery_longitude != null
    ? { lat: Number(order.delivery_latitude), lng: Number(order.delivery_longitude) }
    : null;

  const partnerName = order.delivery_partner_name || "Delivery Partner";
  const shopName = order.shop_name || "Vegito Fresh Farm";

  return (
    <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "20px 16px 48px", fontFamily: "inherit" }}>
      {/* Top Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <Link
          href={`/customer/orders/${order.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#063c32",
            textDecoration: "none",
            fontSize: "13.5px",
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={16} /> Order Details
        </Link>

        {/* Live Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {wsStatus === "live" ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                backgroundColor: "#ecfdf5",
                color: "#047857",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 800,
                border: "1px solid #a7f3d0",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  animation: "blink 1.2s ease infinite",
                }}
              />
              Live GPS
            </span>
          ) : wsStatus === "reconnecting" ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                backgroundColor: "#fffbeb",
                color: "#b45309",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                border: "1px solid #fde68a",
              }}
            >
              Reconnecting...
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Grid: Responsive Map + Order Tracking Panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Live Mapbox Map Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #e1e8e2",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(6, 60, 50, 0.06)",
          }}
        >
          {/* Status Header */}
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: isDelivered ? "#f0fdf4" : isOutForDelivery ? "#e9f6ee" : "#f8faf8",
              borderBottom: "1px solid #e1e8e2",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 800, color: "#62746a", letterSpacing: "0.5px" }}>
                ORDER #{order.order_number}
              </p>
              <h2 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                {isDelivered
                  ? "Delivered Successfully 🎉"
                  : isOutForDelivery
                  ? "Out for Delivery"
                  : isPickedUp
                  ? "Picked Up from Shop"
                  : isReady
                  ? "Ready for Dispatch"
                  : order.status.replace(/_/g, " ")}
              </h2>
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                padding: "6px 14px",
                borderRadius: "10px",
                backgroundColor: isDelivered ? "#dcfce7" : "#063c32",
                color: isDelivered ? "#15803d" : "#ffffff",
              }}
            >
              {order.status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Map */}
          <div style={{ height: "460px", width: "100%" }}>
            <MapboxTrackingMap
              shopPosition={shopCoords}
              customerPosition={customerCoords}
              deliveryPosition={deliveryCoords || (isOutForDelivery ? deliveryCoords : null)}
              shopName={shopName}
              customerName={order.customer_name || "Your Doorstep"}
              partnerName={partnerName}
              orderStatus={order.status}
              height="460px"
              showStatusCard={true}
              interactive={true}
            />
          </div>

          {/* Map Footer status */}
          <div
            style={{
              padding: "12px 20px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #f1f5f2",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              color: "#62746a",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span>🏪 {shopName}</span>
              <span>🏠 Destination</span>
              {deliveryCoords && <span>🚴 Live Partner</span>}
            </div>
            {lastUpdated && <span>GPS updated: {lastUpdated}</span>}
          </div>
        </div>

        {/* Right Column: Order & Delivery Partner Information */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Delivery Partner Profile Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e1e8e2",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(6, 60, 50, 0.04)",
            }}
          >
            <p style={{ margin: "0 0 12px", fontSize: "11.5px", fontWeight: 800, color: "#62746a", letterSpacing: "0.5px" }}>
              DELIVERY PARTNER
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    backgroundColor: "#e9f6ee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  🚴
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                    {partnerName}
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Vegito Farm-Fresh Fleet · Verified
                  </p>
                </div>
              </div>

              {order.delivery_partner_phone && (
                <a
                  href={`tel:${order.delivery_partner_phone}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 16px",
                    backgroundColor: "#063c32",
                    color: "#ffffff",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <Phone size={14} /> Call Partner
                </a>
              )}
            </div>
          </div>

          {/* Delivery OTP Card */}
          {order.delivery_otp && (
            <div
              style={{
                borderRadius: "18px",
                border: "1.5px dashed #16835b",
                padding: "20px",
                backgroundColor: "#f7fbf8",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#16835b" }}>
                    DELIVERY VERIFICATION OTP
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Share this code with your rider when they reach your doorstep.
                  </p>
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    letterSpacing: "4px",
                    color: "#063c32",
                    backgroundColor: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1px solid #c4e8d3",
                  }}
                >
                  {order.delivery_otp}
                </div>
              </div>
            </div>
          )}

          {/* Delivery Address Details */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e1e8e2",
              padding: "20px",
            }}
          >
            <p style={{ margin: "0 0 14px", fontSize: "11.5px", fontWeight: 800, color: "#62746a", letterSpacing: "0.5px" }}>
              DELIVERY DESTINATION
            </p>
            <div style={{ display: "flex", gap: "10px", alignItems: "start" }}>
              <MapPin size={18} color="#16835b" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#063c32" }}>
                  {order.address?.address_line1}
                </p>
                {order.address?.address_line2 && (
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                    {order.address.address_line2}
                  </p>
                )}
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                  {order.address?.city}, {order.address?.state} {order.address?.pincode}
                </p>
              </div>
            </div>
          </div>

          {/* Shop Source Details */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e1e8e2",
              padding: "20px",
            }}
          >
            <p style={{ margin: "0 0 14px", fontSize: "11.5px", fontWeight: 800, color: "#62746a", letterSpacing: "0.5px" }}>
              FARM / SHOP SOURCE
            </p>
            <div style={{ display: "flex", gap: "10px", alignItems: "start" }}>
              <Store size={18} color="#047857" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#063c32" }}>
                  {shopName}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                  {order.shop_address || "Solapur Verified Local Farm Producer"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Summary */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e1e8e2",
              padding: "20px",
            }}
          >
            <p style={{ margin: "0 0 12px", fontSize: "11.5px", fontWeight: 800, color: "#62746a", letterSpacing: "0.5px" }}>
              ITEMS IN ORDER ({order.items.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {order.items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#063c32", fontWeight: 600 }}>
                    {item.product_name} <small style={{ color: "#62746a" }}>× {item.quantity} {item.unit}</small>
                  </span>
                  <strong style={{ color: "#063c32" }}>₹{Number(item.subtotal).toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f2", display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 800, color: "#063c32" }}>
                <span>Total Amount</span>
                <span>₹{Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </main>
  );
}

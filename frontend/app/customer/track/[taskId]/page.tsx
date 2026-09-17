"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, MapPin, Store, AlertCircle, RefreshCw } from "lucide-react";
import { getOrder } from "@/lib/api/orders";
import { getStoredToken } from "@/lib/api/auth";
import { subscribeToOrderTracking } from "@/lib/api/location";
import { MapboxTrackingMap, type LatLng } from "@/components/map/mapbox-tracking-map";
import { getErrorMessage } from "@/lib/api/client";

export default function TrackDeliveryLegacyPage() {
  const params = useParams();
  const idStr = (params?.taskId as string) || "";
  const orderId = Number(idStr);

  const [deliveryCoords, setDeliveryCoords] = useState<LatLng | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "live" | "reconnecting" | "error">("connecting");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ["order-track", orderId],
    queryFn: () => getOrder(orderId),
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "DELIVERED" || status === "CANCELLED" ? false : 10000;
    },
  });

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
          <p style={{ margin: 0, fontWeight: 700 }}>Connecting to order tracking #{orderId}...</p>
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
            <strong style={{ fontSize: "15px" }}>Unable to load tracking details</strong>
          </div>
          <p style={{ margin: 0, fontSize: "13.5px" }}>
            {isError ? getErrorMessage(error) : "Order tracking was not found."}
          </p>
        </div>
      </main>
    );
  }

  const isDelivered = order.status === "DELIVERED";
  const isOutForDelivery = order.status === "OUT_FOR_DELIVERY";

  const shopCoords: LatLng = {
    lat: order.shop_latitude ? Number(order.shop_latitude) : 17.6805,
    lng: order.shop_longitude ? Number(order.shop_longitude) : 75.9064,
  };

  const customerCoords: LatLng = {
    lat: order.customer_latitude
      ? Number(order.customer_latitude)
      : order.delivery_latitude
      ? Number(order.delivery_latitude)
      : 17.686,
    lng: order.customer_longitude
      ? Number(order.customer_longitude)
      : order.delivery_longitude
      ? Number(order.delivery_longitude)
      : 75.912,
  };

  const partnerName = order.delivery_partner_name || "Delivery Partner";
  const shopName = order.shop_name || "Vegito Fresh Farm";

  return (
    <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "20px 16px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
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
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        <div style={{ backgroundColor: "#ffffff", borderRadius: "20px", border: "1px solid #e1e8e2", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", backgroundColor: "#f8faf8", borderBottom: "1px solid #e1e8e2" }}>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: 800, color: "#62746a" }}>ORDER #{order.order_number}</p>
            <h2 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
              {isDelivered ? "Delivered Successfully 🎉" : isOutForDelivery ? "Out for Delivery" : order.status.replace(/_/g, " ")}
            </h2>
          </div>

          <div style={{ height: "460px", width: "100%" }}>
            <MapboxTrackingMap
              shopPosition={shopCoords}
              customerPosition={customerCoords}
              deliveryPosition={deliveryCoords}
              shopName={shopName}
              customerName={order.customer_name || "Your Doorstep"}
              partnerName={partnerName}
              orderStatus={order.status}
              height="460px"
              showStatusCard={true}
              interactive={true}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", border: "1px solid #e1e8e2", padding: "20px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "11.5px", fontWeight: 800, color: "#62746a" }}>DELIVERY PARTNER</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>{partnerName}</h4>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>Vegito Delivery Fleet</p>
              </div>
              {order.delivery_partner_phone && (
                <a href={`tel:${order.delivery_partner_phone}`} style={{ padding: "8px 16px", backgroundColor: "#063c32", color: "#ffffff", borderRadius: "10px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
                  <Phone size={14} /> Call
                </a>
              )}
            </div>
          </div>

          {order.delivery_otp && (
            <div style={{ backgroundColor: "#f7fbf8", borderRadius: "18px", border: "1.5px dashed #16835b", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#16835b" }}>DELIVERY OTP</p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#62746a" }}>Give this code to your rider at doorstep</p>
                </div>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#063c32", backgroundColor: "#ffffff", padding: "8px 16px", borderRadius: "10px", border: "1px solid #c4e8d3" }}>
                  {order.delivery_otp}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

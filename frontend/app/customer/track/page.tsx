"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Truck, ArrowLeft, Loader2, PackageX, ShoppingBag } from "lucide-react";
import { listOrders, type Order } from "@/lib/api/orders";

const ACTIVE_STATUSES = [
  "OUT_FOR_DELIVERY",
  "READY",
  "PACKING",
  "ACCEPTED",
  "CONFIRMED",
  "NEW",
  "PENDING",
];

export default function TrackRedirectPage() {
  const router = useRouter();

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["customer-orders-track-find"],
    queryFn: () => listOrders(1, 10),
  });

  const orders = ordersData?.items || [];
  const activeOrder = orders.find((o) => ACTIVE_STATUSES.includes(o.status));

  useEffect(() => {
    if (activeOrder) {
      router.replace(`/customer/track/${activeOrder.id}`);
    }
  }, [activeOrder, router]);

  if (isLoading || activeOrder) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: "#063c32",
        }}
      >
        <Loader2 size={36} className="animate-spin" color="#16835b" />
        <h3 style={{ margin: "16px 0 6px", fontSize: "17px", fontWeight: 800 }}>
          Locating Active Delivery...
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>
          Connecting with Solapur live fleet dispatch
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "20px",
          backgroundColor: "#f0fdf4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          color: "#16835b",
        }}
      >
        <Truck size={32} />
      </div>

      <h2 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
        No Active Deliveries Right Now
      </h2>
      <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#62746a", maxWidth: "380px" }}>
        You don&apos;t have any orders currently out for delivery. Check your past orders or order fresh farm vegetables now!
      </p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/customer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 20px",
            borderRadius: "14px",
            backgroundColor: "#063c32",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 800,
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(6, 60, 50, 0.2)",
          }}
        >
          <ShoppingBag size={17} />
          <span>Shop Fresh Produce</span>
        </Link>
        <Link
          href="/customer/orders"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 20px",
            borderRadius: "14px",
            backgroundColor: "#ffffff",
            border: "1.5px solid #dce8df",
            color: "#063c32",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          <span>View Past Orders</span>
        </Link>
      </div>
    </div>
  );
}

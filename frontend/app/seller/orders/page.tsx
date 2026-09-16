"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  CheckCircle,
  Package,
  Clock,
  Check,
  X,
  Search,
  Filter,
  ShoppingBag,
  Truck,
  AlertCircle,
} from "lucide-react";
import {
  listSellerOrders,
  updateSellerOrder,
} from "@/lib/api/seller";
import { getSellerProfile } from "@/lib/api/seller-products";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RoleGuard } from "@/components/role/role-guard";
import { getErrorMessage } from "@/lib/api/client";

export default function SellerOrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["seller-profile"],
    queryFn: getSellerProfile,
  });

  const ordersQuery = useQuery({
    queryKey: ["seller-orders"],
    queryFn: () => listSellerOrders(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: number;
      status: "ACCEPTED" | "PACKING" | "READY" | "REJECTED";
    }) => updateSellerOrder(orderId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["seller-revenue-analytics"] });
      setFeedback(`Order updated to ${variables.status}`);
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback(getErrorMessage(err));
    },
  });

  const businessName = profile.data?.business_name || "Farm Fresh Solapur";
  const rawOrders = ordersQuery.data?.items ?? [];

  const filteredOrders = rawOrders.filter((order) => {
    // Status tab filter
    if (activeTab !== "ALL" && order.status !== activeTab) {
      return false;
    }
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const numMatch = (order.order_number || "").toLowerCase().includes(q);
      const custMatch = ((order as any).customer_name || "").toLowerCase().includes(q);
      return numMatch || custMatch;
    }
    return true;
  });

  const pendingCount = rawOrders.filter((o) =>
    ["NEW", "ACCEPTED", "PACKING"].includes(o.status)
  ).length;

  return (
    <RoleGuard allow={["SELLER", "ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="seller"
        userName={businessName}
        userRole="Verified Seller"
        greeting={`Order Fulfillment · ${businessName}`}
        subtitle="Accept vegetable orders, pack produce, and coordinate with delivery partners"
        searchPlaceholder="Search orders..."
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#063c32" }}>
              Orders Fulfillment
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
              {pendingCount} order(s) requiring immediate action
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "12px",
              marginBottom: "20px",
              backgroundColor: "#e9f6ee",
              color: "#16835b",
              border: "1px solid #c4e8d3",
              fontSize: "13.5px",
              fontWeight: 700,
            }}
          >
            ✓ {feedback}
          </div>
        )}

        {/* Status Tabs & Search */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              backgroundColor: "#ffffff",
              padding: "4px",
              borderRadius: "12px",
              border: "1px solid #e1e8e2",
              flexWrap: "wrap",
            }}
          >
            {[
              { key: "ALL", label: "All Orders" },
              { key: "NEW", label: "New Orders" },
              { key: "ACCEPTED", label: "Accepted" },
              { key: "PACKING", label: "Packing" },
              { key: "READY", label: "Ready for Pickup" },
              { key: "DELIVERED", label: "Delivered" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  backgroundColor: activeTab === tab.key ? "#063c32" : "transparent",
                  color: activeTab === tab.key ? "#ffffff" : "#62746a",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "10px",
              padding: "8px 14px",
              width: "260px",
            }}
          >
            <Search size={16} color="#62746a" />
            <input
              type="text"
              placeholder="Order # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "13px",
                width: "100%",
              }}
            />
          </div>
        </div>

        {/* Orders List */}
        {ordersQuery.isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#62746a" }}>
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "16px",
              padding: "48px 24px",
              textAlign: "center",
              color: "#62746a",
            }}
          >
            <ShoppingBag size={42} color="#16835b" style={{ margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: "16px", color: "#063c32" }}>
              No orders found
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "13px" }}>
              {activeTab !== "ALL"
                ? `No orders currently matching "${activeTab}" status.`
                : "Customer orders will appear here once placed."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e1e8e2",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #f1f5f2",
                    paddingBottom: "14px",
                    marginBottom: "14px",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                      Order #{order.order_number}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{ fontSize: "13px", color: "#62746a" }}>
                    Placed: {new Date(order.placed_at).toLocaleString()}
                  </div>
                </div>

                {/* Items & Amount */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}
                >
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "13.5px", color: "#13221b", fontWeight: 700 }}>
                      Customer: {(order as any).customer_name || "Customer"}
                    </p>
                    <p style={{ margin: 0, fontSize: "12.5px", color: "#62746a" }}>
                      Items in order: <b>{(order as any).items?.length || 1} vegetable package(s)</b>
                    </p>
                    {(order as any).items && (order as any).items.length > 0 && (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                        {(order as any).items.map((item: any, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              padding: "4px 8px",
                              backgroundColor: "#f8faf9",
                              border: "1px solid #e8f0eb",
                              borderRadius: "6px",
                              fontSize: "12px",
                              color: "#063c32",
                            }}
                          >
                            {item.product_name} × {item.quantity} {item.unit || "kg"} (₹{item.price})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "11.5px", color: "#62746a" }}>Order Total</p>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                        ₹{Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      {order.status === "NEW" && (
                        <>
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({ orderId: order.id, status: "ACCEPTED" })
                            }
                            disabled={updateStatusMutation.isPending}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "10px",
                              backgroundColor: "#063c32",
                              color: "#ffffff",
                              fontSize: "12.5px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Accept Order
                          </button>
                          <button
                            onClick={() =>
                              updateStatusMutation.mutate({ orderId: order.id, status: "REJECTED" })
                            }
                            disabled={updateStatusMutation.isPending}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "10px",
                              backgroundColor: "#fee2e2",
                              color: "#dc2626",
                              fontSize: "12.5px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {order.status === "ACCEPTED" && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ orderId: order.id, status: "PACKING" })
                          }
                          disabled={updateStatusMutation.isPending}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "10px",
                            backgroundColor: "#16835b",
                            color: "#ffffff",
                            fontSize: "12.5px",
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Start Packing
                        </button>
                      )}

                      {order.status === "PACKING" && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ orderId: order.id, status: "READY" })
                          }
                          disabled={updateStatusMutation.isPending}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 16px",
                            borderRadius: "10px",
                            backgroundColor: "#059669",
                            color: "#ffffff",
                            fontSize: "12.5px",
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <CheckCircle size={15} /> Mark READY for Pickup
                        </button>
                      )}

                      {order.status === "READY" && (
                        <span style={{ fontSize: "12.5px", color: "#16835b", fontWeight: 700 }}>
                          ✓ Ready for Delivery Partner
                        </span>
                      )}

                      {["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status) && (
                        <span style={{ fontSize: "12.5px", color: "#2563eb", fontWeight: 700 }}>
                          🚴 {order.status.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardShell>
    </RoleGuard>
  );
}


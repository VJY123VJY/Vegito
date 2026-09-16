"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminSellerDetail, verifySeller } from "@/lib/api/admin";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RoleGuard } from "@/components/role/role-guard";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  Package,
  DollarSign,
  ClipboardList,
  CheckCircle,
  XCircle,
  Star,
} from "lucide-react";

export default function AdminSellerDetailPage() {
  const params = useParams();
  const sellerId = params ? (params as any).sellerId : undefined;
  const id = Number(sellerId);
  const router = useRouter();
  const queryClient = useQueryClient();

  const sellerQuery = useQuery({
    queryKey: ["admin-seller-detail", id],
    queryFn: () => getAdminSellerDetail(id),
    enabled: Boolean(id),
  });

  const verifyMutation = useMutation({
    mutationFn: (isVerified: boolean) => verifySeller(id, isVerified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seller-detail", id] });
    },
  });

  const s = sellerQuery.data;

  if (sellerQuery.isLoading) {
    return (
      <DashboardShell role="admin" greeting="Seller Inspection Profile">
        <p style={{ color: "#62746a" }}>Loading seller details...</p>
      </DashboardShell>
    );
  }

  if (!s) {
    return (
      <DashboardShell role="admin" greeting="Seller Not Found">
        <p>This seller profile could not be loaded.</p>
      </DashboardShell>
    );
  }

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting={s.business_name}
        subtitle="Individual Seller Compliance and Catalog Inspection"
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          {/* Back button */}
          <button
            onClick={() => router.back()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "none",
              border: "1px solid #e1e8e2",
              borderRadius: "8px",
              color: "#063c32",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: "20px",
            }}
          >
            <ArrowLeft size={14} /> Back to Sellers
          </button>

          {/* Profile Card Header */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "18px",
              padding: "26px",
              marginBottom: "24px",
              boxShadow: "0 2px 10px rgba(6, 60, 50, 0.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  backgroundColor: "#e9f6ee",
                  color: "#16835b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  fontWeight: 800,
                }}
              >
                🥬
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
                    {s.business_name}
                  </h2>
                  {s.is_verified ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", backgroundColor: "#e9f6ee", color: "#16835b", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>
                      <CheckCircle size={12} /> Verified
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", backgroundColor: "#fee2e2", color: "#dc2626", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>
                      <XCircle size={12} /> Pending Verification
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12.5px", color: "#62746a" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Phone size={13} /> {s.phone}
                  </span>
                  {s.email && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Mail size={13} /> {s.email}
                    </span>
                  )}
                  {s.address && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={13} /> {s.address.city}, {s.address.pincode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Toggle */}
            <button
              onClick={() => verifyMutation.mutate(!s.is_verified)}
              disabled={verifyMutation.isPending}
              style={{
                padding: "9px 18px",
                borderRadius: "10px",
                backgroundColor: s.is_verified ? "#fff1f2" : "#063c32",
                color: s.is_verified ? "#be123c" : "#ffffff",
                border: s.is_verified ? "1px solid #fecdd3" : "none",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {s.is_verified ? "Revoke Verification" : "Approve & Verify Seller"}
            </button>
          </div>

          {/* Metrics Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e8e2", borderRadius: "14px", padding: "18px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11.5px", color: "#62746a", fontWeight: 700, textTransform: "uppercase" }}>
                Total Revenue
              </p>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#063c32" }}>
                ₹{Number(s.stats?.total_revenue || 0).toFixed(0)}
              </p>
            </div>
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e8e2", borderRadius: "14px", padding: "18px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11.5px", color: "#62746a", fontWeight: 700, textTransform: "uppercase" }}>
                Orders Fulfilled
              </p>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#063c32" }}>
                {s.stats?.total_orders || 0}
              </p>
            </div>
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e8e2", borderRadius: "14px", padding: "18px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11.5px", color: "#62746a", fontWeight: 700, textTransform: "uppercase" }}>
                Active Products
              </p>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#063c32" }}>
                {s.stats?.product_count || 0}
              </p>
            </div>
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e8e2", borderRadius: "14px", padding: "18px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11.5px", color: "#62746a", fontWeight: 700, textTransform: "uppercase" }}>
                Seller Rating
              </p>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#16835b" }}>
                ★ {Number(s.rating || 0).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Product Catalog Table */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
              Product Catalog & Stock ({s.products?.length || 0})
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table className="dashboard-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock Quantity</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {(s.products || []).map((p: any) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: "#13221b" }}>{p.product_name}</td>
                      <td style={{ fontWeight: 800, color: "#063c32" }}>₹{Number(p.price).toFixed(2)}</td>
                      <td>{Number(p.stock_quantity).toFixed(1)} kg</td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            backgroundColor: p.is_available ? "#e9f6ee" : "#fee2e2",
                            color: p.is_available ? "#16835b" : "#dc2626",
                          }}
                        >
                          {p.is_available ? "Available" : "Disabled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAdminSellers, verifySeller } from "@/lib/api/admin";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SellerTable } from "@/components/dashboard/seller-table";
import { RoleGuard } from "@/components/role/role-guard";
import { Search, Filter, Store, CheckCircle, XCircle } from "lucide-react";

export default function AdminSellersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterVerified, setFilterVerified] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  const sellersQuery = useQuery({
    queryKey: ["admin-sellers-list", search, filterVerified, page],
    queryFn: () => listAdminSellers({ q: search || undefined, is_verified: filterVerified, page }),
  });

  const toggleVerifyMutation = useMutation({
    mutationFn: ({ sellerId, isVerified }: { sellerId: number; isVerified: boolean }) =>
      verifySeller(sellerId, !isVerified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sellers-list"] });
    },
  });

  const sellersData = sellersQuery.data?.items ?? [];
  const total = sellersQuery.data?.total ?? 0;

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting="Seller Management"
        subtitle="Verify, inspect, and monitor all vegetable vendors on Vegito"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Header & Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
                Marketplace Sellers ({total})
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                Filter sellers by verification status or search by business name and phone.
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { label: "All Sellers", val: undefined },
                { label: "Verified Only", val: true },
                { label: "Unverified", val: false },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => {
                    setFilterVerified(f.val);
                    setPage(1);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${filterVerified === f.val ? "#063c32" : "#e1e8e2"}`,
                    backgroundColor: filterVerified === f.val ? "#e9f6ee" : "#ffffff",
                    color: filterVerified === f.val ? "#063c32" : "#62746a",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "12px",
              padding: "10px 16px",
              marginBottom: "20px",
              maxWidth: "460px",
            }}
          >
            <Search size={16} color="#62746a" />
            <input
              type="text"
              placeholder="Search by business name or contact phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                border: "none",
                outline: "none",
                fontSize: "13px",
                color: "#13221b",
                width: "100%",
              }}
            />
          </div>

          {/* Table */}
          <SellerTable
            sellers={sellersData}
            isLoading={sellersQuery.isLoading}
            onToggleVerify={(sellerId, currentStatus) =>
              toggleVerifyMutation.mutate({ sellerId, isVerified: currentStatus })
            }
          />
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

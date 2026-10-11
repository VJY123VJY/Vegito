"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  Mail,
  ShoppingBag,
  IndianRupee,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { listAdminCustomers, updateAdminUserStatus } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";

const PAGE_SIZE = 20;

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-customers", search, page],
    queryFn: () => listAdminCustomers({ q: search.trim() || undefined, page, page_size: PAGE_SIZE }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      updateAdminUserStatus(userId, isActive),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      setFeedback({
        type: "success",
        msg: `Customer account ${vars.isActive ? "activated" : "suspended"} successfully.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) || "Failed to update customer status" });
      setTimeout(() => setFeedback(null), 4000);
    },
  });

  const customers = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting="Customer Intelligence & Directory"
        subtitle="Manage customer profiles, order history, lifetime value, and access status"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
          {feedback && (
            <div
              style={{
                padding: "12px 18px",
                borderRadius: "12px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: feedback.type === "success" ? "#065f46" : "#991b1b",
                border: `1px solid ${feedback.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* Controls Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 320px", maxWidth: "480px" }}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                }}
              >
                <Search
                  size={18}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#62746a",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, or email…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    width: "100%",
                    height: "44px",
                    paddingLeft: "42px",
                    paddingRight: "14px",
                    borderRadius: "12px",
                    border: "1px solid #d1dbd4",
                    backgroundColor: "#ffffff",
                    fontSize: "14px",
                    color: "#063c32",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "#62746a", fontWeight: 600 }}>
                Total: <strong>{total}</strong> customers
              </span>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "1px solid #d1dbd4",
                  backgroundColor: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#063c32",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Customers Table */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8faf8", borderBottom: "1px solid #e1e8e2" }}>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Customer
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Contact
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Total Orders
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Lifetime Spend
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Status
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase", textAlign: "right" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "48px 18px", textAlign: "center", color: "#62746a" }}>
                        Loading registered customers…
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "48px 18px", textAlign: "center", color: "#62746a" }}>
                        No customers found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c: any) => (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: "1px solid #edf2ee",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                backgroundColor: "#ecfdf5",
                                color: "#065f46",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "14px",
                              }}
                            >
                              {(c.name || "C").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: "#063c32", fontSize: "14px" }}>
                                {c.name || "Customer"}
                              </div>
                              <div style={{ fontSize: "12px", color: "#62746a" }}>
                                Joined {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#063c32" }}>
                            <a
                              href={`tel:${c.phone}`}
                              style={{ color: "#063c32", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Phone size={13} color="#16835b" />
                              {c.phone}
                            </a>
                          </div>
                          {c.email && (
                            <div style={{ fontSize: "12px", color: "#62746a", marginTop: "2px" }}>
                              <a
                                href={`mailto:${c.email}`}
                                style={{ color: "#62746a", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              >
                                <Mail size={12} />
                                {c.email}
                              </a>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              backgroundColor: c.total_orders > 0 ? "#eff6ff" : "#f1f5f9",
                              color: c.total_orders > 0 ? "#1e40af" : "#64748b",
                              fontWeight: 800,
                              fontSize: "13px",
                            }}
                          >
                            <ShoppingBag size={13} />
                            {c.total_orders} orders
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 900, color: "#063c32" }}>
                            ₹{Number(c.total_spent || 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "100px",
                              fontSize: "12px",
                              fontWeight: 700,
                              backgroundColor: c.is_active ? "#ecfdf5" : "#fef2f2",
                              color: c.is_active ? "#065f46" : "#991b1b",
                            }}
                          >
                            {c.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <button
                            onClick={() =>
                              statusMutation.mutate({
                                userId: c.id,
                                isActive: !c.is_active,
                              })
                            }
                            disabled={statusMutation.isPending}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "8px",
                              border: "none",
                              backgroundColor: c.is_active ? "#fee2e2" : "#e9f6ee",
                              color: c.is_active ? "#dc2626" : "#16835b",
                              fontSize: "12.5px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            {c.is_active ? (
                              <>
                                <UserX size={14} />
                                <span>Suspend</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={14} />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #e1e8e2",
                  backgroundColor: "#fafcf9",
                }}
              >
                <span style={{ fontSize: "13px", color: "#62746a" }}>
                  Page {page} of {totalPages}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1dbd4",
                      backgroundColor: "#ffffff",
                      fontSize: "13px",
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                      opacity: page <= 1 ? 0.5 : 1,
                    }}
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1dbd4",
                      backgroundColor: "#ffffff",
                      fontSize: "13px",
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                      opacity: page >= totalPages ? 0.5 : 1,
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

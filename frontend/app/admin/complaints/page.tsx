"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Phone,
  MessageCircle,
  Mail,
  User,
  ShoppingBag,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { listAdminComplaints, resolveAdminComplaint, type AdminComplaintItem } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";

const PAGE_SIZE = 20;

export default function AdminComplaintsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<AdminComplaintItem | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [targetStatus, setTargetStatus] = useState<"RESOLVED" | "IN_PROGRESS" | "CLOSED">("RESOLVED");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-complaints", statusFilter, page],
    queryFn: () =>
      listAdminComplaints({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
      resolveAdminComplaint(id, { status, resolution_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      setSelectedTicket(null);
      setResolutionText("");
      setFeedback({ type: "success", msg: "Complaint status updated successfully." });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) || "Failed to resolve complaint" });
      setTimeout(() => setFeedback(null), 4000);
    },
  });

  const complaints = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return { bg: "#fef2f2", color: "#991b1b", text: "Open" };
      case "IN_PROGRESS":
        return { bg: "#fef3c7", color: "#92400e", text: "In Progress" };
      case "RESOLVED":
        return { bg: "#ecfdf5", color: "#065f46", text: "Resolved" };
      case "CLOSED":
        return { bg: "#f1f5f9", color: "#475569", text: "Closed" };
      default:
        return { bg: "#f3f4f6", color: "#374151", text: status };
    }
  };

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting="Complaints & Support Center"
        subtitle="Customer grievance resolution, ticket investigations, and communication desk"
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
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* Filter Pills */}
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
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { label: "All Tickets", val: "ALL" },
                { label: "Open Tickets", val: "OPEN" },
                { label: "In Progress", val: "IN_PROGRESS" },
                { label: "Resolved", val: "RESOLVED" },
                { label: "Closed", val: "CLOSED" },
              ].map((f) => (
                <button
                  key={f.val}
                  onClick={() => {
                    setStatusFilter(f.val);
                    setPage(1);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: `1.5px solid ${statusFilter === f.val ? "#063c32" : "#e1e8e2"}`,
                    backgroundColor: statusFilter === f.val ? "#e9f6ee" : "#ffffff",
                    color: statusFilter === f.val ? "#063c32" : "#62746a",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
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

          {/* Complaints Table */}
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
                      Ticket ID
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Customer &amp; Contact
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Type &amp; Description
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Status
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase" }}>
                      Direct Actions
                    </th>
                    <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: 800, color: "#62746a", textTransform: "uppercase", textAlign: "right" }}>
                      Resolution
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "48px 18px", textAlign: "center", color: "#62746a" }}>
                        Loading support complaints…
                      </td>
                    </tr>
                  ) : complaints.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "48px 18px", textAlign: "center", color: "#62746a" }}>
                        No support tickets found for this filter.
                      </td>
                    </tr>
                  ) : (
                    complaints.map((c: AdminComplaintItem) => {
                      const badge = getStatusBadge(c.status);
                      const cleanPhone = (c.customer_phone || "").replace(/\D/g, "");
                      return (
                        <tr
                          key={c.id}
                          style={{
                            borderBottom: "1px solid #edf2ee",
                            transition: "background-color 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontWeight: 800, color: "#063c32", fontSize: "14px" }}>
                              #{c.id}
                            </div>
                            {c.order_id && (
                              <div style={{ fontSize: "12px", color: "#62746a" }}>
                                Order #{c.order_id}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontWeight: 800, color: "#063c32", fontSize: "13.5px" }}>
                              {c.customer_name || "Customer"}
                            </div>
                            <div style={{ fontSize: "12px", color: "#62746a" }}>
                              {c.customer_phone || "—"}
                            </div>
                          </td>

                          <td style={{ padding: "14px 18px", maxWidth: "340px" }}>
                            <div
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#f1f5f9",
                                color: "#334155",
                                fontSize: "11px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                marginBottom: "4px",
                              }}
                            >
                              {c.category || (c as any).complaint_type || "General"}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#334155",
                                lineHeight: "1.4",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {c.description}
                            </div>
                            {(c.resolution_notes || (c as any).resolution) && (
                              <div
                                style={{
                                  marginTop: "6px",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  backgroundColor: "#ecfdf5",
                                  color: "#065f46",
                                  fontSize: "12px",
                                }}
                              >
                                <strong>Resolution:</strong> {c.resolution_notes || (c as any).resolution}
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
                                borderRadius: "100px",
                                fontSize: "12px",
                                fontWeight: 700,
                                backgroundColor: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {badge.text}
                            </span>
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            {cleanPhone ? (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <a
                                  href={`tel:+91${cleanPhone}`}
                                  title="Call customer directly"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    backgroundColor: "#e9f6ee",
                                    color: "#16835b",
                                    textDecoration: "none",
                                  }}
                                >
                                  <Phone size={15} />
                                </a>
                                <a
                                  href={`https://wa.me/91${cleanPhone}?text=Hello%20from%20Vegito%20Support%20regarding%20ticket%20%23${c.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat on WhatsApp"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    backgroundColor: "#dcfce7",
                                    color: "#15803d",
                                    textDecoration: "none",
                                  }}
                                >
                                  <MessageCircle size={15} />
                                </a>
                              </div>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#9ca3af" }}>—</span>
                            )}
                          </td>

                          <td style={{ padding: "14px 18px", textAlign: "right" }}>
                            <button
                              onClick={() => {
                                setSelectedTicket(c);
                                setResolutionText(c.resolution_notes || (c as any).resolution || "");
                              }}
                              style={{
                                padding: "6px 14px",
                                borderRadius: "8px",
                                border: "1px solid #d1dbd4",
                                backgroundColor: "#ffffff",
                                color: "#063c32",
                                fontSize: "12.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })
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

          {/* Resolution Modal */}
          {selectedTicket && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  maxWidth: "520px",
                  width: "100%",
                  padding: "28px",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                    Manage Ticket #{selectedTicket.id}
                  </h3>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#62746a" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ marginBottom: "16px", backgroundColor: "#f8faf8", padding: "14px", borderRadius: "12px", border: "1px solid #e1e8e2" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#62746a", marginBottom: "4px" }}>
                    CUSTOMER INQUIRY
                  </div>
                  <div style={{ fontSize: "14px", color: "#13221b" }}>
                    {selectedTicket.description}
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                    Update Ticket Status
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as any)}
                    style={{
                      width: "100%",
                      height: "42px",
                      borderRadius: "10px",
                      border: "1px solid #d1dbd4",
                      padding: "0 12px",
                      fontSize: "14px",
                      color: "#063c32",
                    }}
                  >
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div style={{ marginBottom: "22px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                    Resolution Notes &amp; Action Taken
                  </label>
                  <textarea
                    rows={4}
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Enter details of customer communication, replacement, or refund explanation…"
                    style={{
                      width: "100%",
                      borderRadius: "10px",
                      border: "1px solid #d1dbd4",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#063c32",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      border: "1px solid #d1dbd4",
                      backgroundColor: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#62746a",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      resolveMutation.mutate({
                        id: selectedTicket.id,
                        status: targetStatus,
                        notes: resolutionText.trim(),
                      })
                    }
                    disabled={resolveMutation.isPending}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: "#16835b",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    {resolveMutation.isPending ? "Updating…" : "Save Resolution"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

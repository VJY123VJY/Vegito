"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileText,
  Eye,
  Store,
  Truck,
  Loader2,
  ExternalLink,
  Lock,
} from "lucide-react";
import {
  getAdminKycReviews,
  reviewSellerKyc,
  reviewDeliveryKyc,
  type AdminKycReviewsResponse,
} from "@/lib/api/kyc";

export function AdminKycReviewPanel() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<"ALL" | "SELLER" | "DELIVERY">("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("UNDER_REVIEW");
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);

  const [decisionNotes, setDecisionNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ["admin-kyc-reviews", filterType, filterStatus],
    queryFn: () => getAdminKycReviews(filterType === "ALL" ? undefined : filterType, filterStatus || undefined),
    refetchInterval: 15000,
  });

  const sellerReviewMutation = useMutation({
    mutationFn: ({ id, decision, reason, reupload_notes }: { id: number; decision: string; reason?: string; reupload_notes?: string }) =>
      reviewSellerKyc(id, { decision, reason, reupload_notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-full"] });
      setSelectedSeller(null);
      setDecisionNotes("");
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.detail || err.message || "Failed to submit review");
    },
  });

  const deliveryReviewMutation = useMutation({
    mutationFn: ({ id, decision, reason, reupload_notes }: { id: number; decision: string; reason?: string; reupload_notes?: string }) =>
      reviewDeliveryKyc(id, { decision, reason, reupload_notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-full"] });
      setSelectedDelivery(null);
      setDecisionNotes("");
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.detail || err.message || "Failed to submit review");
    },
  });

  const sellersList = reviewsQuery.data?.sellers || [];
  const deliveryList = reviewsQuery.data?.delivery_partners || [];

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "18px",
        border: "1px solid #e1e8e2",
        padding: "24px",
        marginBottom: "28px",
        boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
      }}
    >
      {/* Header and Filter Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid #edf2ee",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              backgroundColor: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 800, color: "#063c32" }}>
              KYC & Document Verification Center
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
              Strict Section 47 RBAC · Masked government IDs & verified badge management
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "10px", padding: "3px" }}>
            <button
              onClick={() => setFilterType("ALL")}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: filterType === "ALL" ? "#ffffff" : "transparent",
                color: filterType === "ALL" ? "#0f172a" : "#64748b",
                boxShadow: filterType === "ALL" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType("SELLER")}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: filterType === "SELLER" ? "#ffffff" : "transparent",
                color: filterType === "SELLER" ? "#0f172a" : "#64748b",
                boxShadow: filterType === "SELLER" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Sellers ({sellersList.length})
            </button>
            <button
              onClick={() => setFilterType("DELIVERY")}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: filterType === "DELIVERY" ? "#ffffff" : "transparent",
                color: filterType === "DELIVERY" ? "#0f172a" : "#64748b",
                boxShadow: filterType === "DELIVERY" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Riders ({deliveryList.length})
            </button>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#334155",
              outline: "none",
            }}
          >
            <option value="UNDER_REVIEW">Under Review / Submitted</option>
            <option value="VERIFIED">Verified Badges</option>
            <option value="REUPLOAD_REQUIRED">Re-upload Requested</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All Statuses</option>
          </select>
        </div>
      </div>

      {reviewsQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <Loader2 className="animate-spin" size={32} color="#059669" />
        </div>
      ) : sellersList.length === 0 && deliveryList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 20px", color: "#64748b" }}>
          <CheckCircle2 size={36} color="#059669" style={{ margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
            No pending KYC verifications found for this filter.
          </p>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            All seller profiles and delivery fleet partners are processed.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Seller Submissions */}
          {filterType !== "DELIVERY" && sellersList.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <Store size={16} color="#059669" />
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#064e3b", textTransform: "uppercase" }}>
                  Seller KYC Submissions ({sellersList.length})
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
                {sellersList.map((item: any) => (
                  <div
                    key={`seller-${item.id}`}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "16px",
                      backgroundColor: "#fafcf9",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <div>
                          <strong style={{ fontSize: "14.5px", color: "#0f172a" }}>
                            {item.seller_profile?.business_name || "Mandi Producer"}
                          </strong>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                            Type: {item.business_type} · ID: #{item.id_proof_number_masked || "Masked"}
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            backgroundColor: item.status === "VERIFIED" ? "#ecfdf5" : "#eff6ff",
                            color: item.status === "VERIFIED" ? "#059669" : "#2563eb",
                            border: `1px solid ${item.status === "VERIFIED" ? "#a7f3d0" : "#bfdbfe"}`,
                          }}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div style={{ marginTop: "10px", fontSize: "12px", color: "#334155" }}>
                        <div>Bank: {item.bank_account_holder} ({item.bank_ifsc || "IFSC"})</div>
                        <div style={{ color: "#64748b" }}>A/C: {item.bank_account_number_masked || "••••••••"}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => setSelectedSeller(item)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#ffffff",
                          color: "#1e293b",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <Eye size={14} /> Review Documents
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Partner Submissions */}
          {filterType !== "SELLER" && deliveryList.length > 0 && (
            <div style={{ marginTop: filterType === "ALL" ? "14px" : "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <Truck size={16} color="#0284c7" />
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#0369a1", textTransform: "uppercase" }}>
                  Delivery Partner KYC Submissions ({deliveryList.length})
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
                {deliveryList.map((item: any) => (
                  <div
                    key={`delivery-${item.id}`}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "16px",
                      backgroundColor: "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <div>
                          <strong style={{ fontSize: "14.5px", color: "#0f172a" }}>
                            {item.full_name || "Delivery Partner"}
                          </strong>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                            Vehicle: {item.vehicle_type} ({item.vehicle_number || "MH-13"})
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            backgroundColor: item.status === "VERIFIED" ? "#ecfdf5" : "#eff6ff",
                            color: item.status === "VERIFIED" ? "#059669" : "#2563eb",
                            border: `1px solid ${item.status === "VERIFIED" ? "#a7f3d0" : "#bfdbfe"}`,
                          }}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div style={{ marginTop: "10px", fontSize: "12px", color: "#334155" }}>
                        <div>License: {item.driving_license_number || "N/A"}</div>
                        <div>Zone: {item.operating_zone || "Solapur Central"} · UPI: {item.bank_upi_id || "N/A"}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => setSelectedDelivery(item)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#ffffff",
                          color: "#1e293b",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <Eye size={14} /> Review Documents
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seller Review Modal */}
      {selectedSeller && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                  Verify Seller: {selectedSeller.seller_profile?.business_name || "Mandi Producer"}
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Seller Profile ID: {selectedSeller.seller_profile_id} · User ID: {selectedSeller.user_id}
                </span>
              </div>
              <button
                onClick={() => { setSelectedSeller(null); setActionError(null); }}
                style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8" }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", marginBottom: "16px", fontSize: "13px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><b>Business Type:</b> {selectedSeller.business_type}</div>
                <div><b>Proof Type:</b> {selectedSeller.business_proof_type || "N/A"}</div>
                <div><b>ID Proof:</b> {selectedSeller.id_proof_type} ({selectedSeller.id_proof_number_masked})</div>
                <div><b>Bank A/C:</b> {selectedSeller.bank_account_holder} ({selectedSeller.bank_account_number_masked})</div>
                <div><b>IFSC:</b> {selectedSeller.bank_ifsc}</div>
                <div><b>UPI:</b> {selectedSeller.bank_upi_id || "N/A"}</div>
              </div>
            </div>

            {/* Document Links (Section 47 Secure Streaming) */}
            <div style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                Attached Verification Files:
              </span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {selectedSeller.business_proof_file && (
                  <a
                    href={`/api/v1/kyc/document/${selectedSeller.user_id}/${selectedSeller.business_proof_file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#f1f5f9",
                      color: "#1e293b",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <FileText size={14} /> Business Proof <ExternalLink size={12} />
                  </a>
                )}
                {selectedSeller.id_proof_file && (
                  <a
                    href={`/api/v1/kyc/document/${selectedSeller.user_id}/${selectedSeller.id_proof_file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#f1f5f9",
                      color: "#1e293b",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <FileText size={14} /> ID Proof <ExternalLink size={12} />
                  </a>
                )}
                {selectedSeller.selfie_file && (
                  <a
                    href={`/api/v1/kyc/document/${selectedSeller.user_id}/${selectedSeller.selfie_file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#f1f5f9",
                      color: "#1e293b",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <FileText size={14} /> Live Selfie <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Decision Notes */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Review Notes / Rejection Reason / Re-upload Request:
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Required for Reject or Re-upload requests..."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13.5px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {actionError && (
              <div style={{ marginBottom: "14px", padding: "10px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "12.5px", fontWeight: 700 }}>
                ⚠️ {actionError}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                onClick={() =>
                  sellerReviewMutation.mutate({
                    id: selectedSeller.seller_profile_id,
                    decision: "APPROVE",
                  })
                }
                disabled={sellerReviewMutation.isPending}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={16} /> Approve & Grant Verified Badge
              </button>

              <button
                onClick={() =>
                  sellerReviewMutation.mutate({
                    id: selectedSeller.seller_profile_id,
                    decision: "REQUEST_REUPLOAD",
                    reupload_notes: decisionNotes,
                  })
                }
                disabled={sellerReviewMutation.isPending || !decisionNotes.trim()}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#ea580c",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: !decisionNotes.trim() ? "not-allowed" : "pointer",
                  opacity: !decisionNotes.trim() ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={16} /> Request Re-upload
              </button>

              <button
                onClick={() =>
                  sellerReviewMutation.mutate({
                    id: selectedSeller.seller_profile_id,
                    decision: "REJECT",
                    reason: decisionNotes,
                  })
                }
                disabled={sellerReviewMutation.isPending || !decisionNotes.trim()}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: !decisionNotes.trim() ? "not-allowed" : "pointer",
                  opacity: !decisionNotes.trim() ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <XCircle size={16} /> Reject KYC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Review Modal */}
      {selectedDelivery && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                  Verify Rider: {selectedDelivery.full_name || "Delivery Partner"}
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Delivery Partner ID: {selectedDelivery.delivery_partner_id} · User ID: {selectedDelivery.user_id}
                </span>
              </div>
              <button
                onClick={() => { setSelectedDelivery(null); setActionError(null); }}
                style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8" }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", marginBottom: "16px", fontSize: "13px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><b>Full Name:</b> {selectedDelivery.full_name}</div>
                <div><b>DOB:</b> {selectedDelivery.dob || "N/A"}</div>
                <div><b>Emergency:</b> {selectedDelivery.emergency_contact_name} ({selectedDelivery.emergency_contact_phone})</div>
                <div><b>License:</b> {selectedDelivery.driving_license_number} (Exp: {selectedDelivery.driving_license_expiry || "N/A"})</div>
                <div><b>Vehicle:</b> {selectedDelivery.vehicle_type} ({selectedDelivery.vehicle_number})</div>
                <div><b>Operating Zone:</b> {selectedDelivery.operating_city} - {selectedDelivery.operating_zone}</div>
                <div><b>Bank IFSC:</b> {selectedDelivery.bank_ifsc || "N/A"}</div>
                <div><b>UPI Payout:</b> {selectedDelivery.bank_upi_id || "N/A"}</div>
              </div>
            </div>

            {/* Document Links */}
            <div style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                Attached Verification Files:
              </span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {selectedDelivery.driving_license_file && (
                  <a
                    href={`/api/v1/kyc/document/${selectedDelivery.user_id}/${selectedDelivery.driving_license_file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#f1f5f9",
                      color: "#1e293b",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <FileText size={14} /> Driving License <ExternalLink size={12} />
                  </a>
                )}
                {selectedDelivery.rc_book_file && (
                  <a
                    href={`/api/v1/kyc/document/${selectedDelivery.user_id}/${selectedDelivery.rc_book_file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#f1f5f9",
                      color: "#1e293b",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <FileText size={14} /> RC Book <ExternalLink size={12} />
                  </a>
                )}
                {selectedDelivery.id_proof_file && (
                  <a
                    href={`/api/v1/kyc/document/${selectedDelivery.user_id}/${selectedDelivery.id_proof_file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#f1f5f9",
                      color: "#1e293b",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <FileText size={14} /> ID Proof <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Decision Notes */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Review Notes / Rejection Reason / Re-upload Request:
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Required for Reject or Re-upload requests..."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13.5px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {actionError && (
              <div style={{ marginBottom: "14px", padding: "10px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "12.5px", fontWeight: 700 }}>
                ⚠️ {actionError}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                onClick={() =>
                  deliveryReviewMutation.mutate({
                    id: selectedDelivery.delivery_partner_id,
                    decision: "APPROVE",
                  })
                }
                disabled={deliveryReviewMutation.isPending}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={16} /> Approve & Grant Verified Badge
              </button>

              <button
                onClick={() =>
                  deliveryReviewMutation.mutate({
                    id: selectedDelivery.delivery_partner_id,
                    decision: "REQUEST_REUPLOAD",
                    reupload_notes: decisionNotes,
                  })
                }
                disabled={deliveryReviewMutation.isPending || !decisionNotes.trim()}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#ea580c",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: !decisionNotes.trim() ? "not-allowed" : "pointer",
                  opacity: !decisionNotes.trim() ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={16} /> Request Re-upload
              </button>

              <button
                onClick={() =>
                  deliveryReviewMutation.mutate({
                    id: selectedDelivery.delivery_partner_id,
                    decision: "REJECT",
                    reason: decisionNotes,
                  })
                }
                disabled={deliveryReviewMutation.isPending || !decisionNotes.trim()}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: !decisionNotes.trim() ? "not-allowed" : "pointer",
                  opacity: !decisionNotes.trim() ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <XCircle size={16} /> Reject KYC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

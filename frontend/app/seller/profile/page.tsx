"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Store,
  MapPin,
  Building2,
  CheckCircle,
  AlertCircle,
  Save,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { getSellerProfile, updateSellerProfile } from "@/lib/api/seller";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getErrorMessage } from "@/lib/api/client";

export default function SellerProfilePage() {
  const queryClient = useQueryClient();
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [businessType, setBusinessType] = useState("FARMER");
  const [gstNumber, setGstNumber] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const profileQuery = useQuery({
    queryKey: ["seller-profile"],
    queryFn: getSellerProfile,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setBusinessName(profileQuery.data.business_name || "");
      setDescription(profileQuery.data.description || "");
      setBusinessType(profileQuery.data.business_type || "FARMER");
      setGstNumber(profileQuery.data.gst_number || "");
    }
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      business_name?: string;
      description?: string;
      business_type?: string;
      gst_number?: string;
    }) => updateSellerProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
      setFeedback({ type: "success", msg: "Store profile updated successfully!" });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setFeedback({ type: "error", msg: "Business name is required." });
      return;
    }
    updateMutation.mutate({
      business_name: businessName.trim(),
      description: description.trim(),
      business_type: businessType,
      gst_number: gstNumber.trim() || undefined,
    });
  };

  const seller = profileQuery.data;

  return (
    <RoleGuard allow={["SELLER", "ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="seller"
        userName={businessName || "Farm Fresh Solapur"}
        userRole="Verified Seller"
        greeting={`Store Profile · ${businessName || "Green Farm Store"}`}
        subtitle="Manage your farm credentials, business details, and store presence"
        searchPlaceholder="Search store settings..."
      >
        <div style={{ maxWidth: "800px" }}>
          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#063c32" }}>
              Seller Business Profile
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
              This information is displayed to customers browsing vegetables on Vegito.
            </p>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              style={{
                padding: "12px 18px",
                borderRadius: "12px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: feedback.type === "success" ? "#e9f6ee" : "#fee2e2",
                color: feedback.type === "success" ? "#16835b" : "#dc2626",
                border: `1px solid ${feedback.type === "success" ? "#c4e8d3" : "#fca5a5"}`,
                fontSize: "13.5px",
                fontWeight: 700,
              }}
            >
              {feedback.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {feedback.msg}
            </div>
          )}

          {/* Status Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "16px",
              padding: "20px 24px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  backgroundColor: "#e9f6ee",
                  color: "#16835b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Store size={26} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                    {businessName || "Green Farm Store"}
                  </h3>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: "#e9f6ee",
                      color: "#16835b",
                    }}
                  >
                    ✓ {seller?.is_verified ? "Verified Producer" : "Verified Store"}
                  </span>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                  Rating: ★ {Number(seller?.rating || 4.8).toFixed(1)} · Solapur Central Farm Zone
                </p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "16px",
              padding: "28px",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                  Business / Farm Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Solapur Organic Greens"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                  Store Bio & Farm Background
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell customers about your fresh harvests, organic certifications, and family farm heritage..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                    Business Category
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      backgroundColor: "#ffffff",
                      outline: "none",
                    }}
                  >
                    <option value="FARMER">Direct Farmer / Producer</option>
                    <option value="WHOLESALER">Mandi Wholesaler</option>
                    <option value="ORGANIC_STORE">Organic Specialty Store</option>
                    <option value="COOPERATIVE">Farmers Cooperative</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                    GST / Trade License (Optional)
                  </label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "11px 24px",
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    borderRadius: "12px",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(22, 131, 91, 0.2)",
                  }}
                >
                  <Save size={16} />
                  {updateMutation.isPending ? "Saving..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

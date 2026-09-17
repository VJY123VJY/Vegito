"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Phone, Mail, Calendar, ShoppingBag, ShieldCheck, Check, AlertCircle, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCustomerProfile, updateCustomerProfile } from "@/lib/api/customers";
import { getErrorMessage } from "@/lib/api/client";
import { setStoredUserName, getStoredUserName } from "@/lib/api/auth";

export default function CustomerProfilePage() {
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState(getStoredUserName());
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const profile = useQuery({
    queryKey: ["customer-profile"],
    queryFn: getCustomerProfile,
  });

  useEffect(() => {
    if (profile.data?.user) {
      setNameInput(profile.data.user.name || "");
      setEmailInput(profile.data.user.email || "");
      if (profile.data.user.name) setUserName(profile.data.user.name);
    }
  }, [profile.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: { name?: string; email?: string }) => updateCustomerProfile(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      if (data.user?.name) {
        setStoredUserName(data.user.name);
        setUserName(data.user.name);
      }
      setToast({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      setToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setToast(null), 3000);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({ name: nameInput, email: emailInput });
  }

  const user = profile.data?.user;

  return (
    <DashboardShell
      role="customer"
      userName={userName}
      userRole="Customer"
      greeting="My Profile"
      subtitle="Manage your personal information and account details"
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        {toast && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 18px",
              borderRadius: "12px",
              backgroundColor: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
              color: toast.type === "success" ? "#166534" : "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13.5px",
              fontWeight: 600,
            }}
          >
            {toast.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
            {toast.text}
          </div>
        )}

        {profile.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Loading customer profile...</p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 10px rgba(6, 60, 50, 0.04)",
              overflow: "hidden",
            }}
          >
            {/* Header banner */}
            <div
              style={{
                padding: "28px",
                backgroundColor: "#f0fdf4",
                borderBottom: "1px solid #e1e8e2",
                display: "flex",
                alignItems: "center",
                gap: "18px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#16835b",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  fontWeight: 800,
                  boxShadow: "0 4px 12px rgba(22, 131, 91, 0.3)",
                }}
              >
                {userName ? userName[0].toUpperCase() : "C"}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                  {user?.name || userName}
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#62746a" }}>
                  Solapur Fresh Produce Member · {profile.data?.total_orders ?? 0} Orders placed
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                    Registered Mobile Phone
                  </label>
                  <input
                    type="text"
                    value={user?.phone || ""}
                    disabled
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                      color: "#6b7280",
                      fontSize: "14px",
                    }}
                  />
                  <small style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#9ca3af" }}>
                    Verified via OTP. Contact customer support to update your registered phone number.
                  </small>
                </div>

                <div style={{ marginTop: "10px" }}>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    style={{
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      padding: "12px 24px",
                      borderRadius: "10px",
                      border: "none",
                      fontWeight: 800,
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(22, 131, 91, 0.25)",
                    }}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

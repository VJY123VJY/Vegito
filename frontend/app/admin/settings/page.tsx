"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Settings,
  ShieldCheck,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  MapPin,
  Server,
  Lock,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getMe, type AuthRole } from "@/lib/api/auth";
import { api, type ApiEnvelope } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/client";

export default function AdminSettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    getMe().then((u) => setCurrentUser(u)).catch(() => {});
  }, []);

  const isSuperAdmin =
    currentUser?.role_name === "SUPER_ADMIN" ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.authorized_roles?.includes("SUPER_ADMIN");

  const createAdminMutation = useMutation({
    mutationFn: async (payload: { name: string; phone: string; email?: string }) => {
      const { data } = await api.post<ApiEnvelope<any>>("/admin/super/create-admin", payload);
      return data.data;
    },
    onSuccess: () => {
      setFeedback({ type: "success", msg: "Administrator account provisioned successfully." });
      setAdminName("");
      setAdminPhone("");
      setAdminEmail("");
      setTimeout(() => setFeedback(null), 5000);
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: getErrorMessage(err) || "Failed to provision administrator" });
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleanPhone = adminPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setFeedback({ type: "error", msg: "Please enter a valid 10-digit mobile number." });
      return;
    }
    createAdminMutation.mutate({
      name: adminName.trim(),
      phone: cleanPhone,
      email: adminEmail.trim() || undefined,
    });
  };

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting="Operations Admin & Governance Settings"
        subtitle="Marketplace parameters, territorial boundaries, operational settings, and Super Admin provisioning"
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto", width: "100%" }}>
          {feedback && (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "14px",
                backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
                border: `1px solid ${feedback.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                color: feedback.type === "success" ? "#065f46" : "#991b1b",
                fontSize: "13.5px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.msg}</span>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              alignItems: "start",
            }}
          >
            {/* System Platform Status */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "18px",
                border: "1px solid #e1e8e2",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    backgroundColor: "#ecfdf5",
                    color: "#063c32",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Server size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                    Platform Architecture
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Operational backend &amp; database cluster
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ padding: "12px", backgroundColor: "#f8faf8", borderRadius: "10px", border: "1px solid #edf2ee" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#62746a", textTransform: "uppercase" }}>
                    Active Role
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#063c32", marginTop: "2px" }}>
                    {currentUser?.role_name || currentUser?.role || "ADMIN"}
                  </div>
                </div>

                <div style={{ padding: "12px", backgroundColor: "#f8faf8", borderRadius: "10px", border: "1px solid #edf2ee" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#62746a", textTransform: "uppercase" }}>
                    Marketplace Territory
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#063c32", marginTop: "2px" }}>
                    Solapur Municipal Corporation &amp; Mandi Fleet
                  </div>
                </div>

                <div style={{ padding: "12px", backgroundColor: "#f8faf8", borderRadius: "10px", border: "1px solid #edf2ee" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#62746a", textTransform: "uppercase" }}>
                    Delivery Service Range
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#063c32", marginTop: "2px" }}>
                    Up to 15.0 KM (Express), Max 20.0 KM (Extended Solapur Zone)
                  </div>
                </div>

                <div style={{ padding: "12px", backgroundColor: "#f8faf8", borderRadius: "10px", border: "1px solid #edf2ee" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#62746a", textTransform: "uppercase" }}>
                    Shared PostgreSQL Backend
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#059669", marginTop: "2px" }}>
                    ✓ Connected (Single Source of Truth)
                  </div>
                </div>
              </div>
            </div>

            {/* Super Admin: Provision New Admin */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "18px",
                border: "1px solid #e1e8e2",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    backgroundColor: "#f5f3ff",
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                    Provision Administrator
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    {isSuperAdmin ? "Super Admin privileged control" : "Requires Super Admin authorization"}
                  </p>
                </div>
              </div>

              {isSuperAdmin ? (
                <form onSubmit={handleCreateAdmin}>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                      Administrator Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patil"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      style={{
                        width: "100%",
                        height: "42px",
                        padding: "0 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1dbd4",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                      Mobile Number (10 digits)
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value.replace(/\D/g, ""))}
                      style={{
                        width: "100%",
                        height: "42px",
                        padding: "0 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1dbd4",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#063c32", marginBottom: "6px" }}>
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="admin@vegito.in"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      style={{
                        width: "100%",
                        height: "42px",
                        padding: "0 12px",
                        borderRadius: "10px",
                        border: "1px solid #d1dbd4",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={createAdminMutation.isPending || !adminName.trim() || adminPhone.length !== 10}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: "#063c32",
                      color: "#ffffff",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      cursor: createAdminMutation.isPending ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {createAdminMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Provision Admin Account</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    backgroundColor: "#f8faf8",
                    border: "1px solid #edf2ee",
                    textAlign: "center",
                    color: "#62746a",
                  }}
                >
                  <Lock size={28} style={{ margin: "0 auto 8px", color: "#9ca3af" }} />
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>
                    Admin provisioning is restricted to Super Administrator accounts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

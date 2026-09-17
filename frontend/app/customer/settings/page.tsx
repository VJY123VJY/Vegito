"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, Shield, Bell, MapPin, Check, User } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { clearSession, getStoredUserName } from "@/lib/api/auth";

export default function CustomerSettingsPage() {
  const router = useRouter();
  const userName = getStoredUserName();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleLogout() {
    clearSession();
    router.push("/auth/login");
  }

  function handleSavePreferences() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <DashboardShell
      role="customer"
      userName={userName}
      userRole="Customer"
      greeting="Account Settings"
      subtitle="Preferences, service zone, and account management"
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        {saved && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 18px",
              borderRadius: "12px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13.5px",
              fontWeight: 600,
            }}
          >
            <Check size={18} />
            Preferences saved!
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Service Area */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <MapPin size={20} color="#16835b" />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                Delivery Region
              </h3>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#62746a" }}>
              Vegito V1 operates direct farm-to-doorstep delivery across Solapur Municipal Corporation.
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#e8f5ec",
                color: "#16835b",
                padding: "8px 14px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              📍 Solapur, Maharashtra (Active Zone)
            </div>
          </div>

          {/* Preferences */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Bell size={20} color="#16835b" />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                Notifications & Audio
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div>
                  <strong style={{ fontSize: "13.5px", color: "#222c1d" }}>Real-time Delivery Chime</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Play audible chime when order status updates to Out for Delivery
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#16835b", cursor: "pointer" }}
                />
              </label>

              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div>
                  <strong style={{ fontSize: "13.5px", color: "#222c1d" }}>Order Status Updates</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Receive in-app alerts when seller accepts and packs your harvest
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={orderAlerts}
                  onChange={(e) => setOrderAlerts(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#16835b", cursor: "pointer" }}
                />
              </label>
            </div>

            <button
              onClick={handleSavePreferences}
              style={{
                marginTop: "18px",
                backgroundColor: "#16835b",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Save Preferences
            </button>
          </div>

          {/* Logout Section */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #fee2e2",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 800, color: "#991b1b" }}>
              Sign Out
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#62746a" }}>
              Sign out of your Vegito customer session on this device.
            </p>
            <button
              onClick={handleLogout}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                fontSize: "13.5px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <LogOut size={16} /> Logout from Customer Account
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

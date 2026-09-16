"use client";

import React, { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { Settings, Bell, Shield, Smartphone, Check } from "lucide-react";

export default function SellerSettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <RoleGuard allow={["SELLER", "ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="seller"
        userName="Green Farm Store"
        userRole="Verified Seller"
        greeting="Store Settings"
        subtitle="Configure order notifications, store dispatch preferences, and security"
        searchPlaceholder="Search settings..."
      >
        <div style={{ maxWidth: "700px" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
            Store Notifications & Dispatch Preferences
          </h2>

          {saved && (
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
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Check size={18} /> Settings saved successfully!
            </div>
          )}

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Bell size={20} color="#16835b" />
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#063c32" }}>
                    New Order Sound Chime
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Play audible ring when customers place fresh produce orders
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={(e) => setSoundAlerts(e.target.checked)}
                style={{ width: "20px", height: "20px", accentColor: "#16835b" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Smartphone size={20} color="#16835b" />
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#063c32" }}>
                    SMS Order Alerts
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Receive immediate dispatch alerts on your registered phone
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                style={{ width: "20px", height: "20px", accentColor: "#16835b" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Shield size={20} color="#16835b" />
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#063c32" }}>
                    Strict Low-Stock Warnings
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#62746a" }}>
                    Highlight items approaching minimum harvest inventory threshold
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                style={{ width: "20px", height: "20px", accentColor: "#16835b" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
              <button
                onClick={handleSave}
                style={{
                  padding: "10px 22px",
                  borderRadius: "10px",
                  backgroundColor: "#16835b",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "13.5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

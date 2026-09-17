"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, Volume2, Bell, MapPin, Check, Shield } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { clearSession, getStoredUserName } from "@/lib/api/auth";
import { playNotificationSound } from "@/lib/audio/chime";

export default function DeliverySettingsPage() {
  const router = useRouter();
  const userName = getStoredUserName();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gpsThrottling, setGpsThrottling] = useState("5s");
  const [testSuccess, setTestSuccess] = useState(false);

  function handleLogout() {
    clearSession();
    router.push("/auth/login");
  }

  function handleTestSound() {
    playNotificationSound();
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 2500);
  }

  return (
    <DashboardShell
      role="delivery"
      userName={userName || "Delivery Partner"}
      userRole="Delivery Fleet Partner"
      greeting="Fleet Partner Settings"
      subtitle="Alert ringtone preferences, location sync interval, and device session"
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        {testSuccess && (
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
            Played synthesized notification ringtone chime successfully!
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Audio Chime Settings */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <Volume2 size={20} color="#063c32" />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                Ringtone & Audio Alerts
              </h3>
            </div>

            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#62746a" }}>
              Web Audio API synthesized 3-tone chime that triggers automatically when a shop packs an order.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleTestSound}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#063c32",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Volume2 size={16} /> Test Audio Ringtone
              </button>
            </div>
          </div>

          {/* GPS Throttling Configuration */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <MapPin size={20} color="#063c32" />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                Mapbox & Live GPS Throttling
              </h3>
            </div>

            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#62746a" }}>
              Controls how frequently your device broadcasts location coordinates to the customer map (5s standard).
            </p>

            <select
              value={gpsThrottling}
              onChange={(e) => setGpsThrottling(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "13px",
                fontWeight: 600,
                color: "#374151",
                backgroundColor: "#ffffff",
              }}
            >
              <option value="3.5s">High Frequency (3.5 seconds)</option>
              <option value="5s">Standard Balanced (5 seconds)</option>
              <option value="10s">Battery Saver (10 seconds)</option>
            </select>
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
              Fleet Session Sign Out
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#62746a" }}>
              Sign out from this vehicle device. You will stop receiving delivery dispatches until you sign back in.
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
              <LogOut size={16} /> Logout from Delivery Fleet
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

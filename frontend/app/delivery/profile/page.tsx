"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Truck, ShieldCheck, Check, AlertCircle, RefreshCw, Phone, Mail } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDeliveryProfile, updateDeliveryProfile, DeliveryProfileData } from "@/lib/api/delivery";
import { getStoredUserName, setStoredUserName } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

export default function DeliveryProfilePage() {
  const queryClient = useQueryClient();
  const userName = getStoredUserName();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("Motorcycle");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const profile = useQuery({
    queryKey: ["delivery-profile"],
    queryFn: getDeliveryProfile,
  });

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.name || "");
      setPhone(profile.data.phone || "");
      setVehicleType(profile.data.vehicle_type || "Motorcycle");
      setVehicleNumber(profile.data.vehicle_number || "");
      setIsAvailable(profile.data.is_available ?? true);
    }
  }, [profile.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      name?: string;
      phone?: string;
      vehicle_type?: string;
      vehicle_number?: string;
      is_available?: boolean;
    }) => updateDeliveryProfile(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-profile"] });
      if (data.name) {
        setStoredUserName(data.name);
      }
      setToast({ type: "success", text: "Delivery profile updated successfully!" });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      setToast({ type: "error", text: getErrorMessage(err) });
      setTimeout(() => setToast(null), 3000);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      name,
      phone,
      vehicle_type: vehicleType,
      vehicle_number: vehicleNumber,
      is_available: isAvailable,
    });
  }

  const p = profile.data;

  return (
    <DashboardShell
      role="delivery"
      userName={name || userName || "Delivery Partner"}
      userRole="Delivery Fleet Partner"
      greeting="Fleet Partner Profile"
      subtitle="Vehicle credentials, delivery status, and personal details"
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
            <p style={{ margin: 0, fontWeight: 700 }}>Loading fleet profile...</p>
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
                padding: "24px 28px",
                backgroundColor: "#063c32",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    backgroundColor: "#16835b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  🚴
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                    {p?.name || name || "Delivery Partner"}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "rgba(255,255,255,0.75)" }}>
                    Vehicle: {p?.vehicle_type || "Motorcycle"} ({p?.vehicle_number || "MH-13"})
                  </p>
                </div>
              </div>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: p?.is_verified ? "#15803d" : "#ca8a04",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                <ShieldCheck size={14} /> {p?.is_verified ? "Verified Partner" : "Verification Pending"}
              </span>
            </div>

            {/* Edit form */}
            <form onSubmit={handleSubmit} style={{ padding: "28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                      Vehicle Type
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="EV Scooter">EV Scooter</option>
                      <option value="Bicycle">Bicycle</option>
                      <option value="Three-Wheeler Cargo">Three-Wheeler Cargo</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                      Vehicle Registration Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MH-13-AB-1234"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                      Registered Email
                    </label>
                    <input
                      type="email"
                      value={p?.email || ""}
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
                  </div>
                </div>

                {/* Duty Availability Toggle */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#f9fafb",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "14px", color: "#111827" }}>On-Duty Availability Status</strong>
                    <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#6b7280" }}>
                      When enabled, your profile is eligible for automatic order packing dispatches in Solapur.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    style={{ width: "20px", height: "20px", accentColor: "#16835b", cursor: "pointer" }}
                  />
                </div>

                <div style={{ marginTop: "10px" }}>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    style={{
                      backgroundColor: "#063c32",
                      color: "#ffffff",
                      padding: "12px 24px",
                      borderRadius: "10px",
                      border: "none",
                      fontWeight: 800,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Fleet Profile"}
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

"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAddresses, createAddress, deleteAddress } from "@/lib/api/addresses";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AddressPickerMap, SelectedAddressCoords } from "@/components/map/address-picker-map";
import { MapPin, Plus, Trash2, CheckCircle, Home, Briefcase } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";

export default function CustomerAddressesPage() {
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: ["customer-addresses"], queryFn: listAddresses });
  const [showPicker, setShowPicker] = useState(false);
  const [addressType, setAddressType] = useState("HOME");
  const [error, setError] = useState("");

  const addAddressMutation = useMutation({
    mutationFn: (coords: SelectedAddressCoords) =>
      createAddress({
        address_line1: coords.address_line1,
        city: coords.city,
        state: "Maharashtra",
        country: "India",
        pincode: coords.pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address_type: addressType,
        is_default: (addresses.data ?? []).length === 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
      setShowPicker(false);
      setError("");
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: number) => deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
    },
  });

  return (
    <DashboardShell
      role="customer"
      greeting="My Saved Addresses"
      subtitle="Manage your delivery destinations in Solapur"
    >
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
              Delivery Addresses
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
              Save accurate doorstep coordinates for rapid vegetable delivery.
            </p>
          </div>

          <button
            onClick={() => setShowPicker(!showPicker)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              backgroundColor: "#063c32",
              color: "#ffffff",
              borderRadius: "12px",
              border: "none",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> {showPicker ? "Cancel" : "Add New Address"}
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "10px", marginBottom: "20px", fontSize: "13px", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Mapbox Address Picker */}
        {showPicker && (
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "18px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 4px 16px rgba(6, 60, 50, 0.06)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                Select Delivery Location on Map
              </h3>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#62746a" }}>
                Search your address or drag the pin directly onto your doorstep.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              {["HOME", "WORK", "OTHER"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAddressType(type)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${addressType === type ? "#063c32" : "#e1e8e2"}`,
                    backgroundColor: addressType === type ? "#e9f6ee" : "#ffffff",
                    color: addressType === type ? "#063c32" : "#62746a",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            <AddressPickerMap
              onConfirmLocation={(coords) => addAddressMutation.mutate(coords)}
              height="360px"
            />
          </div>
        )}

        {/* Saved Addresses List */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {(addresses.data ?? []).map((addr) => (
            <div
              key={addr.id}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e1e8e2",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {addr.address_type === "WORK" ? (
                      <Briefcase size={16} color="#16835b" />
                    ) : (
                      <Home size={16} color="#16835b" />
                    )}
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#063c32" }}>
                      {addr.address_type || "HOME"}
                    </span>
                    {addr.is_default && (
                      <span style={{ fontSize: "11px", backgroundColor: "#e9f6ee", color: "#16835b", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                        Default
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => deleteAddressMutation.mutate(addr.id)}
                    style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: "4px" }}
                    title="Delete address"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p style={{ margin: "0 0 6px", fontSize: "13.5px", color: "#13221b", fontWeight: 600 }}>
                  {addr.address_line1}
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#62746a" }}>
                  {addr.city}, {addr.state} · {addr.pincode}
                </p>

                {addr.latitude && addr.longitude && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "10px" }}>
                    <MapPin size={12} color="#16835b" />
                    <span style={{ fontSize: "11px", color: "#16835b", fontWeight: 700 }}>
                      GPS: {Number(addr.latitude).toFixed(4)}, {Number(addr.longitude).toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, ChevronDown, Check, Plus, X, Crosshair, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listAddresses, Address } from "@/lib/api/addresses";
import { saveStoredLocation } from "@/components/location/location-modal";
import { getFreshDeviceCoordinates, reverseGeocode } from "@/lib/api/location-helper";

interface AddressSelectorProps {
  selectedAddressId: number | null;
  onSelectAddress: (address: Address) => void;
}

export function AddressSelector({ selectedAddressId, onSelectAddress }: AddressSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsMsg, setGpsMsg] = useState("");

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: listAddresses,
  });

  const addressList = addressesQuery.data ?? [];
  const selectedAddress =
    addressList.find((a) => a.id === selectedAddressId) ||
    addressList.find((a) => a.is_default) ||
    addressList[0] ||
    null;

  // Auto-sync customer's primary address to customer location state on load
  useEffect(() => {
    if (selectedAddress) {
      if (selectedAddress.id !== selectedAddressId) {
        onSelectAddress(selectedAddress);
      }
      saveStoredLocation({
        address: `${selectedAddress.address_line1}, ${selectedAddress.city}`,
        city: selectedAddress.city,
        pincode: selectedAddress.pincode,
        latitude: selectedAddress.latitude != null ? Number(selectedAddress.latitude) : undefined,
        longitude: selectedAddress.longitude != null ? Number(selectedAddress.longitude) : undefined,
      });
    }
  }, [selectedAddress, selectedAddressId, onSelectAddress]);

  const handleSelect = (addr: Address) => {
    onSelectAddress(addr);
    saveStoredLocation({
      address: `${addr.address_line1}, ${addr.city}`,
      city: addr.city,
      pincode: addr.pincode,
      latitude: addr.latitude != null ? Number(addr.latitude) : undefined,
      longitude: addr.longitude != null ? Number(addr.longitude) : undefined,
    });
    setModalOpen(false);
  };

  const handleDetectCurrentGps = async () => {
    setDetectingGps(true);
    setGpsMsg("");
    try {
      const coords = await getFreshDeviceCoordinates();
      let addrLine = `Doorstep GPS (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
      let cityStr = "";
      let pinStr = "";
      try {
        const geo = await reverseGeocode(coords.latitude, coords.longitude);
        if (geo?.place_name || geo?.address_line1) {
          addrLine = (geo.place_name || geo.address_line1) as string;
          cityStr = geo.city || "";
          pinStr = geo.pincode || "";
        }
      } catch {
        // fallback to coords
      }
      saveStoredLocation({
        address: addrLine,
        city: cityStr,
        pincode: pinStr,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setGpsMsg(`✓ GPS captured: ${addrLine.split(",")[0]}`);
      setTimeout(() => {
        setModalOpen(false);
        setGpsMsg("");
      }, 1000);
    } catch (err: any) {
      setGpsMsg(err?.message || "Could not detect GPS location.");
    } finally {
      setDetectingGps(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e1e8e2",
          boxShadow: "0 2px 6px rgba(6, 60, 50, 0.03)",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              backgroundColor: "#e9f6ee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16835b",
              flexShrink: 0,
            }}
          >
            <MapPin size={18} />
          </div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#62746a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Delivering to
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <strong style={{ fontSize: "13.5px", color: "#063c32" }}>
                {selectedAddress?.address_type || "Delivery Point"}
              </strong>
              <span style={{ color: "#94a3b8" }}>·</span>
              <span style={{ fontSize: "13px", color: "#475569", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedAddress
                  ? `${selectedAddress.address_line1}, ${selectedAddress.city}`
                  : "No address set (Tap to choose)"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            borderRadius: "8px",
            backgroundColor: "#f4f7f3",
            border: "1px solid #d8e5dc",
            color: "#16835b",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Change <ChevronDown size={14} />
        </button>
      </div>

      {/* Change Address Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(6, 60, 50, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              border: "1px solid #e1e8e2",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#063c32" }}>
                Select Delivery Address
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#62746a",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Live Device GPS Detection */}
            <div style={{ marginBottom: "16px" }}>
              <button
                type="button"
                onClick={handleDetectCurrentGps}
                disabled={detectingGps}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  backgroundColor: "#e9f6ee",
                  border: "1.5px solid #16835b",
                  color: "#063c32",
                  fontSize: "13px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: detectingGps ? "not-allowed" : "pointer",
                }}
              >
                {detectingGps ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} color="#16835b" />}
                {detectingGps ? "Detecting real GPS location..." : "Use my current device location"}
              </button>
              {gpsMsg && (
                <div style={{ fontSize: "11.5px", marginTop: "6px", color: gpsMsg.startsWith("✓") ? "#15803d" : "#b91c1c", fontWeight: 600, textAlign: "center" }}>
                  {gpsMsg}
                </div>
              )}
            </div>

            {addressList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#62746a" }}>
                <p style={{ margin: "0 0 12px", fontSize: "14px" }}>No saved addresses found.</p>
                <Link
                  href="/customer/addresses"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    backgroundColor: "#16835b",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <Plus size={16} /> Add New Address
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto", marginBottom: "18px" }}>
                {addressList.map((addr) => {
                  const isSelected = addr.id === (selectedAddress?.id ?? selectedAddressId);
                  return (
                    <div
                      key={addr.id}
                      onClick={() => handleSelect(addr)}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: isSelected ? "2px solid #16835b" : "1px solid #e1e8e2",
                        backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                          <strong style={{ fontSize: "14px", color: "#063c32" }}>
                            {addr.address_type || "Address"}
                          </strong>
                          {addr.is_default && (
                            <span style={{ fontSize: "10.5px", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#e9f6ee", color: "#16835b", fontWeight: 700 }}>
                              Default
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: "12.5px", color: "#475569" }}>
                          {addr.address_line1}{addr.landmark ? `, ${addr.landmark}` : ""}, {addr.city} - {addr.pincode}
                        </p>
                      </div>
                      {isSelected && <Check size={18} color="#16835b" />}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f2", paddingTop: "14px" }}>
              <Link
                href="/customer/addresses"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#16835b",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <Plus size={15} /> Add New Address
              </Link>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "10px",
                  backgroundColor: "#063c32",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

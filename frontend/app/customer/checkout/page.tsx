"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, MapPin, Plus, ShoppingBasket, Crosshair, Loader2, AlertCircle } from "lucide-react";
import { createAddress, listAddresses, updateAddress } from "@/lib/api/addresses";
import { createOrder } from "@/lib/api/orders";
import { api, type ApiEnvelope, getErrorMessage } from "@/lib/api/client";
import { getCart } from "@/lib/api/cart";
import { getPublicSellerAvailability } from "@/lib/api/seller-products";
import {
  detectLocationAndValidateEligibility,
  getFreshDeviceCoordinates,
  type LocationDetectionState,
} from "@/lib/api/location-helper";
import type { DeliveryEligibilityData } from "@/lib/api/customers";

export default function CheckoutPage() {
  const client = useQueryClient();
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: listAddresses });
  const cart = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const sellerAvailability = useQuery({
    queryKey: ["public-seller-availability"],
    queryFn: getPublicSellerAvailability,
    refetchInterval: 15000,
  });

  const [selectedAddress, setSelectedAddress] = useState<number>();
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [line, setLine] = useState("");
  const [city, setCity] = useState("Solapur");
  const [stateName, setStateName] = useState("Maharashtra");
  const [pincode, setPincode] = useState("");
  const [addressType, setAddressType] = useState("HOME");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [eligibilityData, setEligibilityData] = useState<DeliveryEligibilityData | null>(null);
  const [locState, setLocState] = useState<LocationDetectionState>({ status: "idle" });
  const [isLocating, setIsLocating] = useState(false);
  const [slot, setSlot] = useState("today-evening");
  const [confirmed, setConfirmed] = useState<{ id: number; orderNumber: string; otp?: string | null }>();
  const [error, setError] = useState("");

  const deliveryFeeQuery = useQuery({
    queryKey: ["delivery-fee", selectedAddress],
    queryFn: async () => {
      if (!selectedAddress) return null;
      const { data } = await api.get<ApiEnvelope<{
        address_id: number;
        distance_km: number;
        delivery_fee: number;
        max_allowed_km: number;
        seller_online?: boolean;
        is_deliverable?: boolean;
      }>>("/orders/delivery-fee", {
        params: {
          address_id: selectedAddress,
        },
      });
      return data.data;
    },
    enabled: !!selectedAddress,
    retry: false,
  });

  const addAddress = useMutation({
    mutationFn: () => {
      if (!coordinates) {
        throw new Error("Real GPS coordinates are required. Please tap 'Use my current location' to capture your delivery point.");
      }
      if (eligibilityData && !eligibilityData.is_eligible) {
        throw new Error(eligibilityData.message || "This address is outside our 20 km delivery area.");
      }
      return createAddress({
        address_line1: line.trim(),
        city: city || "Solapur",
        state: stateName || "Maharashtra",
        country: "India",
        pincode: pincode.trim() || "413001",
        address_type: addressType,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
    },
    onSuccess: (address) => {
      client.invalidateQueries({ queryKey: ["addresses"] });
      setSelectedAddress(address.id);
      setShowNewAddress(false);
      setLine("");
      setPincode("");
      setCoordinates(undefined);
      setEligibilityData(null);
      setLocState({ status: "idle" });
      setError("");
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const placeOrder = useMutation({
    mutationFn: () => createOrder({ address_id: selectedAddress as number, payment_method: "COD", delivery_slot_start: slot === "morning" ? new Date().toISOString() : undefined }),
    onSuccess: (order) => { client.invalidateQueries({ queryKey: ["cart"] }); setConfirmed({ id: order.id, orderNumber: order.order_number, otp: order.delivery_otp }); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  async function handleUseCurrentLocation() {
    setIsLocating(true);
    setError("");
    try {
      const res = await detectLocationAndValidateEligibility((st) => {
        setLocState(st);
      });
      setCoordinates(res.coordinates);
      const autofillLine = res.address.address_line1 || res.address.place_name || "";
      const autofillPin = res.address.pincode || "413001";
      const autofillCity = res.address.city || "Solapur";
      const autofillState = res.address.state || "Maharashtra";

      setLine(autofillLine);
      setPincode(autofillPin);
      setCity(autofillCity);
      setStateName(autofillState);
      setEligibilityData(res.eligibility);
    } catch (err: any) {
      // Error is set in locState
    } finally {
      setIsLocating(false);
    }
  }

  function submitAddress(event: FormEvent) {
    event.preventDefault();
    if (!coordinates) {
      setError("Please tap 'Use my current location' to detect your doorstep GPS coordinates.");
      return;
    }
    if (eligibilityData && !eligibilityData.is_eligible) {
      setError("This address is outside our 15 KM delivery area. Please select a closer delivery address.");
      return;
    }
    if (line.trim() && pincode.trim().length >= 5) {
      addAddress.mutate();
    }
  }

  const isSellerOnline = deliveryFeeQuery.data?.seller_online ?? sellerAvailability.data?.is_online ?? true;
  const distanceKm = deliveryFeeQuery.data?.distance_km;
  const isDistanceValid = distanceKm !== undefined ? distanceKm <= 20.0 : !deliveryFeeQuery.isError;
  const isDeliverable = isDistanceValid && !deliveryFeeQuery.isError && isSellerOnline;

  if (confirmed) return <main className="simple-page"><section className="empty-inline"><CheckCircle2 size={38} color="var(--vegito-success)" /><b>Order {confirmed.orderNumber} placed</b><span>Your COD order is now recorded in Vegito.</span>{confirmed.otp ? <strong>Delivery OTP: {confirmed.otp}</strong> : null}<Link className="primary-action" href={`/customer/orders/${confirmed.id}`}>Track order</Link></section></main>;
  if (cart.isLoading || addresses.isLoading) return <main className="simple-page"><p className="helper">Preparing secure checkout...</p></main>;
  if (!cart.data?.items.length) return <main className="simple-page"><h1>Your basket is empty</h1><Link className="primary-action" href="/categories">Browse produce</Link></main>;

  return <main className="simple-page cart-page"><Link className="back-link" href="/customer/cart"><ArrowLeft size={16} /> Back to basket</Link><h1>Checkout</h1><p className="helper">Vegito Solapur delivery network (within 20 KM of shop).</p>

    {/* Seller Availability Banner */}
    <div
      style={{
        padding: "12px 18px",
        borderRadius: "12px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: isSellerOnline ? "#f0fdf4" : "#fef2f2",
        border: isSellerOnline ? "1px solid #bbf7d0" : "1.5px solid #fecaca",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "14px" }}>{isSellerOnline ? "🟢" : "🔴"}</span>
        <div>
          <strong style={{ fontSize: "13.5px", color: isSellerOnline ? "#166534" : "#991b1b" }}>
            {isSellerOnline ? "Seller is available" : "Seller is currently offline"}
          </strong>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: isSellerOnline ? "#15803d" : "#b91c1c" }}>
            {isSellerOnline
              ? "Shop is accepting new farm-fresh vegetable orders."
              : "Seller is currently offline. Please try again later."}
          </p>
        </div>
      </div>
    </div>

    {error && (
      <div style={{ padding: "12px 16px", backgroundColor: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: "12px", color: "#dc2626", fontSize: "13px", fontWeight: 700, marginBottom: "16px" }}>
        ✕ {error}
      </div>
    )}

    <section className="checkout-panel"><div className="section-head"><div><p className="section-kicker">DELIVERY ADDRESS</p><h2>Where should we deliver?</h2></div><MapPin size={22} color="var(--vegito-accent)" /></div>
      <div className="address-options">{addresses.data?.map((address) => <button type="button" className={`address-option ${selectedAddress === address.id ? "selected" : ""}`} key={address.id} onClick={() => setSelectedAddress(address.id)}><b>{address.address_type || "Address"}</b><span>{address.address_line1}, {address.city} {address.pincode}</span></button>)}</div>
      <button type="button" className="text-button" onClick={() => setShowNewAddress(!showNewAddress)}><Plus size={15} /> Add Solapur address</button>
      {showNewAddress ? (
        <form className="address-form" onSubmit={submitAddress} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#063c32" }}>New Delivery Address</span>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["HOME", "WORK", "OTHER"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAddressType(type)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: `1.5px solid ${addressType === type ? "#063c32" : "#e1e8e2"}`,
                    backgroundColor: addressType === type ? "#e9f6ee" : "#ffffff",
                    color: addressType === type ? "#063c32" : "#62746a",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Use my current location CTA button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              backgroundColor: "#e9f6ee",
              color: "#063c32",
              border: "1.5px solid #16835b",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: isLocating ? "not-allowed" : "pointer",
            }}
          >
            {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} color="#16835b" />}
            {isLocating ? "Detecting your location..." : "Use my current location"}
          </button>

          {/* Location State & 15 KM Delivery Eligibility Card */}
          {isLocating || locState.status === "detecting_gps" || locState.status === "reverse_geocoding" || locState.status === "checking_eligibility" ? (
            <div style={{ padding: "10px 14px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", fontSize: "12.5px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
              <Loader2 size={14} className="animate-spin" />
              <span>{"message" in locState ? locState.message : "Detecting location..."}</span>
            </div>
          ) : null}

          {locState.status === "error" ? (
            <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", fontSize: "12.5px", color: "#b91c1c", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={14} />
              <span>{locState.message} You can also enter your address details manually below.</span>
            </div>
          ) : null}

          {eligibilityData ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                backgroundColor: eligibilityData.is_eligible ? "#f0fdf4" : "#fef2f2",
                border: eligibilityData.is_eligible ? "1.5px solid #86efac" : "1.5px solid #f87171",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 800, color: eligibilityData.is_eligible ? "#166534" : "#991b1b" }}>
                  {eligibilityData.is_eligible ? "✓ Location captured & address detected" : "✕ Outside 20 KM delivery area"}
                </span>
                <span style={{ fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "999px", backgroundColor: eligibilityData.is_eligible ? "#dcfce7" : "#fee2e2", color: eligibilityData.is_eligible ? "#15803d" : "#dc2626" }}>
                  {eligibilityData.is_eligible ? "Eligible" : "Outside Area"}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: eligibilityData.is_eligible ? "#15803d" : "#b91c1c" }}>
                Delivering from: <strong>{eligibilityData.seller_name || "Vegito Seller"}</strong> · Distance: <strong>{eligibilityData.distance_km} KM</strong>
              </p>
              {!eligibilityData.is_eligible ? (
                <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#991b1b" }}>
                  We currently deliver within 20 km of our seller. This address cannot be used for delivery.
                </p>
              ) : null}
            </div>
          ) : null}

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>
            Address / House, street, area
            <input
              required
              value={line}
              onChange={(event) => setLine(event.target.value)}
              placeholder="House/flat no., street, area"
              style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>
              City
              <input
                required
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Solapur"
                style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600, color: "#374151" }}>
              Solapur pincode
              <input
                required
                inputMode="numeric"
                value={pincode}
                onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="413001"
                style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px" }}
              />
            </label>
          </div>

          <button
            type="submit"
            className="primary-action"
            disabled={addAddress.isPending || isLocating || (eligibilityData ? !eligibilityData.is_eligible : false) || !line.trim()}
            style={{
              opacity: (eligibilityData && !eligibilityData.is_eligible) ? 0.6 : 1,
              cursor: (eligibilityData && !eligibilityData.is_eligible) ? "not-allowed" : "pointer"
            }}
          >
            {addAddress.isPending
              ? "Saving address..."
              : eligibilityData && !eligibilityData.is_eligible
              ? "Outside Delivery Area (Cannot Save)"
              : "Save address"}
          </button>
        </form>
      ) : null}
    </section>

    {/* Delivery Distance & 15 KM Radius Validation Card */}
    {selectedAddress && deliveryFeeQuery.data ? (
      <div
        style={{
          padding: "14px 18px",
          borderRadius: "14px",
          margin: "16px 0",
          backgroundColor: isDistanceValid ? "#f0fdf4" : "#fef2f2",
          border: isDistanceValid ? "1.5px solid #86efac" : "1.5px solid #f87171",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: isDistanceValid ? "#166534" : "#991b1b" }}>
            Delivery distance: {deliveryFeeQuery.data.distance_km} KM
          </span>
          <span style={{ fontSize: "12px", fontWeight: 800, padding: "2px 8px", borderRadius: "999px", backgroundColor: isDistanceValid ? "#dcfce7" : "#fee2e2", color: isDistanceValid ? "#15803d" : "#dc2626" }}>
            {isDistanceValid ? "✓ Delivery available" : "✕ Delivery unavailable"}
          </span>
        </div>
        {!isDistanceValid ? (
          <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#b91c1c", fontWeight: 600 }}>
            Sorry, this delivery address is outside our 20 KM delivery area.
          </p>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#166534" }}>
            Within Solapur 20 KM coverage area from seller shop.
          </p>
        )}
      </div>
    ) : null}

    {deliveryFeeQuery.isError ? (
      <div style={{ padding: "14px 18px", backgroundColor: "#fef2f2", border: "1.5px solid #f87171", borderRadius: "14px", color: "#dc2626", fontWeight: 700, fontSize: "13.5px", margin: "16px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>✕ {getErrorMessage(deliveryFeeQuery.error) || "Sorry, this delivery address is outside our 20 KM delivery area."}</div>
        {getErrorMessage(deliveryFeeQuery.error)?.toLowerCase().includes("gps") && selectedAddress && (
          <div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const loc = await getFreshDeviceCoordinates();
                  await updateAddress(selectedAddress, { latitude: loc.latitude, longitude: loc.longitude });
                  client.invalidateQueries({ queryKey: ["addresses"] });
                  client.invalidateQueries({ queryKey: ["delivery-fee", selectedAddress] });
                } catch (e: any) {
                  setError(e?.message || "Could not detect GPS location.");
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                backgroundColor: "#16835b",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Crosshair size={14} /> Update Address with Current GPS
            </button>
          </div>
        )}
      </div>
    ) : null}

    <section className="cart-total">
      <span><ShoppingBasket size={16} /> Items <b>₹{Number(cart.data.subtotal).toFixed(2)}</b></span>
      <span>
        Delivery {deliveryFeeQuery.data ? `(${deliveryFeeQuery.data.distance_km} km)` : ""} <b>₹{(deliveryFeeQuery.data ? deliveryFeeQuery.data.delivery_fee : Number(cart.data.delivery_charge)).toFixed(2)}</b>
      </span>
      <strong>
        Total <b>₹{(Number(cart.data.subtotal) + (deliveryFeeQuery.data ? deliveryFeeQuery.data.delivery_fee : Number(cart.data.delivery_charge))).toFixed(2)}</b>
      </strong>
      <small>Payment method: Cash on delivery</small>

      {!isSellerOnline ? (
        <div style={{ padding: "8px 12px", backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "12.5px", fontWeight: 700, borderRadius: "8px", textAlign: "center", margin: "8px 0" }}>
          🔴 Seller is currently offline. Please try again later.
        </div>
      ) : null}

      <button
        className="primary-action"
        disabled={!selectedAddress || placeOrder.isPending || !isDeliverable}
        onClick={() => { setError(""); placeOrder.mutate(); }}
      >
        {placeOrder.isPending ? "Placing order..." : !isSellerOnline ? "Seller is Offline" : !isDistanceValid ? "Outside 20 KM Area" : "Place COD order"}
      </button>
    </section>
    {error ? <p className="form-error">{error}</p> : null}
  </main>;
}

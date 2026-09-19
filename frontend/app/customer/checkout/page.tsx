"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, MapPin, Plus, ShoppingBasket } from "lucide-react";
import { createAddress, listAddresses } from "@/lib/api/addresses";
import { createOrder } from "@/lib/api/orders";
import { api, type ApiEnvelope, getErrorMessage } from "@/lib/api/client";
import { getCart } from "@/lib/api/cart";
import { getPublicSellerAvailability } from "@/lib/api/seller-products";

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
  const [pincode, setPincode] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [locationMessage, setLocationMessage] = useState("");
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
      }>>("/orders/delivery-fee", { params: { address_id: selectedAddress } });
      return data.data;
    },
    enabled: !!selectedAddress,
    retry: false,
  });

  const addAddress = useMutation({
    mutationFn: () => createAddress({ address_line1: line, city: "Solapur", state: "Maharashtra", country: "India", pincode, address_type: "HOME", latitude: coordinates?.latitude, longitude: coordinates?.longitude }),
    onSuccess: (address) => { client.invalidateQueries({ queryKey: ["addresses"] }); setSelectedAddress(address.id); setShowNewAddress(false); setLine(""); setPincode(""); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const placeOrder = useMutation({
    mutationFn: () => createOrder({ address_id: selectedAddress as number, payment_method: "COD", delivery_slot_start: slot === "morning" ? new Date().toISOString() : undefined }),
    onSuccess: (order) => { client.invalidateQueries({ queryKey: ["cart"] }); setConfirmed({ id: order.id, orderNumber: order.order_number, otp: order.delivery_otp }); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function submitAddress(event: FormEvent) { event.preventDefault(); if (line && pincode.length >= 5) addAddress.mutate(); }

  const isSellerOnline = deliveryFeeQuery.data?.seller_online ?? sellerAvailability.data?.is_online ?? true;
  const distanceKm = deliveryFeeQuery.data?.distance_km;
  const isDistanceValid = distanceKm !== undefined ? distanceKm <= 15.0 : !deliveryFeeQuery.isError;
  const isDeliverable = isDistanceValid && !deliveryFeeQuery.isError && isSellerOnline;

  if (confirmed) return <main className="simple-page"><section className="empty-inline"><CheckCircle2 size={38} color="var(--vegito-success)" /><b>Order {confirmed.orderNumber} placed</b><span>Your COD order is now recorded in Vegito.</span>{confirmed.otp ? <strong>Delivery OTP: {confirmed.otp}</strong> : null}<Link className="primary-action" href={`/customer/orders/${confirmed.id}`}>Track order</Link></section></main>;
  if (cart.isLoading || addresses.isLoading) return <main className="simple-page"><p className="helper">Preparing secure checkout...</p></main>;
  if (!cart.data?.items.length) return <main className="simple-page"><h1>Your basket is empty</h1><Link className="primary-action" href="/categories">Browse produce</Link></main>;

  return <main className="simple-page cart-page"><Link className="back-link" href="/customer/cart"><ArrowLeft size={16} /> Back to basket</Link><h1>Checkout</h1><p className="helper">Vegito Solapur delivery network (within 15 KM of shop).</p>

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

    <section className="checkout-panel"><div className="section-head"><div><p className="section-kicker">DELIVERY ADDRESS</p><h2>Where should we deliver?</h2></div><MapPin size={22} color="var(--vegito-accent)" /></div>
      <div className="address-options">{addresses.data?.map((address) => <button type="button" className={`address-option ${selectedAddress === address.id ? "selected" : ""}`} key={address.id} onClick={() => setSelectedAddress(address.id)}><b>{address.address_type || "Address"}</b><span>{address.address_line1}, {address.city} {address.pincode}</span></button>)}</div>
      <button type="button" className="text-button" onClick={() => setShowNewAddress(!showNewAddress)}><Plus size={15} /> Add Solapur address</button>
      {showNewAddress ? <form className="address-form" onSubmit={submitAddress}><label>Address line<input required value={line} onChange={(event) => setLine(event.target.value)} placeholder="House, street, area" /></label><label>Solapur pincode<input required inputMode="numeric" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))} placeholder="413001" /></label><button type="button" className="text-button" onClick={() => { if (!navigator.geolocation) { setLocationMessage("Location detection is unavailable on this device."); return; } setLocationMessage("Requesting device location..."); navigator.geolocation.getCurrentPosition((position) => { setCoordinates({ latitude: Number(position.coords.latitude.toFixed(7)), longitude: Number(position.coords.longitude.toFixed(7)) }); setLocationMessage("Location captured for this address."); }, () => setLocationMessage("Location permission was denied. You can save the address without coordinates."), { enableHighAccuracy: true, timeout: 10000 }); }}>Use my current location</button>{locationMessage ? <small>{locationMessage}</small> : null}<button className="primary-action" disabled={addAddress.isPending}>{addAddress.isPending ? "Saving..." : "Save address"}</button></form> : null}
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
            Sorry, this delivery address is outside our 15 KM delivery area.
          </p>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#166534" }}>
            Within Solapur 15 KM coverage area from seller shop.
          </p>
        )}
      </div>
    ) : null}

    {deliveryFeeQuery.isError ? (
      <div style={{ padding: "14px 18px", backgroundColor: "#fef2f2", border: "1.5px solid #f87171", borderRadius: "14px", color: "#dc2626", fontWeight: 700, fontSize: "13.5px", margin: "16px 0" }}>
        ✕ {getErrorMessage(deliveryFeeQuery.error) || "Sorry, this delivery address is outside our 15 KM delivery area."}
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
        {placeOrder.isPending ? "Placing order..." : !isSellerOnline ? "Seller is Offline" : !isDistanceValid ? "Outside 15 KM Area" : "Place COD order"}
      </button>
    </section>
    {error ? <p className="form-error">{error}</p> : null}
  </main>;
}

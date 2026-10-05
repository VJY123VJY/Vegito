"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DeliveryPanel } from "@/components/seller/delivery-panel";
import { useQuery } from "@tanstack/react-query";
import { getSellerProfile } from "@/lib/api/seller-products";

export default function SellerDeliveriesPage() {
  const profile = useQuery({
    queryKey: ["seller-profile"],
    queryFn: getSellerProfile,
  });

  const businessName = profile.data?.business_name || "Solapur Fresh Mandi";

  return (
    <DashboardShell
      role="seller"
      userName={businessName}
      userRole="Seller & Delivery Partner"
      greeting={`Delivery Dispatch · ${businessName}`}
      subtitle="Multi-order batch routing (up to 10 orders), delivery bag checklist, and customer doorstep OTP verification"
    >
      <DeliveryPanel />
    </DashboardShell>
  );
}

"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OrdersPanel } from "@/components/seller/orders-panel";
import { useQuery } from "@tanstack/react-query";
import { getSellerProfile } from "@/lib/api/seller-products";

export default function SellerOrdersPage() {
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
      greeting={`Orders & Packing · ${businessName}`}
      subtitle="Accept incoming orders, pack produce using item checklists, and queue for delivery dispatch"
    >
      <OrdersPanel />
    </DashboardShell>
  );
}

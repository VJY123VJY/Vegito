"use client";

import React from "react";
import { RoleGuard } from "@/components/role/role-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SellerBulkOrders } from "@/components/seller/seller-bulk-orders";

export default function SellerBulkOrdersPage() {
  return (
    <RoleGuard allow={["SELLER", "ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="seller"
        userName="Solapur Mandi Seller"
        userRole="Seller Desk"
        greeting="B2B Bulk Orders"
        subtitle="Manage wholesale requests, stock reservations, and custom quotes"
      >
        <SellerBulkOrders />
      </DashboardShell>
    </RoleGuard>
  );
}

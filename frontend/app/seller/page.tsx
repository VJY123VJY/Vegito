"use client";

import { usePathname } from "next/navigation";
import { SellerDashboard } from "@/components/seller/seller-dashboard";
import { OrdersPanel } from "@/components/seller/orders-panel";
import { ProductPanel } from "@/components/seller/product-panel";
import { InventoryPanel } from "@/components/seller/inventory-panel";
import { DeliveryPanel } from "@/components/seller/delivery-panel";
import { MarketIntelligencePanel } from "@/components/seller/market-intelligence-panel";
import { PromotionsPanel } from "@/components/seller/promotions-panel";

export default function SellerPage() {
  const pathname = usePathname() || "/seller";

  if (pathname.includes("/orders")) return <OrdersPanel />;
  if (pathname.includes("/products")) return <ProductPanel />;
  if (pathname.includes("/inventory")) return <InventoryPanel />;
  if (pathname.includes("/deliveries")) return <DeliveryPanel />;
  if (pathname.includes("/market-intelligence")) return <MarketIntelligencePanel />;
  if (pathname.includes("/promotions")) return <PromotionsPanel />;

  return <SellerDashboard />;
}

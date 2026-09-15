"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Box, ClipboardList, Store, Truck, Users } from "lucide-react";
import { getAdminDashboard } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/client";
import styles from "@/styles/admin-panel.module.css";

export default function AdminPage() {
  const dashboard = useQuery({ queryKey: ["admin-dashboard"], queryFn: getAdminDashboard });
  if (dashboard.isLoading) return <main className="simple-page"><p className="helper">Loading operations dashboard...</p></main>;
  if (dashboard.isError || !dashboard.data) return <main className="simple-page"><h1>Operations dashboard</h1><p className="form-error">{dashboard.isError ? getErrorMessage(dashboard.error) : "Dashboard data is unavailable."}</p></main>;
  const data = dashboard.data;
  const cards = [[Users, "Customers", data.active_customers], [Store, "Sellers", data.active_sellers], [Truck, "Delivery partners", data.active_delivery_partners], [ClipboardList, "Total orders", data.total_orders], [Box, "Low stock", data.low_stock_count], [AlertTriangle, "Open complaints", data.open_complaints_count]] as const;
  return <main className={`simple-page ${styles.shell}`}><p className="section-kicker">SOLAPUR OPERATIONS</p><h1>Platform dashboard</h1><p className="helper">Live metrics from the Vegito database.</p><div className="metric-grid">{cards.map(([Icon, label, value]) => <section className={`metric-card ${styles.metric}`} key={label}><Icon size={19} /><span>{label}</span><strong>{value}</strong></section>)}</div><section className="cart-total"><span>Pending orders <b>{data.pending_orders}</b></span><span>Delivered orders <b>{data.delivered_orders}</b></span><strong>Paid revenue <b>₹{Number(data.total_revenue).toFixed(2)}</b></strong></section></main>;
}

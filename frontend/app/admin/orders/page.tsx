"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MapPin,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RoleGuard } from "@/components/role/role-guard";
import { getErrorMessage } from "@/lib/api/client";
import { listAdminOrders } from "@/lib/api/admin";

const PAGE_SIZE = 20;

const ORDER_STATUSES = [
  "ORDER_PLACED",
  "SELLER_ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "NEW",
  "ACCEPTED",
  "PACKING",
  "READY",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const cellStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #e8eee9",
  textAlign: "left",
  verticalAlign: "middle",
};

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", search, status, page],
    queryFn: () =>
      listAdminOrders({
        q: search.trim() || undefined,
        status: status || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        greeting="Order Management"
        subtitle="Review marketplace orders, payment status, and delivery assignments."
      >
        <section style={{ maxWidth: 1440, margin: "0 auto", width: "100%" }}>
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 22,
            }}
          >
            <div>
              <h1 style={{ margin: 0, color: "#123b2b", fontSize: 24, fontWeight: 750 }}>
                Orders <span style={{ color: "#718276", fontSize: 16, fontWeight: 600 }}>({total})</span>
              </h1>
              <p style={{ color: "#647469", fontSize: 13, margin: "5px 0 0" }}>
                Search by order number, customer name, or phone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void ordersQuery.refetch()}
              disabled={ordersQuery.isFetching}
              title="Refresh orders"
              aria-label="Refresh orders"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                color: "#14563b",
                background: "#fff",
                border: "1px solid #d8e3da",
                borderRadius: 8,
                cursor: ordersQuery.isFetching ? "wait" : "pointer",
              }}
            >
              <RefreshCw size={17} className={ordersQuery.isFetching ? "animate-spin" : undefined} />
            </button>
          </header>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                minWidth: 240,
                flex: "1 1 340px",
                maxWidth: 520,
                padding: "0 12px",
                height: 42,
                background: "#fff",
                border: "1px solid #d8e3da",
                borderRadius: 8,
                color: "#687a6d",
              }}
            >
              <Search size={17} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search orders or customers"
                aria-label="Search orders or customers"
                style={{ width: "100%", border: 0, outline: 0, color: "#183729", fontSize: 13 }}
              />
            </label>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              aria-label="Filter orders by status"
              style={{
                height: 42,
                minWidth: 175,
                padding: "0 12px",
                color: "#183729",
                background: "#fff",
                border: "1px solid #d8e3da",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((orderStatus) => (
                <option key={orderStatus} value={orderStatus}>
                  {orderStatus.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e0e8e1", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: 1050, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f5f8f5", color: "#52665a", fontSize: 11, textTransform: "uppercase" }}>
                  {["Order", "Customer", "Items / Address", "Total", "Payment", "Status", "Delivery", "Placed"].map((heading) => (
                    <th key={heading} style={{ ...cellStyle, paddingTop: 12, paddingBottom: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordersQuery.isLoading &&
                  Array.from({ length: 6 }, (_, index) => (
                    <tr key={`loading-${index}`}>
                      <td colSpan={8} style={{ ...cellStyle, color: "#829087" }}>
                        Loading orders…
                      </td>
                    </tr>
                  ))}

                {ordersQuery.isError && (
                  <tr>
                    <td colSpan={8} style={{ ...cellStyle, padding: 28, color: "#a52a2a", textAlign: "center" }}>
                      <p style={{ margin: "0 0 12px" }}>{getErrorMessage(ordersQuery.error)}</p>
                      <button type="button" onClick={() => void ordersQuery.refetch()} style={{ color: "#14563b", border: 0, background: "none", fontWeight: 700, cursor: "pointer" }}>
                        Try again
                      </button>
                    </td>
                  </tr>
                )}

                {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ ...cellStyle, padding: 42, textAlign: "center", color: "#6b7c70" }}>
                      <ClipboardList size={24} style={{ marginBottom: 8, color: "#688273" }} />
                      <div style={{ fontWeight: 700, color: "#244332" }}>No orders found</div>
                      <div style={{ marginTop: 4 }}>Try changing the search or status filter.</div>
                    </td>
                  </tr>
                )}

                {!ordersQuery.isError && orders.map((order) => (
                  <tr key={order.id}>
                    <td style={cellStyle}>
                      <div style={{ color: "#163d2c", fontWeight: 750 }}>{order.order_number}</div>
                      <div style={{ color: "#7a887e", fontSize: 11, marginTop: 3 }}>ID {order.id}</div>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ color: "#243b2d", fontWeight: 650 }}>{order.customer_name || "Customer"}</div>
                      {order.customer_phone && (
                        <a href={`tel:${order.customer_phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, color: "#66786d", fontSize: 12, textDecoration: "none" }}>
                          <Phone size={12} /> {order.customer_phone}
                        </a>
                      )}
                    </td>
                    <td style={{ ...cellStyle, maxWidth: 250 }}>
                      <div style={{ color: "#34483a" }}>{order.items_count} {order.items_count === 1 ? "item" : "items"}</div>
                      <div style={{ display: "flex", gap: 4, alignItems: "flex-start", marginTop: 4, color: "#758379", fontSize: 11 }}>
                        <MapPin size={12} style={{ flex: "0 0 auto", marginTop: 1 }} />
                        <span>{order.address || "No address recorded"}</span>
                      </div>
                    </td>
                    <td style={{ ...cellStyle, color: "#163d2c", fontWeight: 750, whiteSpace: "nowrap" }}>
                      {formatAmount(order.total_amount)}
                    </td>
                    <td style={cellStyle}>
                      <div style={{ color: "#34483a" }}>{order.payment_method.replaceAll("_", " ")}</div>
                      <div style={{ color: "#718176", fontSize: 11, marginTop: 3 }}>{order.payment_status.replaceAll("_", " ")}</div>
                    </td>
                    <td style={cellStyle}><StatusBadge status={order.status} /></td>
                    <td style={cellStyle}>
                      <div style={{ color: order.delivery_partner_name ? "#34483a" : "#879189" }}>
                        {order.delivery_partner_name || "Unassigned"}
                      </div>
                      {order.delivery_task_id && <div style={{ color: "#7a887e", fontSize: 11, marginTop: 3 }}>Task #{order.delivery_task_id}</div>}
                    </td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap", color: "#52665a" }}>{formatDate(order.placed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              padding: "14px 2px",
              color: "#66786d",
              fontSize: 12,
            }}
          >
            <span>
              {total === 0 ? "0 orders" : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} orders`}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || ordersQuery.isFetching}
                aria-label="Previous page"
                style={{ width: 34, height: 34, display: "grid", placeItems: "center", background: "#fff", border: "1px solid #d8e3da", borderRadius: 7, color: "#28523b", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={17} />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || ordersQuery.isFetching}
                aria-label="Next page"
                style={{ width: 34, height: 34, display: "grid", placeItems: "center", background: "#fff", border: "1px solid #d8e3da", borderRadius: 7, color: "#28523b", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </footer>
        </section>
      </DashboardShell>
    </RoleGuard>
  );
}
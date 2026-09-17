"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, CheckCircle2, Clock, Check, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { listNotifications, Notification } from "@/lib/api/notifications";
import { getStoredUserName } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

export default function CustomerNotificationsPage() {
  const userName = getStoredUserName();
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("vegito_read_notifications");
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }
  }, []);

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(50),
  });

  const list = notifications.data ?? [];
  const unreadCount = list.filter((n) => !readIds.has(n.id)).length;

  function markAsRead(id: number) {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem("vegito_read_notifications", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }

  function markAllRead() {
    const next = new Set(list.map((n) => n.id));
    setReadIds(next);
    try {
      localStorage.setItem("vegito_read_notifications", JSON.stringify(Array.from(next)));
    } catch {}
  }

  return (
    <DashboardShell
      role="customer"
      userName={userName}
      userRole="Customer"
      greeting="Order & Delivery Notifications"
      subtitle="Real-time alerts regarding your farm-fresh orders, deliveries, and offers"
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#063c32" }}>
              Inbox Notifications
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#62746a" }}>
              {unreadCount} unread alert{unreadCount === 1 ? "" : "s"}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #e1e8e2",
                backgroundColor: "#ffffff",
                color: "#16835b",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Check size={14} /> Mark all as read
            </button>
          )}
        </div>

        {notifications.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#62746a" }}>
            <RefreshCw size={28} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Loading notifications...</p>
          </div>
        ) : notifications.isError ? (
          <div style={{ padding: "20px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "14px", color: "#991b1b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={20} />
              <strong>Could not load notifications</strong>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px" }}>{getErrorMessage(notifications.error)}</p>
          </div>
        ) : list.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {list.map((n) => {
              const isRead = readIds.has(n.id);
              return (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  style={{
                    padding: "16px 20px",
                    borderRadius: "14px",
                    backgroundColor: isRead ? "#ffffff" : "#f0fdf4",
                    border: `1px solid ${isRead ? "#e5e7eb" : "#bbf7d0"}`,
                    boxShadow: "0 2px 6px rgba(6, 60, 50, 0.03)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    cursor: "pointer",
                    transition: "all 120ms ease",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: isRead ? "#f3f4f6" : "#dcfce7",
                      color: isRead ? "#9ca3af" : "#16a34a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Bell size={18} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ fontSize: "14px", color: "#063c32" }}>
                        {n.title}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                        {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#4b5563", lineHeight: 1.4 }}>
                      {n.message}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#e5e7eb",
                          color: "#4b5563",
                        }}
                      >
                        {n.notification_type}
                      </span>
                      {!isRead && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 800,
                            color: "#16835b",
                          }}
                        >
                          • New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "50px 20px",
              borderRadius: "16px",
              border: "1px solid #e1e8e2",
              textAlign: "center",
            }}
          >
            <Bell size={36} style={{ color: "#9ca3af", margin: "0 auto 10px" }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "15px", color: "#374151" }}>
              No notifications yet
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              Updates on your orders and delivery statuses will arrive here.
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

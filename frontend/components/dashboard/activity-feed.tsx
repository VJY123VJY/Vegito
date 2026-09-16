"use client";

import React from "react";
import { CheckCircle2, Clock, Truck, ShoppingBag, ShieldCheck } from "lucide-react";

export interface ActivityItem {
  id: string | number;
  title: string;
  description: string;
  timestamp: string;
  type?: "order" | "delivery" | "seller" | "system";
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
}

export function ActivityFeed({ activities, title = "Platform Activity Feed" }: ActivityFeedProps) {
  function getIcon(type?: string) {
    switch (type) {
      case "delivery":
        return <Truck size={16} color="#0284c7" />;
      case "seller":
        return <ShieldCheck size={16} color="#16835b" />;
      case "order":
      default:
        return <ShoppingBag size={16} color="#063c32" />;
    }
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e1e8e2",
        borderRadius: "16px",
        padding: "22px 24px",
        boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
      }}
    >
      <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
        {title}
      </h3>

      {activities.length === 0 ? (
        <p style={{ margin: 0, fontSize: "13px", color: "#62746a" }}>No recent activity to report.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {activities.map((act) => (
            <div key={act.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#f4f7f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                {getIcon(act.type)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 700, color: "#13221b" }}>
                  {act.title}
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#62746a" }}>
                  {act.description}
                </p>
                <span style={{ fontSize: "11px", color: "#9ca3af", display: "inline-block", marginTop: "2px" }}>
                  {act.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

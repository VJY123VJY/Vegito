"use client";

import React from "react";
import { StatusBadge } from "./status-badge";
import { Truck, Phone, MapPin, CheckCircle, XCircle } from "lucide-react";

export interface DeliveryPartnerRow {
  partner_id: number;
  user_id: number;
  partner_name: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_available: boolean;
  is_verified: boolean;
  rating: number | string;
  total_deliveries: number;
  status: string;
  active_order_number?: string;
  active_task_id?: number;
  customer_name?: string;
  delivery_address?: string;
}

interface DeliveryTableProps {
  partners: DeliveryPartnerRow[];
  onSelectPartner?: (partner: DeliveryPartnerRow) => void;
  isLoading?: boolean;
}

export function DeliveryTable({ partners, onSelectPartner, isLoading = false }: DeliveryTableProps) {
  if (isLoading) {
    return (
      <div className="dashboard-table-container" style={{ padding: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: "48px", backgroundColor: "#f4f7f3", borderRadius: "8px", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="dashboard-table-container" style={{ padding: "48px 24px", textAlign: "center", color: "#62746a" }}>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>No delivery partners found</p>
        <p style={{ margin: "4px 0 0", fontSize: "12.5px" }}>Registered delivery personnel will appear here.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
      <table className="dashboard-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Partner</th>
            <th>Contact</th>
            <th>Vehicle</th>
            <th>Status</th>
            <th>Active Task</th>
            <th>Deliveries</th>
            <th>Rating</th>
            <th>Verification</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {partners.map((p) => (
            <tr key={p.partner_id}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "#e9f6ee",
                      color: "#16835b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                    }}
                  >
                    🚴
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: "#13221b", fontSize: "13.5px" }}>
                      {p.partner_name}
                    </p>
                    <span style={{ fontSize: "11px", color: "#62746a" }}>ID #{p.partner_id}</span>
                  </div>
                </div>
              </td>
              <td>
                <span style={{ fontSize: "13px", color: "#374151" }}>{p.phone || "—"}</span>
              </td>
              <td>
                <div>
                  <p style={{ margin: 0, fontSize: "12.5px", fontWeight: 600 }}>{p.vehicle_type || "Bicycle"}</p>
                  {p.vehicle_number && (
                    <span style={{ fontSize: "11px", color: "#62746a" }}>{p.vehicle_number}</span>
                  )}
                </div>
              </td>
              <td>
                <StatusBadge status={p.status} />
              </td>
              <td>
                {p.active_order_number ? (
                  <div>
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#063c32" }}>
                      #{p.active_order_number}
                    </span>
                    {p.customer_name && (
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#62746a" }}>
                        {p.customer_name}
                      </p>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>Idle</span>
                )}
              </td>
              <td>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#13221b" }}>
                  {p.total_deliveries} completed
                </span>
              </td>
              <td>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#16835b" }}>
                  ★ {Number(p.rating).toFixed(1)}
                </span>
              </td>
              <td>
                {p.is_verified ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#16835b", fontSize: "11px", fontWeight: 700 }}>
                    <CheckCircle size={13} /> Verified
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#dc2626", fontSize: "11px", fontWeight: 700 }}>
                    <XCircle size={13} /> Pending
                  </span>
                )}
              </td>
              <td>
                {onSelectPartner && (
                  <button
                    onClick={() => onSelectPartner(p)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#f4f7f3",
                      border: "1px solid #e1e8e2",
                      color: "#063c32",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    View Details
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

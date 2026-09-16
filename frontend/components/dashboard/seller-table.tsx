"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle, XCircle, ExternalLink, Star } from "lucide-react";

export interface SellerRowData {
  seller_id: number;
  business_name: string;
  contact_name?: string;
  phone: string;
  city?: string;
  is_verified: boolean;
  is_active: boolean;
  rating: number | string;
  total_orders: number;
  product_count: number;
  total_revenue: number | string;
  created_at?: string;
}

interface SellerTableProps {
  sellers: SellerRowData[];
  onToggleVerify?: (sellerId: number, currentStatus: boolean) => void;
  isLoading?: boolean;
}

export function SellerTable({ sellers, onToggleVerify, isLoading = false }: SellerTableProps) {
  if (isLoading) {
    return (
      <div className="dashboard-table-container" style={{ padding: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: "48px", backgroundColor: "#f4f7f3", borderRadius: "8px", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  if (sellers.length === 0) {
    return (
      <div className="dashboard-table-container" style={{ padding: "48px 24px", textAlign: "center", color: "#62746a" }}>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>No sellers found</p>
        <p style={{ margin: "4px 0 0", fontSize: "12.5px" }}>Registered sellers will appear here.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-table-container" style={{ overflowX: "auto" }}>
      <table className="dashboard-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Business</th>
            <th>Contact</th>
            <th>City</th>
            <th>Catalog</th>
            <th>Orders</th>
            <th>Revenue</th>
            <th>Rating</th>
            <th>Verification</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sellers.map((s) => (
            <tr key={s.seller_id}>
              <td>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#13221b", fontSize: "14px" }}>
                    {s.business_name}
                  </p>
                  <span style={{ fontSize: "11px", color: "#62746a" }}>ID #{s.seller_id}</span>
                </div>
              </td>
              <td>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>{s.contact_name || s.phone}</p>
                <span style={{ fontSize: "11.5px", color: "#62746a" }}>{s.phone}</span>
              </td>
              <td>
                <span style={{ fontSize: "13px", color: "#44534a" }}>{s.city || "Solapur"}</span>
              </td>
              <td>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#13221b" }}>
                  {s.product_count} items
                </span>
              </td>
              <td>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#13221b" }}>
                  {s.total_orders}
                </span>
              </td>
              <td>
                <span style={{ fontSize: "13.5px", fontWeight: 800, color: "#063c32" }}>
                  ₹{Number(s.total_revenue).toFixed(0)}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 700 }}>
                  <Star size={14} color="#f59e0b" fill="#f59e0b" />
                  {Number(s.rating).toFixed(1)}
                </div>
              </td>
              <td>
                {s.is_verified ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 8px",
                      borderRadius: "999px",
                      backgroundColor: "#e9f6ee",
                      color: "#16835b",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle size={12} /> Verified
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 8px",
                      borderRadius: "999px",
                      backgroundColor: "#fef2f2",
                      color: "#dc2626",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    <XCircle size={12} /> Unverified
                  </span>
                )}
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Link
                    href={`/admin/sellers/${s.seller_id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#f4f7f3",
                      border: "1px solid #e1e8e2",
                      color: "#063c32",
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Inspect <ExternalLink size={12} />
                  </Link>
                  {onToggleVerify && (
                    <button
                      onClick={() => onToggleVerify(s.seller_id, s.is_verified)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        border: "1px solid #e1e8e2",
                        backgroundColor: s.is_verified ? "#fff1f2" : "#e9f6ee",
                        color: s.is_verified ? "#be123c" : "#16835b",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {s.is_verified ? "Revoke" : "Verify"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

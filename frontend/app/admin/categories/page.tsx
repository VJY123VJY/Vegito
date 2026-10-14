"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Tag,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/role/role-guard";
import { getCategories, type ApiCategory } from "@/lib/api/categories";

export default function AdminCategoriesPage() {
  const [search, setSearch] = useState("");

  const {
    data: categories = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-categories-monitoring"],
    queryFn: getCategories,
  });

  const filtered = categories.filter((c: ApiCategory) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell
        role="admin"
        userName="Admin"
        userRole="Platform Operations"
        greeting="Category Structure Oversight"
        subtitle="Manage and monitor platform vegetable categories, taxonomy classifications, and display ordering"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
          {/* Header Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#063c32" }}>
                Total Active Categories: <b>{categories.length}</b>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative", width: "280px" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#62746a",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search categories…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    height: "38px",
                    paddingLeft: "36px",
                    paddingRight: "12px",
                    borderRadius: "10px",
                    border: "1px solid #d1dbd4",
                    backgroundColor: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  border: "1px solid #d1dbd4",
                  backgroundColor: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#063c32",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Categories Grid */}
          {isLoading ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#62746a" }}>
              Loading categories from backend…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#62746a" }}>
              No categories found matching your query.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {filtered.map((cat: ApiCategory) => (
                <div
                  key={cat.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e1e8e2",
                    padding: "20px",
                    boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          backgroundColor: "#ecfdf5",
                          color: "#063c32",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "22px",
                        }}
                      >
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            style={{ width: "100%", height: "100%", borderRadius: "12px", objectFit: "cover" }}
                          />
                        ) : (
                          "🥬"
                        )}
                      </div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: cat.is_active !== false ? "#ecfdf5" : "#fef2f2",
                          color: cat.is_active !== false ? "#065f46" : "#991b1b",
                        }}
                      >
                        {cat.is_active !== false ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span>{cat.is_active !== false ? "Active" : "Disabled"}</span>
                      </span>
                    </div>

                    <h4 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
                      {cat.name}
                    </h4>
                    <p style={{ margin: 0, fontSize: "12.5px", color: "#62746a", lineHeight: 1.5 }}>
                      {cat.description || "Fresh local agricultural harvest from Solapur farmers."}
                    </p>
                  </div>

                  <div
                    style={{
                      marginTop: "16px",
                      paddingTop: "12px",
                      borderTop: "1px solid #edf2ee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    <span>ID #{cat.id}</span>
                    <span>Order: {cat.display_order ?? cat.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

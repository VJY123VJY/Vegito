"use client";

import React, { useState } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";

interface DashboardShellProps {
  role: "customer" | "seller" | "delivery" | "admin";
  userName?: string;
  userRole?: string;
  greeting?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  userName = "Vegito User",
  userRole = "Member",
  greeting,
  subtitle,
  searchPlaceholder,
  onSearchChange,
  children,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="dashboard-root" style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f4f7f3" }}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="dashboard-sidebar-backdrop md:hidden"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(6, 60, 50, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 45,
          }}
        />
      )}

      {/* Sidebar */}
      <DashboardSidebar
        role={role}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="dashboard-content-container" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <DashboardHeader
          role={role}
          userName={userName}
          userRole={userRole}
          greeting={greeting}
          subtitle={subtitle}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="dashboard-main" style={{ flex: 1, padding: "28px 32px 48px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

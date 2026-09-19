"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { BottomNavigation } from "../navigation/bottom-navigation";

const STORAGE_KEY = "vegito-sidebar-collapsed";

interface DashboardShellProps {
  role: "customer" | "seller" | "delivery" | "admin" | "farmer";
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
  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Desktop collapse state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Read persisted desktop preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setSidebarCollapsed(stored === "true");
    } catch { /* SSR / privacy mode */ }
  }, []);

  // Escape key closes mobile drawer
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  // Lock body scroll while drawer is open (prevents background scroll on Android)
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const handleCollapseToggle = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(p => !p), []);

  return (
    <div className="dashboard-root">

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT — always full-width on mobile.
          Rendered FIRST so it is the visual base layer.
          The sidebar is rendered AFTER (higher in z-order)
          but NEVER affects this container's width/position.
          ═══════════════════════════════════════════════════════ */}
      <div className="dashboard-content-container">
        <DashboardHeader
          role={role}
          userName={userName}
          userRole={userRole}
          greeting={greeting}
          subtitle={subtitle}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
          onMenuToggle={toggleMobileMenu}
          mobileMenuOpen={mobileMenuOpen}
          onCollapseToggle={handleCollapseToggle}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="dashboard-main">
          {children}
        </main>

        {/* Role-aware bottom nav (mobile only, via CSS) */}
        <BottomNavigation onMoreClick={toggleMobileMenu} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          SIDEBAR + BACKDROP — rendered AFTER content so they
          layer on top. Both are position:fixed on mobile.
          On desktop (via CSS), sidebar becomes position:sticky
          inside the flex root.
          ═══════════════════════════════════════════════════════ */}

      {/* Backdrop — only shown when drawer is open */}
      {mobileMenuOpen && (
        <div
          className="dashboard-sidebar-backdrop"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <DashboardSidebar
        role={role}
        isOpen={mobileMenuOpen}
        collapsed={sidebarCollapsed}
        onClose={closeMobileMenu}
        onCollapseToggle={handleCollapseToggle}
      />
    </div>
  );
}

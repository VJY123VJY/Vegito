"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/theme-context";

interface ThemeToggleProps {
  variant?: "pill" | "icon" | "full";
  className?: string;
}

export function ThemeToggle({ variant = "pill", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR / before hydration, read from data-theme attribute if present
  // Show a skeleton button that matches the correct size so layout doesn't shift
  const isDark = mounted ? theme === "dark" : false;

  const buttonBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    border: "1.5px solid var(--vegito-border, #d9ded7)",
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={className}
        style={{
          ...buttonBase,
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          backgroundColor: "var(--vegito-surface, #ffffff)",
          color: isDark ? "#fbbf24" : "#4b5563",
          justifyContent: "center",
          padding: "0",
        }}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle Theme"
      className={className}
      style={{
        ...buttonBase,
        padding: "6px 13px",
        borderRadius: "999px",
        backgroundColor: "var(--vegito-surface, #ffffff)",
        color: "var(--vegito-text, #142e2b)",
        fontSize: "12.5px",
        fontWeight: 600,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        minWidth: "80px",
        justifyContent: "center",
      }}
    >
      {mounted ? (
        isDark ? (
          <>
            <Sun size={14} color="#fbbf24" />
            <span>☀️ Light</span>
          </>
        ) : (
          <>
            <Moon size={14} color="#64748b" />
            <span>🌙 Dark</span>
          </>
        )
      ) : (
        /* Show a neutral placeholder while hydrating — same size, not blank */
        <>
          <Moon size={14} color="#64748b" />
          <span>🌙 Dark</span>
        </>
      )}
    </button>
  );
}

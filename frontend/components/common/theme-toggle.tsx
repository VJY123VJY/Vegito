"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/theme-context";
import { useTranslation } from "@/context/i18n-context";

interface ThemeToggleProps {
  variant?: "pill" | "icon" | "full";
  className?: string;
}

export function ThemeToggle({ variant = "pill", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          width: variant === "icon" ? "36px" : "84px",
          height: "36px",
          borderRadius: "999px",
          background: "transparent",
        }}
      />
    );
  }

  const isDark = theme === "dark";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? t("theme.light", "Light Mode") : t("theme.dark", "Dark Mode")}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={className}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          border: "1px solid var(--vegito-border, #d9ded7)",
          backgroundColor: "var(--vegito-surface, #ffffff)",
          color: isDark ? "#fbbf24" : "#4b5563",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
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
      aria-label={t("theme.toggle", "Toggle Theme")}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "999px",
        border: "1.5px solid var(--vegito-border, #d9ded7)",
        backgroundColor: "var(--vegito-surface, #ffffff)",
        color: "var(--vegito-text, #142e2b)",
        fontSize: "12.5px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {isDark ? (
        <>
          <Sun size={14} color="#fbbf24" />
          <span>☀️ {t("theme.light", "Light")}</span>
        </>
      ) : (
        <>
          <Moon size={14} color="#64748b" />
          <span>🌙 {t("theme.dark", "Dark")}</span>
        </>
      )}
    </button>
  );
}

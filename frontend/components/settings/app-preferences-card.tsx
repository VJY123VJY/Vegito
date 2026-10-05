"use client";

import React from "react";
import { Globe, Moon, Sun, Monitor, Check } from "lucide-react";
import { useTranslation } from "@/context/i18n-context";
import { useTheme, type Theme } from "@/context/theme-context";

export function AppPreferencesCard() {
  const { language, setLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        padding: "24px",
        borderRadius: "16px",
        border: "1px solid #e1e8e2",
        boxShadow: "0 2px 8px rgba(6, 60, 50, 0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <Globe size={20} color="#16835b" />
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#063c32" }}>
          Language & Appearance (भाषा व दृश्य स्वरूप)
        </h3>
      </div>

      {/* Language Section */}
      <div style={{ marginBottom: "22px" }}>
        <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#222c1d", marginBottom: "8px" }}>
          App Language / भाषा निवडा
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {[
            { id: "en", label: "English", sub: "English" },
            { id: "mr", label: "मराठी", sub: "Marathi" },
            { id: "hi", label: "हिन्दी", sub: "Hindi" },
          ].map((item) => {
            const isSelected = language === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLanguage(item.id as any)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: isSelected ? "2px solid #16835b" : "1.5px solid #dce8df",
                  backgroundColor: isSelected ? "#ecfdf5" : "#f8faf8",
                  color: isSelected ? "#065f46" : "#4a5d53",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "14px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{item.label}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, opacity: 0.8 }}>{item.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Section */}
      <div>
        <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#222c1d", marginBottom: "8px" }}>
          Theme / रंग रूप
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {[
            { id: "light", label: "Light", icon: <Sun size={16} /> },
            { id: "dark", label: "Dark", icon: <Moon size={16} /> },
            { id: "system", label: "System", icon: <Monitor size={16} /> },
          ].map((item) => {
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id as Theme)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: isSelected ? "2px solid #16835b" : "1.5px solid #dce8df",
                  backgroundColor: isSelected ? "#ecfdf5" : "#f8faf8",
                  color: isSelected ? "#065f46" : "#4a5d53",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontWeight: 800,
                  fontSize: "13.5px",
                  transition: "all 0.15s ease",
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

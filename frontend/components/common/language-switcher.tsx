"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useI18n } from "@/context/i18n-context";
import { LANGUAGE_LABELS, type Language } from "@/i18n";

interface LanguageSwitcherProps {
  variant?: "pill" | "compact";
  className?: string;
}

export function LanguageSwitcher({ variant = "pill", className = "" }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages: Language[] = ["en", "mr", "hi"];

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }} className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Select Language"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: variant === "compact" ? "6px 10px" : "6px 12px",
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
        <Globe size={14} color="var(--vegito-primary, #059669)" />
        <span>{LANGUAGE_LABELS[language]}</span>
        <ChevronDown size={13} style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            backgroundColor: "var(--vegito-surface, #ffffff)",
            border: "1px solid var(--vegito-border, #d9ded7)",
            borderRadius: "14px",
            padding: "6px",
            minWidth: "140px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--vegito-muted, #64748b)",
              borderBottom: "1px solid var(--vegito-border, #f1f5f9)",
              marginBottom: "2px",
            }}
          >
            🌐 {t("lang.title", "Language")}
          </div>
          {languages.map((langKey) => {
            const isSelected = language === langKey;
            return (
              <button
                key={langKey}
                type="button"
                onClick={() => {
                  setLanguage(langKey);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: isSelected ? "var(--vegito-primary-soft, #ecfdf5)" : "transparent",
                  color: isSelected ? "var(--vegito-primary, #059669)" : "var(--vegito-text, #1e293b)",
                  fontSize: "13px",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background-color 0.1s",
                }}
              >
                <span>{LANGUAGE_LABELS[langKey]}</span>
                {isSelected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

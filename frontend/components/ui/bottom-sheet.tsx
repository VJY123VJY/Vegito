"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = "85vh",
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(6, 60, 50, 0.45)",
          backdropFilter: "blur(6px)",
          transition: "opacity 0.25s ease",
          zIndex: 1,
        }}
      />

      {/* Sheet Content Container */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "540px",
          maxHeight,
          backgroundColor: "#ffffff",
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          boxShadow: "0 -10px 40px rgba(6, 60, 50, 0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "vegito-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Drag handle pill */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            paddingTop: "12px",
            paddingBottom: "6px",
            cursor: "pointer",
          }}
          onClick={onClose}
        >
          <div
            style={{
              width: "44px",
              height: "5px",
              backgroundColor: "#d1ded5",
              borderRadius: "10px",
            }}
          />
        </div>

        {/* Header */}
        {(title || subtitle) && (
          <div
            style={{
              padding: "8px 20px 14px",
              borderBottom: "1px solid #f0f4f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              {title && (
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#063c32",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "12px",
                    color: "#62746a",
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#f4f7f4",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#62746a",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div
          style={{
            overflowY: "auto",
            padding: "20px",
            WebkitOverflowScrolling: "touch",
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

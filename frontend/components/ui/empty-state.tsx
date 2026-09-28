"use client";

import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "🥬",
  title,
  description,
  actionText,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 20px",
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        border: "1px dashed #d1ded5",
        margin: "16px 0",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "20px",
          backgroundColor: "#f2f8f4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "30px",
          marginBottom: "16px",
          boxShadow: "0 4px 14px rgba(6, 60, 50, 0.05)",
        }}
      >
        {typeof icon === "string" ? icon : icon}
      </div>

      <h4
        style={{
          margin: "0 0 6px",
          fontSize: "16px",
          fontWeight: 800,
          color: "#063c32",
        }}
      >
        {title}
      </h4>

      <p
        style={{
          margin: "0 0 20px",
          fontSize: "13.5px",
          color: "#62746a",
          maxWidth: "340px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {actionText && (actionHref || onAction) && (
        actionHref ? (
          <Link
            href={actionHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 22px",
              borderRadius: "14px",
              backgroundColor: "#063c32",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(6, 60, 50, 0.15)",
              transition: "transform 0.15s ease",
            }}
          >
            {actionText}
          </Link>
        ) : (
          <button
            onClick={onAction}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 22px",
              borderRadius: "14px",
              backgroundColor: "#063c32",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(6, 60, 50, 0.15)",
            }}
          >
            {actionText}
          </button>
        )
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogIn } from "lucide-react";
import { clearSession } from "@/lib/api/auth";

export function SessionExpiredModal() {
  const router = useRouter();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const handleExpired = () => {
      setExpired(true);
    };

    window.addEventListener("vegito:session_expired", handleExpired);
    return () => window.removeEventListener("vegito:session_expired", handleExpired);
  }, []);

  if (!expired) return null;

  const handleLoginAgain = () => {
    clearSession();
    setExpired(false);
    router.replace("/auth/login");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          padding: "32px 24px",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AlertTriangle size={28} />
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 800, color: "#111827" }}>
          Your session has expired
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
          For your security, your session has timed out. Please log in again to continue.
        </p>
        <button
          type="button"
          onClick={handleLoginAgain}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#063c32",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 14px rgba(6, 60, 50, 0.25)",
          }}
        >
          <LogIn size={18} /> LOGIN AGAIN
        </button>
      </div>
    </div>
  );
}

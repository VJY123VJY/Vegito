"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/start-shopping");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--vegito-bg, #f8faf7)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: "36px" }}>🥬</span>
        <p style={{ marginTop: "12px", color: "#62746a", fontWeight: 600 }}>
          Redirecting to registration...
        </p>
      </div>
    </div>
  );
}

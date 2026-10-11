"use client";
 
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, getStoredRole, getMe } from "@/lib/api/auth";

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    const role = getStoredRole();

    if (!token) {
      router.replace("/admin/login");
      return;
    }

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      router.replace("/admin");
      return;
    }

    getMe()
      .then((user) => {
        if (!user) {
          router.replace("/admin/login");
          return;
        }
        const userRole = user.role_name || user.role;
        const authRoles = user.authorized_roles || [userRole];
        if (
          userRole === "ADMIN" ||
          userRole === "SUPER_ADMIN" ||
          authRoles.includes("ADMIN") ||
          authRoles.includes("SUPER_ADMIN")
        ) {
          router.replace("/admin");
        } else {
          router.replace(`/unauthorized?required=ADMIN&current=${userRole}`);
        }
      })
      .catch(() => {
        router.replace("/admin/login");
      });
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#062820",
        color: "#ffffff",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🥬</div>
        <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.01em" }}>
          Vegito Operations HQ
        </div>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.65)" }}>
          Loading Admin Command Center…
        </p>
      </div>
    </main>
  );
}

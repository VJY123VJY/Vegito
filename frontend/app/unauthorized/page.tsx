"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowRight, LogOut } from "lucide-react";
import { getStoredRole, getStoredUserName, getRoleRedirectPath, clearSession } from "@/lib/api/auth";

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    setCurrentRole(getStoredRole());
    setUserName(getStoredUserName());
  }, []);

  const isAdmin = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";
  const roleDisplay = currentRole?.replace("_", " ") ?? "Guest";

  const handleLogout = () => {
    clearSession();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          Admin Command Center Only
        </h1>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          The Vegito Web Application is reserved strictly for <strong>Platform Administrators</strong>.
          Customer grocery shopping, seller operations, and delivery partner dispatch are hosted exclusively on the <strong>Vegito Android App</strong>.
        </p>

        {currentRole && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mb-6 text-left">
            <div className="text-xs text-slate-400 mb-1">Current Active Account:</div>
            <div className="text-sm font-semibold text-white flex items-center justify-between">
              <span>{userName || "User"}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                isAdmin 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }`}>
                {roleDisplay}
              </span>
            </div>
          </div>
        )}

        {/* Platform Separation Guide Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mb-6 text-left space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>📱</span> For Customers, Sellers &amp; Delivery Boys
          </div>
          <p className="text-xs text-slate-400 leading-normal">
            Please open the <strong>Vegito Native Android App</strong> on your phone to browse fresh produce, fulfill orders, or complete delivery tasks with live OTP routing.
          </p>
        </div>

        <div className="space-y-3">
          {isAdmin ? (
            <Link
              href="/admin"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all text-sm"
            >
              <span>Enter Admin Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all text-sm"
            >
              <span>Admin &amp; Super Admin Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {currentRole && (
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Current Account</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <UnauthorizedContent />
    </Suspense>
  );
}

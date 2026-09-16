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

  const handleLogout = () => {
    clearSession();
    router.push("/auth/login");
  };

  const authorizedPath = getRoleRedirectPath(getStoredRole());
  const roleDisplay = currentRole?.replace("_", " ") ?? "Guest";

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          Access Denied
        </h1>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          You do not have permission to access this portal.
        </p>

        {currentRole && (
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 mb-6 text-left">
            <div className="text-xs text-slate-400 mb-1">Signed in as:</div>
            <div className="text-sm font-semibold text-white flex items-center justify-between">
              <span>{userName || "User"}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {roleDisplay}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {currentRole && authorizedPath !== "/" && (
            <Link
              href={authorizedPath}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all text-sm"
            >
              <span>Go to My Dashboard ({roleDisplay})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 border border-slate-600/50 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out &amp; Switch Account</span>
          </button>

          <Link
            href="/"
            className="block text-xs text-slate-400 hover:text-slate-200 transition-colors py-2"
          >
            Return to Homepage
          </Link>
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

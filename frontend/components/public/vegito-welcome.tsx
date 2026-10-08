"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { getAuthToken, getMe, getRoleRedirectPath, getStoredRole, type AuthRole } from "@/lib/api/auth";

export function VegitoWelcome() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;
    if (!getAuthToken()) {
      setCheckingAuth(false);
      return () => {
        active = false;
      };
    }

    void getMe().then((user) => {
      if (!active) return;
      const storedRole = getStoredRole();
      const accountRole = (user?.role_name || user?.role) as AuthRole | undefined;
      const role = accountRole && getRoleRedirectPath(accountRole) !== "/" ? accountRole : storedRole;
      if (role) {
        router.replace(getRoleRedirectPath(role));
      } else {
        setCheckingAuth(false);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (checkingAuth) {
    return (
      <main className="auth-page auth-welcome-page" aria-live="polite">
        <div className="auth-loading"><span className="auth-brand-mark" aria-hidden="true">🥬</span>Getting Vegito ready…</div>
      </main>
    );
  }

  return (
    <main className="auth-page auth-welcome-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label="Vegito home">
          <span className="auth-brand-mark" aria-hidden="true">🥬</span>
          <span>VEGITO</span>
        </Link>
        <ThemeToggle />
      </header>

      <section className="auth-welcome-content" aria-labelledby="welcome-title">
        <div className="auth-welcome-art" aria-hidden="true">
          <div className="auth-welcome-art-orbit" />
          <span className="auth-welcome-leaf auth-welcome-leaf-one">🥬</span>
          <span className="auth-welcome-leaf auth-welcome-leaf-two">🍅</span>
          <span className="auth-welcome-leaf auth-welcome-leaf-three">🥕</span>
          <span className="auth-welcome-leaf auth-welcome-leaf-four">🍋</span>
          <div className="auth-welcome-badge"><Leaf size={17} /> Local. Fresh. For you.</div>
        </div>

        <div className="auth-welcome-copy">
          <span className="auth-eyebrow"><Sparkles size={15} /> A BETTER WAY TO SHOP LOCAL</span>
          <h1 id="welcome-title">Fresh groceries.<br /><span>Closer to home.</span></h1>
          <p>Join your neighborhood marketplace for fresh produce, local sellers and trusted delivery.</p>
          <div className="auth-welcome-actions">
            <Link href="/auth/register" className="auth-primary-button">
              Create account <ArrowRight size={18} />
            </Link>
            <Link href="/auth/login" className="auth-secondary-button">
              Sign in to Vegito
            </Link>
          </div>
          <div className="auth-welcome-trust"><ShieldCheck size={16} /> Secure access for customers and local partners</div>
        </div>
      </section>
    </main>
  );
}

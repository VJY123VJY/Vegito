"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CheckCircle2,
  CircleHelp,
  Loader2,
  LockKeyhole,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import {
  getRoleRedirectPath,
  loginWithPassword,
  saveSession,
  sendLoginOtp,
  switchWorkspace,
  verifyLoginOtp,
  type AuthRole,
  type TokenResponse,
} from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";

type LoginStage = "phone" | "otp" | "roles";

const ROLE_DETAILS: Record<AuthRole, { label: string; description: string; icon: typeof ShoppingBag }> = {
  CUSTOMER: { label: "Customer", description: "Shop fresh groceries and track your orders.", icon: ShoppingBag },
  SELLER: { label: "Seller", description: "Manage your store, produce and orders.", icon: Store },
  DELIVERY_PARTNER: { label: "Delivery Boy", description: "View delivery tasks and earnings.", icon: Bike },
  ADMIN: { label: "Admin", description: "Open the administration dashboard.", icon: ShieldCheck },
  SUPER_ADMIN: { label: "Admin", description: "Open the administration dashboard.", icon: ShieldCheck },
};

function getAuthorizedRoles(session: TokenResponse): AuthRole[] {
  const roles = session.authorized_roles?.length ? session.authorized_roles : [session.role];
  return [...new Set(roles)];
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<LoginStage>("phone");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [authorizedRoles, setAuthorizedRoles] = useState<AuthRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setTimeout(() => setResendTimer((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendTimer]);

  const cleanPhone = phone.replace(/\D/g, "");

  const finishLogin = (result: TokenResponse) => {
    saveSession(result);
    const roles = getAuthorizedRoles(result);
    if (roles.length > 1) {
      setSession(result);
      setAuthorizedRoles(roles);
      setStage("roles");
      return;
    }

    const role = roles[0] ?? result.role;
    const requestedPath = searchParams.get("redirect");
    const safeCustomerRedirect =
      role === "CUSTOMER" &&
      requestedPath?.startsWith("/") &&
      !requestedPath.startsWith("//") &&
      !requestedPath.startsWith("/seller") &&
      !requestedPath.startsWith("/delivery") &&
      !requestedPath.startsWith("/admin");
    window.location.assign(safeCustomerRedirect && requestedPath ? requestedPath : getRoleRedirectPath(role));
  };

  const handleSendOtp = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError(null);
    setMessage(null);
    if (cleanPhone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const result = await sendLoginOtp(cleanPhone);
      setStage("otp");
      setResendTimer(45);
      if (result?.dev_otp) {
        setMessage("Development OTP is ready to use.");
        setOtp(result.dev_otp);
      } else {
        setMessage(`We sent a verification code to +91 ${cleanPhone}.`);
      }
    } catch (requestError) {
      const requestMessage = getErrorMessage(requestError);
      setError(
        requestMessage.toLowerCase().includes("not found")
          ? "We couldn't find an account with that number. Create an account to get started."
          : requestMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (otp.trim().length < 4) {
      setError("Enter the verification code sent to your phone.");
      return;
    }

    setLoading(true);
    try {
      finishLogin(await verifyLoginOtp(cleanPhone, otp.trim()));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (cleanPhone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    try {
      finishLogin(await loginWithPassword(cleanPhone, password));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleChooseRole = async (role: AuthRole) => {
    if (!authorizedRoles.includes(role)) return;
    setLoading(true);
    setError(null);
    try {
      const chosenSession =
        session?.role === role ? session : await switchWorkspace(role);
      saveSession(chosenSession);
      window.location.assign(getRoleRedirectPath(role));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label="Vegito home">
          <span className="auth-brand-mark" aria-hidden="true">🥬</span>
          <span>VEGITO</span>
        </Link>
        <ThemeToggle />
      </header>

      <section className="auth-stage" aria-labelledby="login-title">
        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="auth-eyebrow"><ShieldCheck size={15} /> YOUR LOCAL MARKET, ONLINE</span>
            <h1 id="login-title">
              {stage === "roles" ? "Choose your account" : stage === "otp" ? "Check your messages" : "Welcome back"}
            </h1>
            <p>
              {stage === "roles"
                ? "This number is linked to more than one Vegito workspace."
                : stage === "otp"
                  ? `Enter the verification code sent to +91 ${cleanPhone}.`
                  : "Sign in securely with your mobile number."}
            </p>
          </div>

          {error && <div className="auth-alert auth-alert-error" role="alert">{error}</div>}
          {message && <div className="auth-alert auth-alert-success" role="status"><CheckCircle2 size={17} />{message}</div>}

          {stage === "phone" && (
            <form className="auth-form" onSubmit={usePassword ? handlePasswordLogin : handleSendOtp}>
              <label className="auth-label" htmlFor="login-phone">Mobile number</label>
              <div className="auth-phone-field">
                <Phone size={18} aria-hidden="true" />
                <span className="auth-country-code">+91</span>
                <input
                  id="login-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  autoFocus
                  required
                  aria-describedby="phone-help"
                />
              </div>
              <span className="auth-help" id="phone-help">We’ll use this number to find your account.</span>

              {usePassword && (
                <>
                  <label className="auth-label" htmlFor="login-password">Password</label>
                  <div className="auth-password-field">
                    <LockKeyhole size={18} aria-hidden="true" />
                    <input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </>
              )}

              <button className="auth-primary-button" type="submit" disabled={loading || cleanPhone.length !== 10}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? (usePassword ? "Signing in…" : "Sending code…") : usePassword ? "Sign in" : "Continue with OTP"}
                {!loading && <ArrowRight size={18} />}
              </button>

              <button
                className="auth-text-button"
                type="button"
                onClick={() => {
                  setUsePassword((value) => !value);
                  setError(null);
                }}
              >
                {usePassword ? "Sign in with OTP instead" : "Use password instead"}
              </button>
            </form>
          )}

          {stage === "otp" && (
            <form className="auth-form" onSubmit={handleVerifyOtp}>
              <button className="auth-back-button" type="button" onClick={() => { setStage("phone"); setError(null); }}>
                <ArrowLeft size={16} /> Change mobile number
              </button>
              <label className="auth-label" htmlFor="login-otp">6-digit verification code</label>
              <input
                className="auth-input auth-otp-input"
                id="login-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                maxLength={6}
                autoFocus
                required
              />
              <button className="auth-primary-button" type="submit" disabled={loading || otp.trim().length < 4}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? "Verifying…" : "Verify and continue"}
                {!loading && <ArrowRight size={18} />}
              </button>
              <p className="auth-resend">
                Didn’t receive it?{" "}
                {resendTimer > 0 ? (
                  <span>Resend in {resendTimer}s</span>
                ) : (
                  <button type="button" onClick={() => void handleSendOtp()} disabled={loading}>Resend code</button>
                )}
              </p>
            </form>
          )}

          {stage === "roles" && (
            <div className="auth-role-list" aria-label="Authorized account roles">
              {authorizedRoles.map((role) => {
                const details = ROLE_DETAILS[role];
                const Icon = details.icon;
                return (
                  <button
                    className="auth-role-card"
                    key={role}
                    type="button"
                    onClick={() => void handleChooseRole(role)}
                    disabled={loading}
                  >
                    <span className="auth-role-icon"><Icon size={21} /></span>
                    <span className="auth-role-copy"><strong>{details.label}</strong><small>{details.description}</small></span>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  </button>
                );
              })}
            </div>
          )}

          {stage !== "roles" && (
            <div className="auth-card-footer">
              <span>New to Vegito?</span>
              <Link href="/auth/register">Create an account <ArrowRight size={15} /></Link>
            </div>
          )}
        </div>
        <p className="auth-trust-note"><CircleHelp size={15} /> Your account is verified securely with Vegito.</p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page"><div className="auth-loading"><Loader2 size={28} className="animate-spin" />Preparing secure sign in…</div></main>}>
      <LoginContent />
    </Suspense>
  );
}

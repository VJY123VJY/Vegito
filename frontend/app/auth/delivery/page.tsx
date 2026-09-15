"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, LoaderCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import { saveSession, sendOtp, verifyOtp } from "@/lib/api/auth";

export default function DeliveryAuth() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"details" | "otp">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!resendIn) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (stage === "details") {
        await sendOtp("delivery", phone);
        setStage("otp");
        setResendIn(30);
        return;
      }

      const session = await verifyOtp("delivery", phone, otp, name);
      saveSession(session);
      router.push("/delivery");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section>
        <p className="section-kicker">SOLAPUR MARKET · DELIVERY</p>
        <h1>{stage === "details" ? "Move the market forward." : "Confirm your number"}</h1>
        <p>
          {stage === "details"
            ? "Register as a delivery partner or sign in with a one-time code."
            : `We sent a one-time code to ${phone}.`}
        </p>

        <form onSubmit={submit}>
          <label>
            {stage === "details" ? "Full name" : "One-time password"}
            {stage === "details" ? <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /> : null}
          </label>
          <label>
            {stage === "details" ? "Mobile number" : "One-time password"}
            <input
              required
              inputMode="numeric"
              maxLength={stage === "details" ? 10 : 6}
              value={stage === "details" ? phone : otp}
              onChange={(e) =>
                stage === "details"
                  ? setPhone(e.target.value.replace(/\D/g, ""))
                  : setOtp(e.target.value.replace(/\D/g, ""))
              }
              placeholder={stage === "details" ? "98765 43210" : "6-digit code"}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-action" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <Bike size={18} />}
            {loading ? "Please wait…" : stage === "details" ? "Send OTP" : "Verify & continue"}
          </button>
        </form>

        {stage === "otp" && (
          <><button className="text-button" onClick={() => setStage("details")}>Change details</button><button className="text-button" disabled={resendIn > 0 || loading} onClick={async () => { await sendOtp("delivery", phone); setResendIn(30); }}>{resendIn ? `Resend code in ${resendIn}s` : "Resend code"}</button></>
        )}
      </section>
    </main>
  );
}

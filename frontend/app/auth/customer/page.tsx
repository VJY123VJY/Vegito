"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import { saveSession, sendOtp, verifyOtp } from "@/lib/api/auth";

export default function CustomerAuth() {
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (stage === "details") {
        await sendOtp("customer", phone);
        setStage("otp");
        setResendIn(30);
      } else {
        const session = await verifyOtp("customer", phone, otp, name);
        saveSession(session);
        router.push("/customer");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><section>
    <p className="section-kicker">SOLAPUR MARKET · CUSTOMER</p>
    <h1>{stage === "details" ? "Fresh food, closer to home." : "Confirm your number"}</h1>
    <p>{stage === "details" ? "Create your customer account or sign in with a one-time code." : `We sent a one-time code to ${phone}.`}</p>
    <form onSubmit={submit}>
      {stage === "details" ? <>
        <label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>
        <label>Mobile number<input required inputMode="numeric" maxLength={10} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} placeholder="98765 43210" /></label>
      </> : <label>One-time password<input required inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="6-digit code" /></label>}
      {error && <p className="form-error">{error}</p>}
      <button className="primary-action" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />} {loading ? "Please wait..." : stage === "details" ? "Send OTP" : "Verify & continue"}</button>
    </form>
    {stage === "otp" && <><button className="text-button" onClick={() => setStage("details")}>Change details</button><button className="text-button" disabled={resendIn > 0 || loading} onClick={async () => { await sendOtp("customer", phone); setResendIn(30); }}>{resendIn ? `Resend code in ${resendIn}s` : "Resend code"}</button></>}
  </section></main>;
}

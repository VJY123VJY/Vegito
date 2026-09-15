import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="simple-page">
      <p className="section-kicker">ABOUT VEGITO</p>
      <h1>Fresh vegetables. Simple delivery.</h1>
      <p className="helper">
        Vegito helps local farmers and sellers bring fresh produce to nearby households with a clear,
        transparent, and fast ordering experience.
      </p>
      <div className="cart-total" style={{ maxWidth: 760 }}>
        <span><b>Local-first</b><em>Fresh produce sourced from nearby markets.</em></span>
        <span><b>Simple</b><em>Order without confusion, checkout in minutes.</em></span>
        <span><b>Trustworthy</b><em>Clear pricing, direct seller communication, and reliable delivery.</em></span>
      </div>
      <div style={{ marginTop: 24 }}>
        <Link className="primary-action" href="/auth/register">Join Vegito</Link>
      </div>
    </main>
  );
}

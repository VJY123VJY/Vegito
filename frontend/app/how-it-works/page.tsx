import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <main className="simple-page">
      <p className="section-kicker">HOW VEGITO WORKS</p>
      <h1>From market to doorstep.</h1>
      <div style={{ display: "grid", gap: 16, maxWidth: 820 }}>
        {[
          ["1", "Browse vegetables", "Find fresh produce from trusted local sellers nearby."],
          ["2", "Add to basket", "Choose quantities, add notes, and review the order summary."],
          ["3", "Checkout", "Pick a delivery window, confirm your address, and pay securely."],
          ["4", "Track delivery", "Get updates from seller to delivery partner until your order arrives."],
        ].map(([step, title, text]) => (
          <div key={step} className="cart-item" style={{ padding: 18 }}>
            <div className="mini-art" style={{ width: 52, height: 52, fontWeight: 800 }}>{step}</div>
            <div>
              <strong>{title}</strong>
              <small>{text}</small>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <Link className="primary-action" href="/explore">Explore products</Link>
      </div>
    </main>
  );
}

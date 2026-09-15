import Link from "next/link";

export default function ExplorePage() {
  return (
    <main className="simple-page">
      <p className="section-kicker">EXPLORE VEGITO</p>
      <h1>Fresh picks from local sellers</h1>
      <p className="helper">This page is the common discovery entry point before login. It leads buyers to the marketplace flow and customer sign-in experience.</p>
      <div className="category-grid" style={{ maxWidth: 980, marginTop: 24 }}>
        {[
          ["Leafy Greens", "Spinach, amaranth, fenugreek"],
          ["Root Vegetables", "Carrots, radish, beetroot"],
          ["Seasonal Picks", "Capsicum, okra, brinjal"],
          ["Fresh Herbs", "Coriander, mint, curry leaves"],
        ].map(([name, detail]) => (
          <div key={name} className="category-card leafy" style={{ minHeight: 130 }}>
            <span>
              <b>{name}</b>
              <small>{detail}</small>
            </span>
            <span className="category-art">🌿</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        <Link className="primary-action" href="/auth/register">Start shopping</Link>
      </div>
    </main>
  );
}

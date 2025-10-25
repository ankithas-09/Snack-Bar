"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handleAdminClick = () => {
    const password = prompt("🔐 Enter Admin Password:");
    if (password === "Sannrocks2025") {
      router.push("/admin-dashboard");
    } else if (password !== null) {
      alert("❌ Incorrect Password. Access Denied.");
    }
  };

  return (
    <section className="hero">
      <div className="glass" role="region" aria-label="Welcome">
        <h1>Snack Bar - Fresh Bites Fast Smiles</h1>
        <p className="lead">
          From signature sandwiches to crunchy fries and coffees
        </p>

        <div className="actions" style={{ marginTop: 16 }}>
          <a href="/order" className="btn" aria-label="Start Ordering">
            🍔 Start Ordering
          </a>
          <a href="/orders" className="btn ghost" aria-label="Orders">
            Orders
          </a>
          <button
            onClick={handleAdminClick}
            className="btn secondary"
            aria-label="Admin"
          >
            🔐 Admin
          </button>
        </div>
      </div>

      <div className="rule" style={{ marginTop: 24 }} />

      <div id="menu" className="glass" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Today’s Picks</h2>
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li>Masala Fries — crisp & spicy</li>
          <li>Grilled Sandwich — cheesy goodness</li>
          <li>Cold Coffee — smooth and bold</li>
        </ul>

        <div className="actions" style={{ marginTop: 16 }}>
          <a href="/order" className="btn" aria-label="Order Picks">
            Add to Order
          </a>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <section className="hero">
      {/* 🔸 Logout Button (top right) */}
      <div className="logout-container">
        <button className="btn secondary logout-btn" onClick={handleLogout}>
        Logout
        </button>
      </div>

      <div className="glass admin-glass">

        <div className="admin-buttons">
          <button
            className="admin-box"
            onClick={() => router.push("/admin-orders")}
          >
            📦 Orders
          </button>
          <button
            className="admin-box"
            onClick={() => router.push("/admin-refunds")}
          >
            💰 Refunds
          </button>
          <button
            className="admin-box"
            onClick={() => router.push("/admin-summary")}
          >
            📊 Summary
          </button>
        </div>
      </div>
    </section>
  );
}

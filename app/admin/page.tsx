"use client";

import { useState } from "react";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);

  return (
    <section className="hero">
      <div className="glass">
        <h1 style={{ marginTop: 0 }}>Admin</h1>
        {!authed ? (
          <>
            <p>This area is restricted. Enter your passphrase to continue.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget as HTMLFormElement);
                const pass = String(data.get("pass") || "");
                // Replace with real auth later
                if (pass === "snack-admin") setAuthed(true);
                else alert("Invalid passphrase.");
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                name="pass"
                type="password"
                placeholder="Enter passphrase"
                aria-label="Admin passphrase"
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  border: "2px solid var(--black)",
                  borderRadius: 10,
                  background: "var(--offwhite)",
                  color: "var(--black)"
                }}
                required
              />
              <button className="btn" type="submit">Unlock</button>
            </form>
          </>
        ) : (
          <>
            <p>Welcome back! Manage orders, items, and pricing here.</p>
            <div className="actions" style={{ marginTop: 12 }}>
              <a href="/" className="btn secondary">← Back</a>
              <button className="btn" onClick={() => alert("Open Items Manager")}>Items</button>
              <button className="btn" onClick={() => alert("Open Orders Dashboard")}>Orders</button>
              <button className="btn" onClick={() => alert("Open Pricing")}>Pricing</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

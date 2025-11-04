// app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ==============================
// Types
// ==============================
type Item = { name: string; qty: number; price: number; category: string };
type OrderStatus = "PENDING" | "CONFIRMED" | "DELIVERED";

type Order = {
  _id: string;
  orderNumber: number;
  categories: string[];
  items: Item[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  deliveredAt?: string;
  employee?: boolean;
};

type RefundDoc = {
  _id: string;
  orderNumber: number;
  refundedItems: Item[];
  refundAmount: number;
  createdAt: string;
};

type RefundSummary = {
  items: Item[];
  total: number;
  lastRefundAt?: Date;
};

// ==============================
// Utils
// ==============================
function toINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

// Format a date to YYYY-MM-DD in IST
function toISTDateString(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // 2025-11-03
}

// Build map: orderNumber -> { items[], total, lastRefundAt }
function buildRefundsMap(rows: RefundDoc[]): Record<number, RefundSummary> {
  const map: Record<number, RefundSummary> = {};
  for (const r of rows) {
    const key = r.orderNumber;
    if (!map[key]) map[key] = { items: [], total: 0, lastRefundAt: undefined };
    map[key].items.push(...(r.refundedItems || []));
    map[key].total += r.refundAmount || 0;
    const ts = r.createdAt ? new Date(r.createdAt) : undefined;
    if (ts && (!map[key].lastRefundAt || ts > map[key].lastRefundAt!)) {
      map[key].lastRefundAt = ts;
    }
  }
  return map;
}

// For a given orderNumber and itemName, how many units have already been refunded?
function refundedQtyFor(
  refundsByOrder: Record<number, RefundSummary>,
  orderNumber: number,
  itemName: string
): number {
  const sum =
    refundsByOrder[orderNumber]?.items?.reduce((acc, it) => {
      return it.name === itemName ? acc + (it.qty || 0) : acc;
    }, 0) ?? 0;
  return sum;
}

// ==============================
// Component
// ==============================
export default function OrdersPage() {
  const router = useRouter();

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundsByOrder, setRefundsByOrder] = useState<Record<number, RefundSummary>>({});
  const [cancelMode, setCancelMode] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(() => toISTDateString(new Date()));

  const [selectedQtys, setSelectedQtys] = useState<Record<string, Record<string, number>>>({});

  const applyLocalFilter = (newDate: string, data?: Order[]) => {
    const source = data ?? allOrders;
    const filtered = source.filter(
      (o) => toISTDateString(new Date(o.createdAt)) === newDate
    );
    setOrders(filtered);
  };

  // fetch orders
  useEffect(() => {
    let active = true;

    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders");
        const data: Order[] = await res.json();

        if (!active) return;

        setAllOrders(data);
        const filtered = data.filter(
          (o) => toISTDateString(new Date(o.createdAt)) === selectedDate
        );
        setOrders(filtered);
      } catch (e) {
        console.error("Failed to fetch orders:", e);
      }
    }

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedDate]);

  // fetch refunds
  useEffect(() => {
    let active = true;

    async function fetchRefunds() {
      try {
        const res = await fetch("/api/refunds");
        const rows: RefundDoc[] = await res.json();
        if (active) setRefundsByOrder(buildRefundsMap(rows));
      } catch (e) {
        console.error("Failed to fetch refunds:", e);
      }
    }

    fetchRefunds();
    const interval = setInterval(fetchRefunds, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const setQty = (orderId: string, itemName: string, qty: number) => {
    setSelectedQtys((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || {}), [itemName]: qty },
    }));
  };

  const setAllToMax = (order: Order) => {
    setSelectedQtys((prev) => {
      const next = { ...(prev[order._id] || {}) };
      for (const it of order.items) {
        const already = refundedQtyFor(refundsByOrder, order.orderNumber, it.name);
        const remaining = Math.max(0, it.qty - already);
        next[it.name] = remaining;
      }
      return { ...prev, [order._id]: next };
    });
  };

  const clearAll = (orderId: string) => {
    setSelectedQtys((prev) => ({ ...prev, [orderId]: {} }));
  };

  const refundItems = async (order: Order) => {
    const perItem = selectedQtys[order._id] || {};
    const refundable: Item[] = [];

    for (const it of order.items) {
      const requested = Math.max(0, Math.floor(perItem[it.name] || 0));
      if (requested === 0) continue;

      const already = refundedQtyFor(refundsByOrder, order.orderNumber, it.name);
      const remaining = Math.max(0, it.qty - already);
      const finalQty = Math.min(requested, remaining);
      if (finalQty > 0) {
        refundable.push({
          name: it.name,
          qty: finalQty,
          price: it.price,
          category: it.category,
        });
      }
    }

    if (refundable.length === 0) {
      alert("Please select at least 1 quantity to refund.");
      return;
    }

    const refundAmount = refundable.reduce((sum, i) => sum + i.price * i.qty, 0);

    const res = await fetch("/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        refundedItems: refundable,
        refundAmount,
      }),
    });

    if (res.ok) {
      const data: { success: boolean; refunds: RefundDoc[] } = await res.json();

      setRefundsByOrder((prev) => {
        const cur = prev[order.orderNumber] || { items: [], total: 0, lastRefundAt: undefined };
        const newItems = [...cur.items, ...data.refunds.flatMap((r) => r.refundedItems || [])];
        const newTotal =
          (cur.total || 0) + data.refunds.reduce((s, r) => s + (r.refundAmount || 0), 0);
        const latest = data.refunds
          .map((r) => new Date(r.createdAt))
          .reduce<Date | undefined>((acc, d) => (!acc || d > acc ? d : acc), cur.lastRefundAt);
        return {
          ...prev,
          [order.orderNumber]: { items: newItems, total: newTotal, lastRefundAt: latest },
        };
      });

      alert("✅ Refund recorded successfully");
      setCancelMode(null);
      clearAll(order._id);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`❌ Refund failed: ${err?.error || "Unknown error"}`);
    }
  };

  const clearAllOrders = async () => {
    if (orders.length === 0) return;
    const ok = confirm("This will permanently delete ALL orders. Continue?");
    if (!ok) return;
    try {
      setClearing(true);
      const res = await fetch("/api/orders", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear orders");
      setOrders([]);
      setRefundsByOrder({});
      alert("🧹 All orders cleared");
    } catch (e: any) {
      alert(`❌ ${e.message || "Failed to clear orders"}`);
    } finally {
      setClearing(false);
    }
  };

  const printAndConfirm = async (o: Order) => {
    try {
      setPrintingId(o._id);
      const res = await fetch(`/api/orders/${o._id}/confirm`, { method: "PATCH" });
      if (!res.ok) throw new Error("Confirm failed");
      const data = await res.json();
      setOrders((prev) => prev.map((x) => (x._id === o._id ? { ...x, status: data.status } : x)));
    } catch (e: any) {
      alert(`Confirm failed: ${e?.message || e}`);
    } finally {
      setPrintingId(null);
    }
  };

  const markDelivered = async (o: Order) => {
    try {
      setDeliveringId(o._id);
      const res = await fetch(`/api/orders/${o._id}/deliver`, { method: "PATCH" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Deliver failed");
      }
      const data: { status: OrderStatus; deliveredAt?: string } = await res.json();
      setOrders((prev) =>
        prev.map((x) =>
          x._id === o._id ? { ...x, status: data.status, deliveredAt: data.deliveredAt } : x
        )
      );
    } catch (e: any) {
      alert(`Deliver failed: ${e?.message || e}`);
    } finally {
      setDeliveringId(null);
    }
  };

  return (
    <section className="hero">
      <div
        className="top-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div className="back-container">
          <button className="btn secondary back-btn" onClick={() => history.back()}>
            ← Back
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="muted" style={{ fontSize: 14 }}>
            View orders for:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedDate(val);
              applyLocalFilter(val);
            }}
          />
          <button
            className="btn secondary"
            onClick={() => {
              const today = toISTDateString(new Date());
              setSelectedDate(today);
              applyLocalFilter(today);
            }}
          >
            Today
          </button>
        </div>
      </div>

      <div className="glass">
        <div className="orders-header">
          <h2 className="orders-heading">📋 Orders</h2>
          <button
            className="btn danger"
            onClick={clearAllOrders}
            disabled={orders.length === 0 || clearing}
          >
            {clearing ? "Clearing…" : "Clear All"}
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="empty-note">No orders for this date.</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Categories</th>
                <th>Items</th>
                <th>Employee</th>
                <th>Total</th>
                <th>Refunds</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order, idx) => {
                const refund = refundsByOrder[order.orderNumber];
                const rowClass = idx % 2 === 0 ? "even" : "odd";

                return (
                  <tr key={order._id} className={rowClass}>
                    <td>{order.orderNumber}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>{order.categories.join(", ")}</td>

                    <td>
                      {order.items.map((i) => {
                        const already = refundedQtyFor(refundsByOrder, order.orderNumber, i.name);
                        const remaining = Math.max(0, i.qty - already);
                        const value = selectedQtys[order._id]?.[i.name] ?? 0;
                        const fullyRefunded = remaining === 0;

                        return (
                          <div
                            key={i.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <span style={{ minWidth: 160 }}>
                              {i.name} x{i.qty}
                            </span>

                            {cancelMode === order._id ? (
                              fullyRefunded ? (
                                <span className="muted">Fully refunded</span>
                              ) : i.qty === 1 || remaining === 1 ? (
                                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <input
                                    type="checkbox"
                                    checked={value > 0}
                                    onChange={(e) =>
                                      setQty(order._id, i.name, e.target.checked ? 1 : 0)
                                    }
                                  />
                                  <span className="muted">Refund 1</span>
                                </label>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    min={0}
                                    max={remaining}
                                    value={value}
                                    onChange={(e) =>
                                      setQty(
                                        order._id,
                                        i.name,
                                        Math.min(
                                          remaining,
                                          Math.max(0, Number(e.target.value) || 0)
                                        )
                                      )
                                    }
                                    className="qty-input"
                                    style={{ width: 72 }}
                                  />
                                  <span className="muted">Remaining: {remaining}</span>
                                </>
                              )
                            ) : null}
                          </div>
                        );
                      })}

                      {cancelMode === order._id ? (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button className="btn secondary" onClick={() => setAllToMax(order)}>
                            Refund all remaining
                          </button>
                          <button className="btn secondary" onClick={() => clearAll(order._id)}>
                            Clear selection
                          </button>
                        </div>
                      ) : null}
                    </td>

                    <td>
                      {order.employee ? (
                        <span
                          className="status-badge employee"
                          style={{ background: "#000", color: "#fff" }}
                        >
                          EMP
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    <td>{toINR(order.totalAmount)}</td>

                    <td>
                      {!refund ? (
                        <span className="muted">—</span>
                      ) : (
                        <div className="refunds-cell">
                          <ul className="refunds-list">
                            {refund.items.map((ri, i) => (
                              <li key={`${ri.name}-${i}`}>
                                {ri.name} x{ri.qty} — {toINR(ri.price * ri.qty)}
                              </li>
                            ))}
                          </ul>
                          <div className="refunds-total">
                            <strong>Total Refunded:</strong> {toINR(refund.total)}
                          </div>
                          {refund.lastRefundAt ? (
                            <div className="refunds-last">
                              Last refund: {refund.lastRefundAt.toLocaleString("en-IN")}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          order.status === "DELIVERED"
                            ? "delivered"
                            : order.status === "CONFIRMED"
                            ? "confirmed"
                            : "pending"
                        }`}
                      >
                        {order.status === "DELIVERED" ? "DONE" : order.status}
                      </span>
                      {order.deliveredAt ? (
                        <div className="muted">
                          {new Date(order.deliveredAt).toLocaleString("en-IN")}
                        </div>
                      ) : null}
                    </td>

                    <td>
                      {order.status === "PENDING" ? (
                        <>
                          <button
                            className="btn secondary"
                            style={{ marginBottom: 6 }}
                            onClick={() => router.push(`/order?edit=1&orderId=${order._id}`)}
                            title="Edit this order"
                          >
                            Edit ✏️
                          </button>
                          <button
                            className="btn confirm-btn"
                            onClick={() => printAndConfirm(order)}
                            disabled={printingId === order._id}
                          >
                            {printingId === order._id ? "Confirming…" : "Confirm ✅"}
                          </button>
                        </>
                      ) : null}

                      {order.status === "CONFIRMED" && cancelMode !== order._id ? (
                        <>
                          <button
                            className="btn success"
                            onClick={() => markDelivered(order)}
                            disabled={deliveringId === order._id}
                          >
                            {deliveringId === order._id ? "Marking…" : "Mark Delivered 🚚"}
                          </button>
                          <button
                            className="btn secondary"
                            onClick={() => {
                              setCancelMode(order._id);
                              setSelectedQtys((prev) => ({
                                ...prev,
                                [order._id]: prev[order._id] || {},
                              }));
                            }}
                          >
                            Cancel ❌
                          </button>
                        </>
                      ) : null}

                      {order.status === "DELIVERED" && cancelMode !== order._id ? (
                        <>
                          <span className="muted" style={{ display: "block", marginBottom: 6 }}>
                            Handed to customer ✔️
                          </span>
                          <button
                            className="btn secondary"
                            onClick={() => {
                              setCancelMode(order._id);
                              setSelectedQtys((prev) => ({
                                ...prev,
                                [order._id]: prev[order._id] || {},
                              }));
                            }}
                          >
                            Cancel ❌
                          </button>
                        </>
                      ) : null}

                      {cancelMode === order._id ? (
                        <>
                          <button className="btn refund-btn" onClick={() => refundItems(order)}>
                            Refund 💰
                          </button>
                          <button className="btn secondary" onClick={() => setCancelMode(null)}>
                            Close
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

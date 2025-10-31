// app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";

type Item = { name: string; qty: number; price: number; category: string };
type Order = {
  _id: string;
  orderNumber: number;
  categories: string[];
  items: Item[];
  totalAmount: number;
  status: "PENDING" | "CONFIRMED";
  createdAt: string;
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

function toINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundsByOrder, setRefundsByOrder] = useState<Record<number, RefundSummary>>({});
  const [cancelMode, setCancelMode] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [clearing, setClearing] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null); // reused for "Confirming…" state

  // Fetch all orders
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/orders");
      const data: Order[] = await res.json();
      setOrders(data);
    })();
  }, []);

  // Fetch refunds
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/refunds");
      const rows: RefundDoc[] = await res.json();
      const map: Record<number, RefundSummary> = {};
      for (const r of rows) {
        const key = r.orderNumber;
        if (!map[key]) map[key] = { items: [], total: 0, lastRefundAt: undefined };
        map[key].items.push(...(r.refundedItems || []));
        map[key].total += r.refundAmount || 0;
        const ts = r.createdAt ? new Date(r.createdAt) : undefined;
        if (ts && (!map[key].lastRefundAt || ts > map[key].lastRefundAt)) {
          map[key].lastRefundAt = ts;
        }
      }
      setRefundsByOrder(map);
    })();
  }, []);

  const toggleItemSelection = (orderId: string, itemName: string) => {
    setSelectedItems((prev) => {
      const current = prev[orderId] || [];
      return current.includes(itemName)
        ? { ...prev, [orderId]: current.filter((i) => i !== itemName) }
        : { ...prev, [orderId]: [...current, itemName] };
    });
  };

  const toggleSelectAll = (orderId: string, allItemNames: string[]) => {
    setSelectedItems((prev) => {
      const current = prev[orderId] || [];
      const allSelected = current.length === allItemNames.length;
      return { ...prev, [orderId]: allSelected ? [] : allItemNames };
    });
  };

  const refundItems = async (order: Order) => {
    const selected = selectedItems[order._id] || [];
    if (selected.length === 0) return;

    const refundedItems = order.items.filter((i) => selected.includes(i.name));
    const refundAmount = refundedItems.reduce((sum, i) => sum + i.price * i.qty, 0);

    const res = await fetch("/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        refundedItems,
        refundAmount,
      }),
    });

    if (res.ok) {
      const data: { success: boolean; refunds: RefundDoc[] } = await res.json();
      setRefundsByOrder((prev) => {
        const cur = prev[order.orderNumber] || { items: [], total: 0 };
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
      setSelectedItems((prev) => ({ ...prev, [order._id]: [] }));
    }
  };

  const clearAllOrders = async () => {
    if (orders.length === 0) return;
    const ok = confirm("This will permanently delete ALL orders. Continue?");
    if (!ok) return;

    try {
      setClearing(true);
      const res = await fetch("/api/orders", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to clear orders");
      }
      setOrders([]);
      setRefundsByOrder({});
      alert("🧹 All orders cleared");
    } catch (e: any) {
      alert(`❌ ${e.message || "Failed to clear orders"}`);
    } finally {
      setClearing(false);
    }
  };

  // ✅ Confirm only (no printing)
  const printAndConfirm = async (o: Order) => {
    try {
      setPrintingId(o._id); // reuse state to disable the button and show "Confirming…"
      const res = await fetch(`/api/orders/${o._id}/confirm`, { method: "PATCH" });
      if (!res.ok) throw new Error("Confirm failed");
      const data = await res.json();
      setOrders((prev) => prev.map((x) => (x._id === o._id ? { ...x, status: data.status } : x)));
      console.log(`✅ Order ${o.orderNumber} confirmed (no print)`);
    } catch (e: any) {
      alert(`Confirm failed: ${e?.message || e}`);
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <section className="hero">
      <div className="back-container">
        <button className="btn secondary back-btn" onClick={() => history.back()}>
          ← Back
        </button>
      </div>

      <div className="glass">
        <div className="orders-header" style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <h2 className="orders-heading" style={{ flex: 1 }}>
            📋 Orders
          </h2>

          <button
            className="btn danger"
            onClick={clearAllOrders}
            disabled={orders.length === 0 || clearing}
          >
            {clearing ? "Clearing…" : "Clear All"}
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="empty-note">No orders yet.</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Categories</th>
                <th>Items</th>
                <th>Total</th>
                <th>Refunds</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order, idx) => {
                const refund = refundsByOrder[order.orderNumber];
                return (
                  <tr key={order._id} className={idx % 2 === 0 ? "even" : "odd"}>
                    <td>{order.orderNumber}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>{order.categories.join(", ")}</td>
                    <td>
                      {order.items.map((i) => (
                        <div key={i.name}>
                          {cancelMode === order._id && (
                            <input
                              type="checkbox"
                              checked={!!selectedItems[order._id]?.includes(i.name)}
                              onChange={() => toggleItemSelection(order._id, i.name)}
                            />
                          )}
                          <span className={cancelMode === order._id ? "ml-6" : ""}>
                            {i.name} x{i.qty}
                          </span>
                        </div>
                      ))}
                      {cancelMode === order._id && (
                        <div className="mt-6">
                          <input
                            type="checkbox"
                            checked={!!(selectedItems[order._id]?.length === order.items.length)}
                            onChange={() =>
                              toggleSelectAll(
                                order._id,
                                order.items.map((i) => i.name)
                              )
                            }
                          />
                          <span className="ml-6">Select All</span>
                        </div>
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
                          {refund.lastRefundAt && (
                            <div className="refunds-last">
                              Last refund: {refund.lastRefundAt.toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          order.status === "CONFIRMED" ? "confirmed" : "pending"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.status === "PENDING" && (
                        <button
                          className="btn confirm-btn"
                          onClick={() => printAndConfirm(order)}
                          disabled={printingId === order._id}
                        >
                          {printingId === order._id ? "Confirming…" : "Confirm ✅"}
                        </button>
                      )}
                      {order.status === "CONFIRMED" && cancelMode !== order._id && (
                        <button
                          className="btn secondary"
                          onClick={() => {
                            setCancelMode(order._id);
                            setSelectedItems((prev) => ({
                              ...prev,
                              [order._id]: prev[order._id] || [],
                            }));
                          }}
                        >
                          Cancel ❌
                        </button>
                      )}
                      {cancelMode === order._id && (
                        <>
                          <button className="btn refund-btn" onClick={() => refundItems(order)}>
                            Refund 💰
                          </button>
                          <button className="btn secondary" onClick={() => setCancelMode(null)}>
                            Close
                          </button>
                        </>
                      )}
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

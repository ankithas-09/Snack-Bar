"use client";

import { useEffect, useState } from "react";

type Item = { name: string; qty: number; price: number; category: string };
type Order = {
  _id: string;
  orderNumber: number;
  categories: string[];
  items: Item[];
  totalAmount: number;
  status: string;
  createdAt: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancelMode, setCancelMode] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then(setOrders);
  }, []);

  const confirmOrder = async (id: string) => {
    const res = await fetch(`/api/orders/${id}/confirm`, { method: "PATCH" });
    const data = await res.json();
    setOrders((prev) =>
      prev.map((o) => (o._id === id ? { ...o, status: data.status } : o))
    );
  };

  const toggleItemSelection = (orderId: string, itemName: string) => {
    setSelectedItems((prev) => {
      const current = prev[orderId] || [];
      if (current.includes(itemName)) {
        return { ...prev, [orderId]: current.filter((i) => i !== itemName) };
      } else {
        return { ...prev, [orderId]: [...current, itemName] };
      }
    });
  };

  const toggleSelectAll = (orderId: string, allItems: string[]) => {
    setSelectedItems((prev) => {
      const current = prev[orderId] || [];
      const allSelected = current.length === allItems.length;
      return {
        ...prev,
        [orderId]: allSelected ? [] : allItems,
      };
    });
  };

  const refundItems = async (order: Order) => {
    const selected = selectedItems[order._id] || [];
    if (selected.length === 0) return;

    const refundedItems = order.items.filter((i) => selected.includes(i.name));
    const refundAmount = refundedItems.reduce(
      (sum, i) => sum + i.price * i.qty,
      0
    );

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
      alert("✅ Refund recorded successfully");
      setCancelMode(null);
      setSelectedItems((prev) => ({ ...prev, [order._id]: [] }));
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
        <h2 className="orders-heading">📋 Orders</h2>

        {orders.length === 0 ? (
          <p className="empty-note">No orders yet.</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Categories</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
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
                            checked={
                              !!selectedItems[order._id]?.includes(i.name)
                            }
                            onChange={() =>
                              toggleItemSelection(order._id, i.name)
                            }
                          />
                        )}
                        {i.name} x{i.qty}
                      </div>
                    ))}
                    {cancelMode === order._id && (
                      <div>
                        <input
                          type="checkbox"
                          checked={
                            !!(
                              selectedItems[order._id]?.length ===
                              order.items.length
                            )
                          }
                          onChange={() =>
                            toggleSelectAll(
                              order._id,
                              order.items.map((i) => i.name)
                            )
                          }
                        />{" "}
                        Select All
                      </div>
                    )}
                  </td>
                  <td>₹{order.totalAmount}</td>
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
                        onClick={() => confirmOrder(order._id)}
                      >
                        Confirm ✅
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
                        <button
                          className="btn refund-btn"
                          onClick={() => refundItems(order)}
                        >
                          Refund 💰
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => setCancelMode(null)}
                        >
                          Close
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

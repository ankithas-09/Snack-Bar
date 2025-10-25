"use client";

import { useEffect, useMemo, useState } from "react";

// ================================
// Types
// ================================
type OrderItem = {
  name: string;
  qty: number;
  price: number;
  category: string;
};

type Order = {
  _id: string;
  orderNumber: number;
  categories: string[];
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
};

// ================================
// Categories
// ================================
const CATEGORIES = [
  "Bites",
  "Sandwiches",
  "Salad Bowls",
  "Fruit Bowls",
  "Smoothies",
  "Juices",
  "Hot Beverages",
  "Cold Beverages",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"day" | "week" | "biweek" | "month" | "all">("all");

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then(setOrders);
  }, []);

  // ================================
  // 🧮 Date Filter
  // ================================
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;

    if (filter === "day") {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === "week") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
    } else if (filter === "biweek") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 14);
    } else if (filter === "month") {
      startDate = new Date();
      startDate.setMonth(now.getMonth() - 1);
    }

    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (startDate && orderDate < startDate) return false;
      return true;
    });
  }, [orders, filter]);

  // ================================
  // 📊 Aggregation
  // ================================
  const aggregatedData = useMemo(() => {
    const result: Record<string, { name: string; totalQty: number; totalAmount: number }[]> = {};

    for (const cat of CATEGORIES) result[cat] = [];

    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const cat = item.category;
        const existing = result[cat].find((i) => i.name === item.name);
        if (existing) {
          existing.totalQty += item.qty;
          existing.totalAmount += item.price * item.qty;
        } else {
          result[cat].push({
            name: item.name,
            totalQty: item.qty,
            totalAmount: item.price * item.qty,
          });
        }
      });
    });

    for (const cat of CATEGORIES) {
      result[cat].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [filteredOrders]);

  const matchesSearch = (name: string) =>
    name.toLowerCase().includes(search.toLowerCase());

  const getTotalAmount = (cat: string) =>
    aggregatedData[cat].reduce((sum, i) => sum + i.totalAmount, 0);

  // ================================
  // 📥 Export to CSV
  // ================================
  const exportToCSV = () => {
    let csv = "Category,Item,Quantity,Amount (INR)\n";

    CATEGORIES.forEach((cat) => {
      const items = aggregatedData[cat].filter((i) => matchesSearch(i.name));
      if (items.length > 0) {
        items.forEach((i) => {
          csv += `${cat},"${i.name}",${i.totalQty},${i.totalAmount}\n`;
        });
        csv += `,,Total,${getTotalAmount(cat)}\n`;
      }
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
    link.href = url;
    link.setAttribute("download", `SnackBar-Orders-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="hero">
      <div className="back-container">
        <button className="btn secondary back-btn" onClick={() => history.back()}>
          ← Back
        </button>
      </div>

      <div className="glass admin-orders-glass">

        {/* Search + Filter + Export */}
        <div className="admin-filter-bar">
          <input
            type="text"
            placeholder="🔍 Search item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="day">Today</option>
            <option value="week">Weekly</option>
            <option value="biweek">Bi-Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <button className="btn export-btn" onClick={exportToCSV}>
            ⬇️ Export Report
          </button>
        </div>

        {/* Category Tables */}
        {CATEGORIES.map((cat) => {
          const items = aggregatedData[cat].filter((i) => matchesSearch(i.name));
          if (items.length === 0) return null;

          return (
            <div key={cat} className="category-section">
              <h2 className="category-title">{cat}</h2>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{item.totalQty}</td>
                      <td>₹{item.totalAmount}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={2}>
                      <strong>Total</strong>
                    </td>
                    <td>
                      <strong>₹{getTotalAmount(cat)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

// ================================
// Types
// ================================
type RefundedItem = {
  name: string;
  qty: number;
  price: number;
  category: string;
};

type Refund = {
  _id: string;
  orderNumber: number;
  refundedItems: RefundedItem[];
  refundAmount: number;
  createdAt: string;
};

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

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"day" | "week" | "biweek" | "month" | "all">("all");

  useEffect(() => {
    fetch("/api/refunds")
      .then((res) => res.json())
      .then(setRefunds);
  }, []);

  // ================================
  // 📅 Date Filter
  // ================================
  const filteredRefunds = useMemo(() => {
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

    return refunds.filter((r) => {
      const refundDate = new Date(r.createdAt);
      if (startDate && refundDate < startDate) return false;
      return true;
    });
  }, [refunds, filter]);

  // ================================
  // 📊 Aggregation by Category
  // ================================
  const aggregatedData = useMemo(() => {
    const result: Record<string, { name: string; totalQty: number; totalRefund: number }[]> = {};

    for (const cat of CATEGORIES) result[cat] = [];

    filteredRefunds.forEach((refund) => {
      refund.refundedItems.forEach((item) => {
        const cat = item.category;
        const existing = result[cat].find((i) => i.name === item.name);
        if (existing) {
          existing.totalQty += item.qty;
          existing.totalRefund += item.price * item.qty;
        } else {
          result[cat].push({
            name: item.name,
            totalQty: item.qty,
            totalRefund: item.price * item.qty,
          });
        }
      });
    });

    for (const cat of CATEGORIES) {
      result[cat].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [filteredRefunds]);

  const matchesSearch = (name: string) =>
    name.toLowerCase().includes(search.toLowerCase());

  const getTotalRefund = (cat: string) =>
    aggregatedData[cat].reduce((sum, i) => sum + i.totalRefund, 0);

  // ================================
  // 📥 Export to CSV
  // ================================
  const exportToCSV = () => {
    let csv = "Category,Item,Quantity,Refund Amount (INR)\n";

    CATEGORIES.forEach((cat) => {
      const items = aggregatedData[cat].filter((i) => matchesSearch(i.name));
      if (items.length > 0) {
        items.forEach((i) => {
          csv += `${cat},"${i.name}",${i.totalQty},${i.totalRefund}\n`;
        });
        csv += `,,Total,${getTotalRefund(cat)}\n`;
      }
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
    link.href = url;
    link.setAttribute("download", `SnackBar-Refunds-${today}.csv`);
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
            ⬇️ Export Refund Report
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
                    <th>Refund Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{item.totalQty}</td>
                      <td>₹{item.totalRefund}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={2}>
                      <strong>Total</strong>
                    </td>
                    <td>
                      <strong>₹{getTotalRefund(cat)}</strong>
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

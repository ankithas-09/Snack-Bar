"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieLabelRenderProps,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

/** ---- Types ---- */
type Item = { name: string; qty: number; price: number; category?: string };
type Order = { _id: string; items: Item[]; totalAmount: number; createdAt?: string };
type Refund = { refundAmount: number; refundedItems?: Item[]; createdAt?: string };

/** ---- Category Map ---- */
const ITEM_TO_CATEGORY: Record<string, string> = {
  "Potato Cheese Balls": "Bites",
  "Rice Paper Dahi Chat": "Bites",
  "Cheesy Soya Corn Kabab": "Bites",
  "Potato Stir Fry": "Bites",
  "Paneer Chickpea Nuggets": "Bites",
  "Classic Veg Grill Sandwich": "Sandwiches",
  "Caramelized Onion & Mushroom Sandwich": "Sandwiches",
  "Corn Sandwich": "Sandwiches",
  "Avocado Sandwich": "Sandwiches",
  "Roasted Cauliflower & Chickpea Salad": "Salad Bowls",
  "Roasted Crispy Potato Salad": "Salad Bowls",
  "Classic Sprouts Salad with Peanuts": "Salad Bowls",
  "Protein-Packed Soya Salad": "Salad Bowls",
  "Creamy Fruit Salad": "Fruit Bowls",
  "Cut Fruit Salad": "Fruit Bowls",
  "Chia Seeds Smoothie": "Smoothies",
  "Chocolate Smoothie": "Smoothies",
  "Banoffee Smoothie": "Smoothies",
  "Avocado Smoothie (Seasonal)": "Smoothies",
  ABC: "Juices",
  "Cucumber Spinach Green Apple": "Juices",
  "Watermelon Crush Juice": "Juices",
  "Muskmelon Juice": "Juices",
  "Mint & Lime Soda": "Juices",
  "Filter Coffee (sugar/jaggery)": "Hot Beverages",
  "Black Coffee": "Hot Beverages",
  Tea: "Hot Beverages",
  "Lemon Tea": "Hot Beverages",
  "Badam Milk": "Hot Beverages",
  "Cold Coffee": "Cold Beverages",
  "Iced Tea": "Cold Beverages",
};

/** ---- Colors ---- */
const BRAND_ORANGE = "#F66E12";
const BRAND_BLACK = "#000000";
const CHART_COLORS = [
  "#FF6B6B", "#4ECDC4", "#FFD93D", "#1A535C", "#FF9F1C", "#2EC4B6",
  "#E71D36", "#8E44AD", "#3498DB", "#F4A261", "#2A9D8F", "#E76F51",
];

type FilterType = "all" | "week" | "month";

export default function AdminSummaryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  /** ---- Load Data ---- */
  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/refunds").then((r) => r.json()),
    ])
      .then(([o, r]) => {
        setOrders(Array.isArray(o) ? o : []);
        setRefunds(Array.isArray(r) ? r : []);
      })
      .catch((e) => console.error("❌ Summary load error:", e));
  }, []);

  /** ---- Filter Orders & Refunds ---- */
  const filteredData = useMemo(() => {
    if (selectedDate) {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      const filteredOrders = orders.filter(
        (o) => o.createdAt && new Date(o.createdAt) >= dayStart && new Date(o.createdAt) <= dayEnd
      );
      const filteredRefunds = refunds.filter(
        (r) => r.createdAt && new Date(r.createdAt) >= dayStart && new Date(r.createdAt) <= dayEnd
      );

      return { filteredOrders, filteredRefunds };
    }

    if (filter === "all") return { filteredOrders: orders, filteredRefunds: refunds };

    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);

    if (filter === "week") cutoff.setDate(now.getDate() - 7);
    else if (filter === "month") cutoff.setDate(now.getDate() - 30);

    const filteredOrders = orders.filter(
      (o) => o.createdAt && new Date(o.createdAt) >= cutoff
    );
    const filteredRefunds = refunds.filter(
      (r) => r.createdAt && new Date(r.createdAt) >= cutoff
    );

    return { filteredOrders, filteredRefunds };
  }, [filter, selectedDate, orders, refunds]);

  const filteredOrders = filteredData.filteredOrders;
  const filteredRefunds = filteredData.filteredRefunds;

  /** ---- KPIs ---- */
  const totalOrders = filteredOrders.length;
  const totalSales = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalRefunds = filteredRefunds.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const netRevenue = totalSales - totalRefunds;

  /** ---- Pie Charts ---- */
  type Row = { name: string; value: number };
  const { categoryRows, itemRowsByCategory } = useMemo(() => {
    const catTotals = new Map<string, number>();
    const catItems = new Map<string, Map<string, number>>();

    for (const order of filteredOrders) {
      for (const it of order.items || []) {
        const cat = it.category || ITEM_TO_CATEGORY[it.name] || "Others";
        const value = (it.price || 0) * (it.qty || 0);
        catTotals.set(cat, (catTotals.get(cat) || 0) + value);
        if (!catItems.has(cat)) catItems.set(cat, new Map());
        const m = catItems.get(cat)!;
        m.set(it.name, (m.get(it.name) || 0) + value);
      }
    }

    const categoryRows = Array.from(catTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const itemRowsByCategory: Record<string, Row[]> = {};
    for (const [cat, itemMap] of catItems.entries()) {
      itemRowsByCategory[cat] = Array.from(itemMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }

    return { categoryRows, itemRowsByCategory };
  }, [filteredOrders]);

  const itemRows = selectedCategory ? itemRowsByCategory[selectedCategory] || [] : [];

  const getItemLabel = (props: PieLabelRenderProps) => {
    const name = props.name as string;
    const value = Number(props.value) || 0;
    const total = itemRows.reduce((s, r) => s + r.value, 0) || 1;
    return `${name} (${((value / total) * 100).toFixed(0)}%)`;
  };

  /** ---- Line Chart ---- */
  const revenueTimeline = useMemo(() => {
    const salesMap = new Map<string, number>();
    const refundMap = new Map<string, number>();
    const fmt = (d: string | Date) =>
      new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

    for (const o of filteredOrders) {
      if (!o.createdAt) continue;
      const dateKey = fmt(o.createdAt);
      salesMap.set(dateKey, (salesMap.get(dateKey) || 0) + (o.totalAmount || 0));
    }

    for (const r of filteredRefunds) {
      if (!r.createdAt) continue;
      const dateKey = fmt(r.createdAt);
      refundMap.set(dateKey, (refundMap.get(dateKey) || 0) + (r.refundAmount || 0));
    }

    const allDates = Array.from(new Set([...salesMap.keys(), ...refundMap.keys()]))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return allDates.map((date) => ({
      date,
      sales: salesMap.get(date) || 0,
      refunds: refundMap.get(date) || 0,
    }));
  }, [filteredOrders, filteredRefunds]);

  /** ---- Category Performance Table ---- */
  const categoryPerformance = useMemo(() => {
    const data: Record<
      string,
      { totalOrders: number; totalQty: number; totalSales: number; totalRefunds: number }
    > = {};

    for (const order of filteredOrders) {
      const seenCats = new Set<string>();
      for (const it of order.items) {
        const cat = it.category || ITEM_TO_CATEGORY[it.name] || "Others";
        if (!data[cat]) data[cat] = { totalOrders: 0, totalQty: 0, totalSales: 0, totalRefunds: 0 };
        data[cat].totalQty += it.qty;
        data[cat].totalSales += it.qty * it.price;
        if (!seenCats.has(cat)) {
          data[cat].totalOrders++;
          seenCats.add(cat);
        }
      }
    }

    for (const r of filteredRefunds) {
      for (const it of r.refundedItems || []) {
        const cat = it.category || ITEM_TO_CATEGORY[it.name] || "Others";
        if (!data[cat]) data[cat] = { totalOrders: 0, totalQty: 0, totalSales: 0, totalRefunds: 0 };
        data[cat].totalRefunds += it.qty * it.price;
      }
    }

    return Object.entries(data).map(([category, stats]) => ({
      category,
      ...stats,
      net: stats.totalSales - stats.totalRefunds,
    }));
  }, [filteredOrders, filteredRefunds]);

  return (
    <section className="hero">

      {/* 🧭 Filters outside the glass */}
      <div className="filter-bar">
        <button className="back-button" onClick={() => router.push("/admin-dashboard")}>
          ⬅ Back
        </button>

        <div className="filter-controls">
          <select
            className="filter-select"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as FilterType);
              setSelectedDate("");
            }}
          >
            <option value="all">All</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <input
            type="date"
            className="filter-date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setFilter("all");
            }}
          />
        </div>
      </div>

      {/* Glass Container */}
      <div className="glass">
        {/* KPI Cards */}
        <div className="kpi-container">
          <div className="kpi-card"><div className="kpi-title">🛍️ Total Orders</div><div className="kpi-value">{totalOrders}</div></div>
          <div className="kpi-card"><div className="kpi-title">💸 Total Sales</div><div className="kpi-value">₹{totalSales.toLocaleString("en-IN")}</div></div>
          <div className="kpi-card"><div className="kpi-title">💰 Total Refunds</div><div className="kpi-value">₹{totalRefunds.toLocaleString("en-IN")}</div></div>
          <div className="kpi-card"><div className="kpi-title">📈 Net Revenue</div><div className="kpi-value">₹{netRevenue.toLocaleString("en-IN")}</div></div>
        </div>

        {/* Pie Charts */}
        <div className="charts-grid" style={{ marginTop: 20 }}>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={categoryRows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={120}
                  onClick={(_, idx) => setSelectedCategory(categoryRows[idx]?.name || null)}
                >
                  {categoryRows.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#000" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => `₹${Number(val).toLocaleString("en-IN")}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {selectedCategory ? (
            <div className="chart-card">
              <div className="chart-title">🔎 {selectedCategory} — Item Split</div>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={itemRows} dataKey="value" nameKey="name" outerRadius={120} label={getItemLabel}>
                    {itemRows.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#000" strokeWidth={1.2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => `₹${Number(val).toLocaleString("en-IN")}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-card empty-drilldown" />
          )}
        </div>

        {/* Line Chart */}
        <div className="chart-card" style={{ marginTop: 30 }}>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(val: any) => `₹${Number(val).toLocaleString("en-IN")}`} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke={BRAND_ORANGE} strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="refunds" stroke={BRAND_BLACK} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="table-card" style={{ marginTop: 40 }}>
          <table className="performance-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Total Orders</th>
                <th>Total Quantity Sold</th>
                <th>Total Sales (₹)</th>
                <th>Total Refund (₹)</th>
                <th>Net (₹)</th>
              </tr>
            </thead>
            <tbody>
              {categoryPerformance.map((row) => (
                <tr key={row.category}>
                  <td>{row.category}</td>
                  <td>{row.totalOrders}</td>
                  <td>{row.totalQty}</td>
                  <td>₹{row.totalSales.toLocaleString("en-IN")}</td>
                  <td>₹{row.totalRefunds.toLocaleString("en-IN")}</td>
                  <td>₹{row.net.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

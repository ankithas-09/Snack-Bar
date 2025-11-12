// app/order/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ==============================
// Types
// ==============================
type Category =
  | "Bites"
  | "Sandwiches"
  | "Salad Bowls"
  | "Fruit Bowls"
  | "Smoothies"
  | "Juices"
  | "Hot Beverages"
  | "Cold Beverages"
  | "Miscellaneous";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  ingredients?: string;
  category: Category;
  allowDressings?: boolean;
};

const CATEGORIES: Category[] = [
  "Bites",
  "Sandwiches",
  "Salad Bowls",
  "Fruit Bowls",
  "Smoothies",
  "Juices",
  "Hot Beverages",
  "Cold Beverages",
  "Miscellaneous",
];

const DRESSINGS = ["Yogurt", "Chipotle", "Mint"] as const;
type Dressing = (typeof DRESSINGS)[number];

// ✅ Add dressing prices
const DRESSING_PRICES: Record<Dressing, number> = {
  Yogurt: 10,
  Chipotle: 15,
  Mint: 0,
};

// ==============================
// Menu Items (static list)
// ==============================
const ITEMS: MenuItem[] = [
  // 🧆 Bites
  { id: "bites-potato-stir-fry", category: "Bites", name: "Potato Stir Fry", price: 80 },
  { id: "bites-potato-cheese-balls", category: "Bites", name: "Potato Cheese Balls", price: 100 },
  { id: "bites-cheesy-soya-corn-kabab", category: "Bites", name: "Cheesy Soya Corn Kabab", price: 100 },
  { id: "bites-rice-paper-dahi-chat", category: "Bites", name: "Rice Paper Dahi Chat", price: 100 },
  { id: "bites-paneer-chickpea-nuggets", category: "Bites", name: "Paneer Chickpea Nuggets", price: 110 },

  // 🥪 Sandwiches
  { id: "sandwich-classic-veg", category: "Sandwiches", name: "Classic Veg Grill Sandwich", price: 90 },
  { id: "sandwich-corn", category: "Sandwiches", name: "Corn Chilly Cheese Sandwich", price: 90 },
  { id: "sandwich-caramelized-onion-mushroom", category: "Sandwiches", name: "Caramelized Onion & Mushroom Sandwich", price: 120 },
  { id: "sandwich-mumbai-street-style", category: "Sandwiches", name: "Mumbai Street Style Sandwich", price: 120 },
  { id: "sandwich-avocado", category: "Sandwiches", name: "Avocado Sandwich", price: 140 },

  // 🥗 Salad Bowls
  { id: "salad-roasted-cauliflower-chickpea", category: "Salad Bowls", name: "Roasted Cauliflower & Chickpea Salad", price: 100, allowDressings: true },
  { id: "salad-roasted-crispy-potato", category: "Salad Bowls", name: "Roasted Crispy Potato Salad", price: 100, allowDressings: true },
  { id: "salad-classic-sprouts-peanuts", category: "Salad Bowls", name: "Classic Sprouts Salad with Peanuts", price: 120, allowDressings: true },
  { id: "salad-protein-packed-soya", category: "Salad Bowls", name: "Protein-Packed Soya Salad", price: 120, allowDressings: true },

  // 🍓 Fruit Bowls
  { id: "fruit-cut-fruit-salad", category: "Fruit Bowls", name: "Cut Fruit Salad", price: 80 },
  { id: "fruit-creamy-fruit-salad", category: "Fruit Bowls", name: "Creamy Fruit Salad", price: 100 },

  // 🥤 Smoothies
  { id: "smoothie-chia-seeds", category: "Smoothies", name: "Chia Seeds Smoothie", price: 80 },
  { id: "smoothie-chocolate", category: "Smoothies", name: "Chocolate Smoothie", price: 90 },
  { id: "smoothie-banoffee", category: "Smoothies", name: "Banoffee Smoothie", price: 110 },
  { id: "smoothie-avocado", category: "Smoothies", name: "Avocado Smoothie (Seasonal)", price: 130 },

  // 🧃 Juices
  { id: "juice-mint-lime-soda", category: "Juices", name: "Mint & Lime Soda", price: 40 },
  { id: "juice-watermelon-crush", category: "Juices", name: "Watermelon Crush Juice", price: 60 },
  { id: "juice-abc", category: "Juices", name: "ABC", price: 60 },
  { id: "juice-muskmelon", category: "Juices", name: "Muskmelon Juice", price: 80 },
  { id: "juice-cucumber-spinach-greenapple", category: "Juices", name: "Cucumber Spinach Green Apple", price: 80 },

  // ☕ Hot Beverages
  { id: "hot-filter-coffee", category: "Hot Beverages", name: "Filter Coffee (sugar/jaggery)", price: 30 },
  { id: "hot-black-coffee", category: "Hot Beverages", name: "Black Coffee", price:30 },
  { id: "hot-tea", category: "Hot Beverages", name: "Tea", price: 30 },
  { id: "hot-lemon-tea", category: "Hot Beverages", name: "Lemon Tea", price: 30 },
  { id: "hot-badam-milk", category: "Hot Beverages", name: "Badam Milk", price: 30 },

  // 🧊 Cold Beverages
  { id: "cold-iced-tea", category: "Cold Beverages", name: "Iced Tea", price: 70 },
  { id: "cold-cold-coffee", category: "Cold Beverages", name: "Cold Coffee", price: 80 },
  { id: "cold-badam-milk", category: "Cold Beverages", name: "Badam Milk", price: 80 },

  // 🧩 Miscellaneous
  { id: "misc-water-bottle", category: "Miscellaneous", name: "Water Bottle", price: 10 },

];

// ==============================
// Helpers
// ==============================
const DRESS_KEY_PREFIX = "|dress:";
type Cart = Record<string, number>;

function cartKey(id: string, dressings?: Dressing[]) {
  if (!dressings || dressings.length === 0) return id;
  const d = [...dressings].sort().join("+");
  return `${id}${DRESS_KEY_PREFIX}${d}`;
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

// Filter only the dressings we support (safety for DB values)
function asSupportedDressings(values: unknown): Dressing[] {
  const set = new Set<Dressing>();
  if (Array.isArray(values)) {
    for (const v of values) {
      if (v === "Yogurt" || v === "Chipotle" || v === "Mint") set.add(v);
    }
  }
  return Array.from(set);
}

// ✅ helper to get today's key in IST for localStorage
function getTodayISTKey() {
  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  }); // e.g. 2025-11-03
  return `kreede-snackbar-oos-${todayIST}`;
}

/* ==============================
   Wrap useSearchParams in Suspense
   ============================== */
export default function OrderPage() {
  return (
    <Suspense fallback={<div className="empty-note">Loading…</div>}>
      <OrderPageInner />
    </Suspense>
  );
}

/* ==============================
   Real page content
   ============================== */
function OrderPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const isEdit = sp.get("edit") === "1";
  const orderId = sp.get("orderId") || "";

  const [active, setActive] = useState<Category>("Bites");
  const [cart, setCart] = useState<Cart>({});
  const [saladDressings, setSaladDressings] = useState<Record<string, Dressing[]>>({});
  const [outOfStock, setOutOfStock] = useState<Record<string, boolean>>({});
  const [loadingOrder, setLoadingOrder] = useState<boolean>(false);
  const [employeeOrder, setEmployeeOrder] = useState<boolean>(false); // ⭐ NEW

  // load today's out-of-stock map on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = getTodayISTKey();
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setOutOfStock(parsed);
      } catch {
        // ignore bad JSON
      }
    }
  }, []);

  const saveOutOfStockForToday = (data: Record<string, boolean>) => {
    if (typeof window === "undefined") return;
    const key = getTodayISTKey();
    window.localStorage.setItem(key, JSON.stringify(data));
  };

  const setDressingSelected = (itemId: string, dressing: Dressing, on: boolean) => {
    setSaladDressings((prev) => {
      const current = new Set(prev[itemId] || []);
      if (on) current.add(dressing);
      else current.delete(dressing);
      return { ...prev, [itemId]: Array.from(current) };
    });
  };

  // ✅ updated to also persist to localStorage (per day)
  const toggleStock = (id: string) => {
    setOutOfStock((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      // save to localStorage for today
      saveOutOfStockForToday(next);
      return next;
    });

    // also drop it from cart if it was there
    setCart((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(id)) delete next[key];
      }
      return next;
    });
  };

  const visibleItems = useMemo(() => ITEMS.filter((i) => i.category === active), [active]);

  const totalItems = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  // ✅ Updated totalAmount to include dressing prices
  const totalAmount = useMemo(() => {
    return Object.entries(cart).reduce((sum, [key, qty]) => {
      const id = key.split(DRESS_KEY_PREFIX)[0];
      const item = ITEMS.find((i) => i.id === id);
      if (!item) return sum;

      let base = item.price;
      const dressPart = key.includes(DRESS_KEY_PREFIX) ? key.split(DRESS_KEY_PREFIX)[1] : "";
      if (dressPart) {
        const chosen = dressPart.split("+") as Dressing[];
        const dressCost = chosen.reduce((s, d) => s + (DRESSING_PRICES[d] || 0), 0);
        base += dressCost;
      }

      return sum + base * qty;
    }, 0);
  }, [cart]);

  // ⭐ this is what we will actually show/send
  const payableAmount = employeeOrder ? 0 : totalAmount;

  const inc = (id: string, dressings?: Dressing[]) => {
    if (outOfStock[id]) return;
    setCart((c) => {
      const key = cartKey(id, dressings);
      return { ...c, [key]: (c[key] || 0) + 1 };
    });
  };

  const dec = (id: string, dressings?: Dressing[]) => {
    setCart((c) => {
      const key = cartKey(id, dressings);
      const next = { ...c };
      if (!next[key]) return next;
      next[key] = next[key] - 1;
      if (next[key] <= 0) delete next[key];
      return next;
    });
  };

  const qtyOf = (id: string, dressings?: Dressing[]) => {
    const key = cartKey(id, dressings);
    return cart[key] || 0;
  };

  // ==============================
  // EDIT MODE: hydrate cart from existing order
  // ==============================
  useEffect(() => {
    if (!isEdit || !orderId) return;

    (async () => {
      try {
        setLoadingOrder(true);
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        const json = await res.json();
        if (!json?.ok || !json.order) throw new Error(json?.error || "Failed to load order");

        const dbItems = (json.order.items || []) as Array<{
          name: string;
          qty: number;
          price: number;
          category: string;
          dressings?: unknown[];
        }>;

        const nextCart: Cart = {};
        const nextDressings: Record<string, Dressing[]> = {};

        for (const it of dbItems) {
          const m = ITEMS.find((x) => x.name === it.name);
          if (!m) {
            console.warn("Unknown menu item from DB:", it.name);
            continue;
          }
          const allowDress = m.allowDressings && m.category === "Salad Bowls";
          const chosen = allowDress ? asSupportedDressings(it.dressings) : [];

          const key = cartKey(m.id, chosen);
          nextCart[key] = (nextCart[key] || 0) + Math.max(0, Math.floor(it.qty || 0));

          if (allowDress && chosen.length > 0) nextDressings[m.id] = chosen;
        }

        setCart(nextCart);
        if (Object.keys(nextDressings).length > 0) {
          setSaladDressings((prev) => ({ ...prev, ...nextDressings }));
        }

        const firstKey = Object.keys(nextCart)[0];
        if (firstKey) {
          const firstId = firstKey.split(DRESS_KEY_PREFIX)[0];
          const firstItem = ITEMS.find((i) => i.id === firstId);
          if (firstItem) setActive(firstItem.category);
        }
      } catch (e) {
        alert((e as Error).message || "Failed to load order");
      } finally {
        setLoadingOrder(false);
      }
    })();
  }, [isEdit, orderId]);

  const checkout = async () => {
    const itemsList = Object.entries(cart).map(([key, qty]) => {
      const id = key.split(DRESS_KEY_PREFIX)[0];
      const item = ITEMS.find((i) => i.id === id);
      const dressPart = key.includes(DRESS_KEY_PREFIX)
        ? key.split(DRESS_KEY_PREFIX)[1]
        : "";
      const chosenDressings = dressPart ? (dressPart.split("+") as Dressing[]) : [];
      const dressingCost = chosenDressings.reduce((s, d) => s + (DRESSING_PRICES[d] || 0), 0);
      return {
        name: item?.name || "",
        qty,
        price: (item?.price || 0) + dressingCost,
        category: item?.category || "",
        dressings: chosenDressings,
      };
    });

    const categories = [...new Set(itemsList.map((i) => i.category).filter(Boolean))];

    if (isEdit && orderId) {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsList,
          categories,
          // you can store the flag even in edit
          employee: employeeOrder, // ⭐ optional
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        alert(`Failed to save changes: ${json?.error || res.statusText}`);
        return;
      }
      router.push("/orders");
    } else {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories,
          items: itemsList,
          totalAmount: payableAmount, // ⭐ 0 if employee
          employee: employeeOrder,    // ⭐ to identify later
        }),
      });
      if (res.ok) router.push("/orders");
      else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to place order: ${err?.error || res.statusText}`);
      }
    }
  };

  const renderItemCard = (item: MenuItem) => {
    const allowDress = item.allowDressings && item.category === "Salad Bowls";
    const selectedDressings = allowDress ? saladDressings[item.id] || [] : undefined;
    const isOut = outOfStock[item.id];

    const extra =
      allowDress && selectedDressings && selectedDressings.length > 0
        ? selectedDressings.reduce((s, d) => s + (DRESSING_PRICES[d] || 0), 0)
        : 0;

    return (
      <article className={`menu-card ${isOut ? "out-of-stock" : ""}`} key={item.id}>
        <header className="menu-card-header">
          <h3 className="menu-title">{item.name}</h3>
          <div className="menu-price">{formatINR(item.price + extra)}</div>
        </header>

        <div className="stock-toggle">
          <label className="switch">
            <input
              type="checkbox"
              checked={!!isOut}
              onChange={() => toggleStock(item.id)}
            />
            <span className="slider round"></span>
          </label>
          <span className="stock-label">{isOut ? "Out of Stock" : "In Stock"}</span>
        </div>

        {allowDress && (
          <div className="dressing-group">
            {DRESSINGS.map((d) => {
              const checked = selectedDressings?.includes(d) ?? false;
              return (
                <label key={d} className={`chip ${checked ? "on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isOut}
                    onChange={(e) => setDressingSelected(item.id, d, e.target.checked)}
                  />
                  {d} ({formatINR(DRESSING_PRICES[d])})
                </label>
              );
            })}
          </div>
        )}

        <div className="menu-actions">
          <div className="qty">
            <button
              className="qty-btn"
              disabled={isOut}
              onClick={() => dec(item.id, selectedDressings)}
            >
              −
            </button>
            <div className="qty-num">{qtyOf(item.id, selectedDressings)}</div>
            <button
              className="qty-btn"
              disabled={isOut}
              onClick={() => inc(item.id, selectedDressings)}
            >
              +
            </button>
          </div>
          <button
            className="btn add-btn"
            disabled={isOut}
            onClick={() => inc(item.id, selectedDressings)}
          >
            {isEdit ? "Add (Edit)" : "Add"}
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="hero">
      <div className="back-container">
        <button
          className="btn secondary back-btn"
          onClick={() => router.push(isEdit ? "/orders" : "/")}
        >
          ← Back
        </button>
      </div>

      <div className="glass">
        <div className="flex items-center justify-between mb-2">
          <h2 className="orders-heading">
            {isEdit ? (loadingOrder ? "Loading Order…" : "Edit Order") : "Create Order"}
          </h2>
        </div>

        <nav className="tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`tab ${active === cat ? "active" : ""}`}
              onClick={() => setActive(cat)}
            >
              {cat}
            </button>
          ))}
        </nav>

        {loadingOrder ? (
          <div className="empty-note">Fetching existing order…</div>
        ) : visibleItems.length === 0 ? (
          <div className="empty-note">
            No items in <strong>{active}</strong> yet.
          </div>
        ) : (
          <div className="menu-grid">{visibleItems.map(renderItemCard)}</div>
        )}
      </div>

      <div className="cartbar">
        <div className="cartbar-left">
          <span className="cart-count">
            {totalItems} item{totalItems !== 1 && "s"}
          </span>
          <span className="cart-amount">{formatINR(payableAmount)}</span>
          {/* ⭐ Employee toggle button */}
          <button
            type="button"
            className={`btn secondary ml-2 ${employeeOrder ? "active" : ""}`}
            onClick={() => setEmployeeOrder((v) => !v)}
          >
            {employeeOrder ? "Employee: ON" : "Employee"}
          </button>
        </div>
        <div className="cartbar-right">
          <button
            className="btn secondary"
            onClick={() => {
              setCart({});
              setEmployeeOrder(false); // reset when clearing
            }}
            disabled={totalItems === 0}
          >
            Clear
          </button>
          <button className="btn" onClick={checkout} disabled={totalItems === 0}>
            {isEdit ? "Save Changes →" : "Checkout →"}
          </button>
        </div>
      </div>
    </section>
  );
}

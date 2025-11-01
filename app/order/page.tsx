"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  | "Cold Beverages";

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
// Menu Items
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

// ==============================
// Component
// ==============================
export default function OrderPage() {
  const router = useRouter();
  const [active, setActive] = useState<Category>("Bites");
  const [cart, setCart] = useState<Cart>({});
  const [saladDressings, setSaladDressings] = useState<Record<string, Dressing[]>>({});
  const [outOfStock, setOutOfStock] = useState<Record<string, boolean>>({});

  const setDressingSelected = (itemId: string, dressing: Dressing, on: boolean) => {
    setSaladDressings((prev) => {
      const current = new Set(prev[itemId] || []);
      if (on) current.add(dressing);
      else current.delete(dressing);
      return { ...prev, [itemId]: Array.from(current) };
    });
  };

  const toggleStock = (id: string) => {
    setOutOfStock((prev) => ({ ...prev, [id]: !prev[id] }));
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
      const dressPart = key.includes(DRESS_KEY_PREFIX)
        ? key.split(DRESS_KEY_PREFIX)[1]
        : "";
      if (dressPart) {
        const chosen = dressPart.split("+") as Dressing[];
        const dressCost = chosen.reduce((s, d) => s + (DRESSING_PRICES[d] || 0), 0);
        base += dressCost;
      }

      return sum + base * qty;
    }, 0);
  }, [cart]);

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

  const checkout = async () => {
    const itemsList = Object.entries(cart).map(([key, qty]) => {
      const id = key.split(DRESS_KEY_PREFIX)[0];
      const item = ITEMS.find((i) => i.id === id);
      const dressPart = key.includes(DRESS_KEY_PREFIX)
        ? key.split(DRESS_KEY_PREFIX)[1]
        : "";
      const chosenDressings = dressPart ? dressPart.split("+") as Dressing[] : [];
      const dressingCost = chosenDressings.reduce((s, d) => s + (DRESSING_PRICES[d] || 0), 0);
      return {
        name: item?.name || "",
        qty,
        price: (item?.price || 0) + dressingCost, // ✅ price includes dressing cost
        category: item?.category || "",
        dressings: chosenDressings,
      };
    });

    const categories = [
      ...new Set(
        itemsList.map((i) => i.category).filter(Boolean)
      ),
    ];

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categories,
        items: itemsList,
        totalAmount,
      }),
    });

    if (res.ok) router.push("/orders");
  };

  const renderItemCard = (item: MenuItem) => {
    const allowDress = item.allowDressings && item.category === "Salad Bowls";
    const selectedDressings = allowDress ? saladDressings[item.id] || [] : undefined;
    const isOut = outOfStock[item.id];

    // Calculate dressing add-on for display
    const extra =
      allowDress && selectedDressings && selectedDressings.length > 0
        ? selectedDressings.reduce((s, d) => s + (DRESSING_PRICES[d] || 0), 0)
        : 0;

    return (
      <article className={`menu-card ${isOut ? "out-of-stock" : ""}`} key={item.id}>
        <header className="menu-card-header">
          <h3 className="menu-title">{item.name}</h3>
          <div className="menu-price">
            {formatINR(item.price + extra)}
          </div>
        </header>

        {/* Toggle Switch */}
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
            Add
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="hero">
      <div className="back-container">
        <button className="btn secondary back-btn" onClick={() => router.push("/")}>
          ← Back
        </button>
      </div>

      <div className="glass">
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

        {visibleItems.length === 0 ? (
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
          <span className="cart-amount">{formatINR(totalAmount)}</span>
        </div>
        <div className="cartbar-right">
          <button
            className="btn secondary"
            onClick={() => setCart({})}
            disabled={totalItems === 0}
          >
            Clear
          </button>
          <button className="btn" onClick={checkout} disabled={totalItems === 0}>
            Checkout →
          </button>
        </div>
      </div>
    </section>
  );
}

// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import { OrderModel, type OrderItem, type OrderStatus } from "@/models/Order";

/* ---------- Types for lean() so _id is ObjectId (not unknown) ---------- */
type OrderLean = {
  _id: mongoose.Types.ObjectId;
  orderNumber: number;
  categories: string[];
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

/* ---------- Helpers ---------- */
function sumTotal(items: OrderItem[]) {
  return items.reduce((n, it) => n + it.price * it.qty, 0);
}

function normalizeItems(raw: unknown[]): OrderItem[] {
  return (raw ?? []).map((it: any) => ({
    name: String(it?.name ?? ""),
    qty: Number(it?.qty ?? 0),
    price: Number(it?.price ?? 0),
    category: String(it?.category ?? ""),
    dressings: Array.isArray(it?.dressings) ? it.dressings.map(String) : [],
  }));
}

function toStringArray(a: unknown[]): string[] {
  return a.map((v) => String(v));
}

/* ---------- GET /api/orders/[id] ---------- */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // Next.js: params is a Promise
) {
  try {
    await dbConnect();

    const { id } = await ctx.params; // ✅ await
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: "Invalid order id" }, { status: 400 });
    }

    const order = await OrderModel.findById(id).lean<OrderLean | null>();
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      order: {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        categories: order.categories ?? [],
        items: order.items ?? [],
        totalAmount: order.totalAmount,
        status: order.status,
        deliveredAt: order.deliveredAt ?? null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (e) {
    console.error("GET /api/orders/[id] error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

/* ---------- PUT /api/orders/[id] ---------- */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // Next.js: params is a Promise
) {
  try {
    await dbConnect();

    const { id } = await ctx.params; // ✅ await
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: "Invalid order id" }, { status: 400 });
    }

    const body: unknown = await req.json();
    const b = body as { items?: unknown[]; categories?: unknown[]; status?: unknown };

    const existing = await OrderModel.findById(id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    // Optional: update status if provided (e.g., external callers)
    if (typeof b.status === "string") {
      const newStatus = b.status.toUpperCase();
      if (newStatus === "PENDING" || newStatus === "CONFIRMED" || newStatus === "DELIVERED") {
        existing.status = newStatus as OrderStatus;
        if (newStatus === "DELIVERED" && !existing.deliveredAt) {
          existing.deliveredAt = new Date();
        }
      }
    }

    // If items are provided, validate + update
    if (Array.isArray(b.items)) {
      if (b.items.length === 0) {
        return NextResponse.json({ ok: false, error: "Items are required." }, { status: 400 });
      }

      // Block editing delivered orders
      if (existing.status && existing.status.toUpperCase() === "DELIVERED") {
        return NextResponse.json(
          { ok: false, error: "Cannot edit a delivered order." },
          { status: 400 }
        );
      }

      const items = normalizeItems(b.items);
      if (items.some((i) => !i.name || !i.category || i.qty <= 0 || i.price < 0)) {
        return NextResponse.json({ ok: false, error: "Invalid items payload." }, { status: 400 });
      }

      const categories: string[] = Array.isArray(b.categories)
        ? [...new Set(toStringArray(b.categories))]
        : [...new Set(items.map((i) => i.category))];

      existing.items = items;
      existing.categories = categories;
      existing.totalAmount = sumTotal(items); // authoritative recompute
    }

    await existing.save();

    // Use .id (string getter) to avoid _id: unknown typing on Document
    return NextResponse.json({
      ok: true,
      orderId: existing.id,
      status: existing.status,
      totalAmount: existing.totalAmount,
      deliveredAt: existing.deliveredAt ?? null,
      updatedAt: existing.updatedAt,
    });
  } catch (e) {
    console.error("PUT /api/orders/[id] error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

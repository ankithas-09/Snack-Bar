// app/api/orders/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { OrderModel } from "@/models/Order";

// ==============================
// POST — Create a New Order
// ==============================
export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();

    // ✅ Robust validation (allow totalAmount === 0)
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: "Items are required." }, { status: 400 });
    }
    if (!Array.isArray(data.categories)) {
      return NextResponse.json({ error: "Categories are required." }, { status: 400 });
    }
    if (typeof data.totalAmount !== "number") {
      return NextResponse.json({ error: "totalAmount must be a number." }, { status: 400 });
    }

    // ✅ Find the last order number and increment sequentially
    const lastOrder = await OrderModel.findOne().sort({ orderNumber: -1 });
    const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;

    // ⭐ persist employee flag too (will be false if not sent)
    const isEmployee = !!data.employee;

    // Persist items as-is (supports optional `dressings` per item)
    const newOrder = await OrderModel.create({
      orderNumber: nextOrderNumber,
      categories: data.categories,
      items: data.items, // { name, qty, price (incl. dressings), category, dressings?: string[] }
      totalAmount: data.totalAmount,
      status: "PENDING",
      employee: isEmployee, // ⭐ NEW
    });

    return NextResponse.json(newOrder);
  } catch (err) {
    console.error("❌ Error creating order:", err);
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }
}

// ==============================
// GET — Fetch All Orders
// ==============================
export async function GET() {
  try {
    await dbConnect();
    const orders = await OrderModel.find().sort({ createdAt: -1 });
    // orders now include .employee if present
    return NextResponse.json(orders);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}

// ==============================
// DELETE — Clear All Orders
// ==============================
export async function DELETE() {
  try {
    await dbConnect();
    const res = await OrderModel.deleteMany({});
    return NextResponse.json({ ok: true, deletedCount: res.deletedCount ?? 0 });
  } catch (err) {
    console.error("❌ Error deleting orders:", err);
    return NextResponse.json({ error: "Failed to delete orders." }, { status: 500 });
  }
}

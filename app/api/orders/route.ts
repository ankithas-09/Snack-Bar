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

    if (!data.items || !data.categories || !data.totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // ✅ Find the last order number and increment sequentially
    const lastOrder = await OrderModel.findOne().sort({ orderNumber: -1 });
    const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;

    const newOrder = await OrderModel.create({
      orderNumber: nextOrderNumber,
      categories: data.categories,
      items: data.items,
      totalAmount: data.totalAmount,
      status: "PENDING",
    });

    return NextResponse.json(newOrder);
  } catch (err) {
    console.error("❌ Error creating order:", err);
    return NextResponse.json(
      { error: "Failed to create order." },
      { status: 500 }
    );
  }
}

// ==============================
// GET — Fetch All Orders
// ==============================
export async function GET() {
  try {
    await dbConnect();
    const orders = await OrderModel.find().sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders." },
      { status: 500 }
    );
  }
}

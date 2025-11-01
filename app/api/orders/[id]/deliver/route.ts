import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { OrderModel } from "@/models/Order";

// ✅ In Next 14+/15, params can be a Promise — await it first.
export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; // <-- await here
    await dbConnect();

    const order = await OrderModel.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Optional guard: only allow after confirm
    if (order.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Only CONFIRMED orders can be marked DELIVERED" },
        { status: 400 }
      );
    }

    order.status = "DELIVERED";
    order.deliveredAt = new Date();
    await order.save();

    return NextResponse.json({
      success: true,
      status: order.status,
      deliveredAt: order.deliveredAt,
      _id: order._id,
      orderNumber: order.orderNumber,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to deliver" }, { status: 500 });
  }
}

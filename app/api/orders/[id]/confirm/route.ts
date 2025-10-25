import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { OrderModel } from "@/models/Order";
import { getSheetsClient } from "@/lib/googleSheets";

const SHEET_ID = process.env.SNACKBAR_SHEET_ID as string;

export async function PATCH(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await dbConnect();

    // 🔹 Fetch the order
    const order = await OrderModel.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ✅ Update order status
    order.status = "CONFIRMED";
    await order.save();

    const sheets = await getSheetsClient();
    const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN");

    // 📝 Check for header row
    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A1:L1",
    });

    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
      // 📝 Create a dynamic header with space for multiple items & qty
      const header = [
        "Order Number",
        "Date",
        "Category",
        "Item 1",
        "Qty 1",
        "Item 2",
        "Qty 2",
        "Item 3",
        "Qty 3",
        "Category Total",
        "Status",
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: "Sheet1!A1:K1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [header] },
      });
    }

    // 🧾 For each category
    const rows = order.categories.map((cat: string) => {
      const itemsInCategory = order.items.filter((i: any) => i.category === cat);
      const categoryTotal = itemsInCategory.reduce(
        (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
        0
      );

      // Fill up item columns (up to 3 items here, can be expanded easily)
      const flatItems: (string | number)[] = [];
      for (let i = 0; i < 3; i++) {
        if (itemsInCategory[i]) {
          flatItems.push(itemsInCategory[i].name);
          flatItems.push(itemsInCategory[i].qty);
        } else {
          flatItems.push(""); // empty item name
          flatItems.push(""); // empty qty
        }
      }

      return [
        order.orderNumber,
        formattedDate,
        cat,
        ...flatItems,
        categoryTotal,
        order.status,
      ];
    });

    // 📤 Append rows
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A2:K",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });

    return NextResponse.json(order);
  } catch (err) {
    console.error("❌ Error confirming order:", err);
    return NextResponse.json(
      { error: "Failed to confirm and sync order." },
      { status: 500 }
    );
  }
}

// app/api/orders/[id]/confirm/route.ts
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

    // 📝 Ensure a header row exists with columns for 3 items (Name/Qty/Dressings)
    // Columns: A..N => 14 columns (Order#, Date, Category, [Item/Qty/Dress]*3, Category Total, Status)
    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A1:N1",
    });

    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
      const header = [
        "Order Number",  // A
        "Date",          // B
        "Category",      // C
        "Item 1",        // D
        "Qty 1",         // E
        "Dressings 1",   // F
        "Item 2",        // G
        "Qty 2",         // H
        "Dressings 2",   // I
        "Item 3",        // J
        "Qty 3",         // K
        "Dressings 3",   // L
        "Category Total",// M
        "Status",        // N
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: "Sheet1!A1:N1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [header] },
      });
    }

    // 🧾 For each category: write a row with up to 3 items (with Qty and Dressings)
    const rows = order.categories.map((cat: string) => {
      const itemsInCategory = (order.items as any[]).filter((i) => i.category === cat);

      // Sum price * qty (price already includes dressing add-on coming from UI)
      const categoryTotal = itemsInCategory.reduce(
        (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
        0
      );

      // Prepare up to 3 items flat: [name, qty, dressingsStr] x 3
      const flat: (string | number)[] = [];
      for (let i = 0; i < 3; i++) {
        const it = itemsInCategory[i];
        if (it) {
          const dressings = Array.isArray(it.dressings) ? it.dressings.join("+") : "";
          flat.push(it.name ?? "");
          flat.push(it.qty ?? "");
          flat.push(dressings);
        } else {
          flat.push(""); // name
          flat.push(""); // qty
          flat.push(""); // dressings
        }
      }

      return [
        order.orderNumber,    // A
        formattedDate,        // B
        cat,                  // C
        ...flat,              // D-L (3 * [name, qty, dressings])
        categoryTotal,        // M
        order.status,         // N
      ];
    });

    // 📤 Append rows
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A2:N",
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

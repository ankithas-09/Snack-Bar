// app/api/refunds/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { RefundModel } from "@/models/Refund";
import { getSheetsClient } from "@/lib/googleSheets";

const SHEET_ID = process.env.SNACKBAR_SHEET_ID as string;

// ===================================================
// ✅ CREATE Refund (POST)
// ===================================================
export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();

    if (!data.orderNumber || !data.refundedItems || data.refundedItems.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    // 🧾 Ensure Sheet2 has headers
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet2!A1:A1",
    });

    if (!readRes.data.values) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "Sheet2!A1:F1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              "Order Number",
              "Refund Date",
              "Item Refunded",
              "Quantity",
              "Refund Amount",
              "Status",
            ],
          ],
        },
      });
    }

    // 🪄 1. Create separate refund docs & sheet rows for each refunded item
    const createdRefunds = [];
    const sheetValues: any[] = [];

    for (const item of data.refundedItems) {
      const singleRefundAmount = item.price * item.qty;

      // ✅ Create one document per item
      const refundDoc = await RefundModel.create({
        orderNumber: data.orderNumber,
        refundedItems: [item],
        refundAmount: singleRefundAmount,
      });

      createdRefunds.push(refundDoc);

      // ✅ Prepare one row per item for Google Sheets
      const formattedDate = new Date(refundDoc.createdAt).toLocaleString("en-IN");
      sheetValues.push([
        data.orderNumber,
        formattedDate,
        item.name,
        item.qty,
        singleRefundAmount,
        "REFUNDED",
      ]);
    }

    // 📝 2. Append multiple rows at once to Sheet2
    if (sheetValues.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "Sheet2!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: sheetValues,
        },
      });
    }

    return NextResponse.json({ success: true, refunds: createdRefunds });
  } catch (err) {
    console.error("❌ Error creating refund:", err);
    return NextResponse.json({ error: "Failed to create refund" }, { status: 500 });
  }
}

// ===================================================
// ✅ READ Refunds (GET)
// ===================================================
export async function GET() {
  try {
    await dbConnect();
    const refunds = await RefundModel.find().sort({ createdAt: -1 });
    return NextResponse.json(refunds);
  } catch (err) {
    console.error("❌ Error fetching refunds:", err);
    return NextResponse.json({ error: "Failed to fetch refunds" }, { status: 500 });
  }
}

// app/api/refunds/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { RefundModel } from "@/models/Refund";
import { getSheetsClient } from "@/lib/googleSheets";

const SHEET_ID = process.env.SNACKBAR_SHEET_ID as string;

// ===================================================
// ✅ CREATE Refund (POST)
// - Writes one refund doc per refunded item
// - Appends one row per item to Google Sheet "Sheet2"
// - Returns array: created refund docs
// ===================================================
export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();

    const { orderNumber, refundedItems, refundAmount } = data || {};
    if (
      typeof orderNumber !== "number" ||
      !Array.isArray(refundedItems) ||
      refundedItems.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid refund payload" },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    // Ensure Sheet2 has headers (A1:F1)
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet2!A1:F1",
    });

    if (!readRes.data.values || readRes.data.values.length === 0) {
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

    // Create separate refund docs for each item, and log to Sheets
    const createdRefunds = [];
    const sheetValues: any[] = [];

    for (const item of refundedItems) {
      const singleRefundAmount = item.price * item.qty;

      const refundDoc = await RefundModel.create({
        orderNumber,
        refundedItems: [item],
        refundAmount: singleRefundAmount,
      });

      createdRefunds.push(refundDoc);

      const formattedDate = new Date(refundDoc.createdAt).toLocaleString("en-IN");
      sheetValues.push([
        orderNumber,
        formattedDate,
        item.name,
        item.qty,
        singleRefundAmount,
        "REFUNDED",
      ]);
    }

    if (sheetValues.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "Sheet2!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: sheetValues },
      });
    }

    return NextResponse.json({ success: true, refunds: createdRefunds });
  } catch (err: any) {
    console.error("❌ Error creating refund:", err);
    return NextResponse.json({ error: err?.message || "Failed to create refund" }, { status: 500 });
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
  } catch (err: any) {
    console.error("❌ Error fetching refunds:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch refunds" }, { status: 500 });
  }
}

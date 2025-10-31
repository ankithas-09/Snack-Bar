// lib/qzPrinter.ts
// ESC/POS printing via QZ Tray for 80mm (3") 203dpi printers like TVS RP-3230

declare global {
  interface Window {
    qz?: any;
  }
}

type Item = { name: string; qty: number; price: number; category: string };

// You can toggle to true if your printer renders the ₹ symbol correctly.
const USE_RUPEE_SIGN = false;
function inr(n: number) {
  const amt = Math.round(n).toLocaleString("en-IN");
  return USE_RUPEE_SIGN ? `₹${amt}` : `Rs. ${amt}`;
}

// Utility to convert local image to DataURL
async function loadImageAsDataURL(url: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// For 80mm thermal paper: roughly 48 characters per line (12x24 font)
const WIDTH = 48;
const NAME_W = 30;
const QTY_W = 3;
const AMT_W = WIDTH - NAME_W - QTY_W; // 15

function padRight(s: string, w: number) {
  const t = s.length > w ? s.slice(0, w) : s;
  return t + " ".repeat(Math.max(0, w - t.length));
}
function padLeft(s: string, w: number) {
  const t = s.length > w ? s.slice(0, w) : s;
  return " ".repeat(Math.max(0, w - t.length)) + t;
}
function rowLine(name: string, qty: number, amt: string) {
  return padRight(name, NAME_W) + padLeft(String(qty), QTY_W) + padLeft(amt, AMT_W);
}

export async function printWithQZ(opts: {
  printerName?: string;
  orderNumber: number;
  createdAt: string | Date;
  items: Item[];
  totalAmount: number;
  logoDataUrl?: string; // inline Data URL (preferred)
  logoUrl?: string;     // fallback path e.g. "/snack-bar-logo.jpg"
}) {
  const qz = window.qz;
  if (!qz) throw new Error("QZ Tray not loaded");

  // Allow unsigned connection for local printing
  qz.security?.setCertificatePromise?.(() => Promise.resolve("UNSIGNED"));
  qz.security?.setSignaturePromise?.((toSign: string) => Promise.resolve(toSign));

  // Connect socket (safe to call repeatedly)
  await qz.websocket.connect().catch((e: any) => {
    if (!qz.websocket.isActive()) throw e;
  });

  const printer = opts.printerName
    ? await qz.printers.find(opts.printerName)
    : await qz.printers.getDefault();

  const dateStr = new Date(opts.createdAt).toLocaleString("en-IN");

  // ESC/POS control codes
  const ESC = "\x1B", GS = "\x1D";
  const init = ESC + "@";
  const alignLeft = ESC + "a" + "\x00";
  const alignCenter = ESC + "a" + "\x01";
  const boldOn = ESC + "E" + "\x01";
  const boldOff = ESC + "E" + "\x00";
  const doubleOn = ESC + "!" + "\x10";
  const doubleOff = ESC + "!" + "\x00";
  const cut = GS + "V" + "\x41" + "\x03";
  const lf = "\x0A";
  const hr = "-".repeat(WIDTH) + lf;

  // === Build text lines ===
  const lines: string[] = [];
  lines.push(init);
  lines.push(alignCenter);
  lines.push(boldOn + doubleOn + "KREEDE" + doubleOff + boldOff + lf);
  lines.push("Snack Bar" + lf);
  lines.push(`Order #${opts.orderNumber}` + lf);
  lines.push(dateStr + lf);
  lines.push(alignLeft + hr);
  lines.push("Items" + " ".repeat(NAME_W - 5) + padLeft("Qty", QTY_W) + padLeft("Amount", AMT_W) + lf);
  lines.push(hr);

  for (const it of opts.items) {
    lines.push(rowLine(it.name, it.qty, inr(it.price * it.qty)) + lf);
  }

  lines.push(hr);
  lines.push(boldOn + rowLine("Total", 0, inr(opts.totalAmount)) + boldOff + lf);
  lines.push(lf + alignCenter + "Thank you! Unite • Thrive • Play" + lf + lf);
  lines.push(cut);

  // === Printer configuration ===
  const cfg = qz.configs.create(printer, {
    encoding: "GBK",
    rasterize: true, // ✅ ensures logo prints on all thermal printers
  });

  const payload: any[] = [];

  // === Add logo (raster image) ===
  try {
    const dataUrl =
      opts.logoDataUrl ||
      (await loadImageAsDataURL(opts.logoUrl || "/snack-bar-logo.jpg"));
    payload.push({
      type: "image",
      data: dataUrl,
      options: { width: 480, align: "center" }, // 480px fits ~576-dot printable width
    });
  } catch (err) {
    console.warn("⚠️ Logo not found or failed to load:", err);
  }

  // === Add text payload ===
  payload.push({ type: "raw", format: "plain", data: lines.join("") });

  // === Print ===
  await qz.print(cfg, payload);
  await qz.websocket.disconnect();
}

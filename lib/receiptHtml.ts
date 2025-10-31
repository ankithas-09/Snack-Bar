// lib/receiptHtml.ts
type Item = { name: string; qty: number; price: number; category: string };

function toINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function buildReceiptHTML(opts: {
  orderNumber: number;
  createdAt: string | Date;
  items: Item[];
  totalAmount: number;
  /** If provided, used directly as <img src="..."> (data URL). */
  logoDataUrl?: string;
  /** Fallback path if you didn't pass a data URL. */
  logoUrl?: string;
}) {
  const d = new Date(opts.createdAt);
  const dateStr = d.toLocaleString("en-IN");

  const rows = opts.items
    .map(
      (i) => `
    <tr class="row">
      <td class="item">${i.name}</td>
      <td class="qty">${i.qty}</td>
      <td class="amt">${toINR(i.price * i.qty)}</td>
    </tr>`
    )
    .join("");

  const logoSrc = opts.logoDataUrl || opts.logoUrl || "/snack-bar-logo.jpg";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt #${opts.orderNumber}</title>
<style>
  @page { size: 80mm auto; margin: 5mm; }
  html, body { padding: 0; margin: 0; }
  body {
    width: 80mm;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial;
    color: #111;
    font-size: 12px;
  }
  .center { text-align: center; }
  .logo-wrap { margin: 2mm 0 1mm; }
  .logo {
    width: 32mm;
    height: auto;
    display: inline-block;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .title {
    font-weight: 800;
    font-size: 16px;
    letter-spacing: 1px;
    margin-top: 2mm;
  }
  .sub {
    font-size: 13px;
    margin-top: 1px;
    font-weight: 700; /* bold Snack Bar */
  }
  .meta { margin-top: 4px; font-size: 11px; color: #444; }
  .hr { border-top: 2px solid #111; margin: 8px 0; }
  .hr.light { border-top: 1px solid #aaa; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: 700; font-size: 12px; padding: 4px 0; }
  td { padding: 2px 0; vertical-align: top; }
  .row td { padding: 3px 0; }
  .qty { text-align: center; width: 16%; }
  .amt { text-align: right; width: 28%; }
  .item { width: 56%; word-break: break-word; }
  .total-line {
    font-size: 16px;
    font-weight: 800;
    display: flex;
    justify-content: space-between;
  }
  .footer { margin-top: 6px; }
</style>
</head>
<body>
  <div class="center logo-wrap">
    <img src="${logoSrc}" alt="Snack Bar Logo" class="logo" />
  </div>

  <div class="center">
    <div class="title">KREEDE</div>
    <div class="sub"><strong>Snack&nbsp;Bar</strong></div>
    <div class="meta">Order #${opts.orderNumber}</div>
    <div class="meta">${dateStr}</div>
  </div>

  <div class="hr"></div>

  <table>
    <thead>
      <tr>
        <th class="item">Items</th>
        <th class="qty">Qty</th>
        <th class="amt">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="hr"></div>
  <div class="total-line"><span>Total</span><span>${toINR(opts.totalAmount)}</span></div>
  <div class="hr light"></div>
  <div class="center footer">Thank you!</div>
</body>
</html>`;
}

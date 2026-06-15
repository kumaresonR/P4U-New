/** Printable tax invoice HTML (vendor → customer) — matches admin GST invoice mockup. */

const MARKETPLACE = {
  name: "P4U Marketplace",
  tagline: "Products for You · GST-Registered E-Commerce Operator",
  supportEmail: "support@planext4u.com",
  website: "planext4u.com",
};

const TEAL = "#00334e";
const GRAY_BG = "#f3f4f6";

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseMeta(m) {
  if (m == null) return {};
  if (typeof m === "string") {
    try {
      return JSON.parse(m) || {};
    } catch {
      return {};
    }
  }
  return typeof m === "object" && !Array.isArray(m) ? m : {};
}

function lineItems(meta) {
  const r = meta.lines ?? meta.items ?? meta.lineItems ?? meta.orderItems;
  return Array.isArray(r) ? r : [];
}

function padInvoiceSeq(n) {
  const s = String(n ?? "").replace(/\D/g, "");
  const v = parseInt(s.slice(-5), 10) || 0;
  return String(v).padStart(5, "0");
}

function vendorInvoiceKey(vendorId, vendorRef) {
  const ref = String(vendorRef ?? "").trim();
  if (/^\d+$/.test(ref)) {
    return ref.replace(/\D/g, "").padStart(7, "0").slice(-7);
  }
  const d = String(vendorId ?? "").replace(/\D/g, "");
  if (d.length >= 7) return d.slice(-7);
  if (d.length > 0) return d.padStart(7, "0");
  return "0000000";
}

export function buildInvoiceNumber(order, vendor) {
  const o = order;
  const m = parseMeta(o.metadata);
  const explicit =
    m.taxInvoiceNumber ?? m.invoiceNumber ?? m.gstInvoiceNo ?? m.invoice_no ?? m.tax_invoice_number ?? "";
  if (explicit) return String(explicit).trim();
  const vk = vendorInvoiceKey(o.vendorId, vendor?.vendorRef);
  const seq = padInvoiceSeq(o.orderRef || o.id);
  return `INV-VND${vk}-${seq}`;
}

function money2(n) {
  const x = Number(n) || 0;
  return x.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BELOW_20 = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function twoDigitWords(n) {
  if (n < 20) return BELOW_20[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${TENS[t]} ${BELOW_20[u]}` : TENS[t];
}

function threeDigitWords(n) {
  if (n < 100) return twoDigitWords(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${BELOW_20[h]} hundred`;
  if (rest === 0) return head;
  return `${head} ${twoDigitWords(rest)}`;
}

/** Integer rupees to words (Indian system). */
export function rupeesToWordsInteger(num) {
  let n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts = [];
  if (crore) parts.push(`${threeDigitWords(crore)} crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} thousand`);
  if (hundred) parts.push(threeDigitWords(hundred));

  return parts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function amountInWordsINR(total) {
  const t = Number(total) || 0;
  const rupees = Math.floor(t);
  const paise = Math.round((t - rupees) * 100);
  let w = rupeesToWordsInteger(rupees);
  if (paise > 0) {
    const pw = rupeesToWordsInteger(paise);
    return `${w} Rupees and ${pw} Paise Only`;
  }
  return `${w} Rupees Only`;
}

function inferSupplyType(meta, vendor, customer) {
  const raw = String(meta.supplyType || meta.supply_type || "").trim();
  if (/inter/i.test(raw)) return "Inter-State";
  if (/intra/i.test(raw)) return "Intra-State";
  const vCode = String(vendor?.stateCode ?? meta.vendorStateCode ?? "").trim();
  const cCode = String(
    customer?.stateCode ?? meta.billingStateCode ?? meta.customerStateCode ?? meta.placeOfSupplyStateCode ?? "",
  ).trim();
  if (vCode && cCode) {
    return vCode === cCode ? "Intra-State" : "Inter-State";
  }
  return "Intra-State";
}

function normalizeLines(meta, order) {
  const raw = lineItems(meta);
  if (!raw.length) {
    const sub = Number(meta.subtotal ?? meta.itemTotal ?? meta.itemMrp ?? 0) || 0;
    return [
      {
        description: meta.singleLineTitle || "Items (consolidated)",
        hsn: "—",
        qty: 1,
        rate: sub,
        amount: sub,
      },
    ];
  }
  return raw.map((line, i) => {
    const qty = Number(line.quantity ?? line.qty ?? 1) || 1;
    const amount =
      Number(line.total ?? line.lineTotal ?? line.amount ?? line.line_amount ?? 0) ||
      Number(line.unitPrice ?? line.rate ?? line.price ?? 0) * qty;
    const rate =
      Number(line.unitPrice ?? line.rate ?? line.price ?? 0) || (qty ? amount / qty : amount);
    return {
      description: String(line.title ?? line.name ?? line.productName ?? line.description ?? `Item ${i + 1}`),
      hsn: line.hsn ?? line.hsnCode ?? line.hsn_sac ?? "—",
      qty,
      rate,
      amount,
    };
  });
}

/**
 * @param {*} order — API order row
 * @param {*} vendor — vendor object (getVendor or list row)
 * @param {*} customer — customer object or null
 */
export function buildInvoiceModel(order, vendor, customer) {
  const o = order;
  const m = parseMeta(o.metadata);
  const custMeta = customer ? parseMeta(customer.metadata) : {};

  const invoiceNo = buildInvoiceNumber(o, vendor);
  const invoiceAt = new Date(
    m.invoiceIssuedAt ?? m.taxInvoiceDate ?? m.invoiceDate ?? m.deliveredAt ?? o.updatedAt ?? o.createdAt,
  );

  const supplierName = vendor?.businessName || vendor?.ownerName || "—";
  const supplierAddr = String(vendor?.registeredShopAddress ?? vendor?.address ?? "").trim() || "—";
  const gstRaw = String(vendor?.gst ?? vendor?.gstin ?? "").trim();
  const supplierGst = gstRaw || null;

  const recipientName =
    m.customerName ?? m.customer_name ?? customer?.fullName ?? customer?.full_name ?? "—";
  const recipientPhone = m.customerPhone ?? m.customer_phone ?? customer?.phone ?? "—";
  const recipientEmail = m.customerEmail ?? m.customer_email ?? customer?.email ?? "—";

  const placeOfSupply =
    String(m.placeOfSupply ?? m.place_of_supply ?? customer?.stateName ?? custMeta.stateName ?? "").trim() || "—";

  const supplyType = inferSupplyType(m, vendor, customer);

  const lines = normalizeLines(m, o);
  const lineNetSum = lines.reduce((s, l) => s + l.amount, 0);

  const platformFee = Number(m.platformFee ?? m.platform_fee ?? 0) || 0;
  const gstPf = Number(m.gstOnPlatformFee ?? m.gst_on_platform_fee ?? (platformFee ? platformFee * 0.18 : 0)) || 0;

  let taxableValue =
    Number(m.taxableValue ?? m.taxable_amount ?? m.taxableAmount ?? lineNetSum ?? m.subtotal ?? m.itemTotal ?? 0) || 0;

  let cgst = Number(m.cgst ?? m.cgstAmount ?? m.CGST ?? 0) || 0;
  let sgst = Number(m.sgst ?? m.sgstAmount ?? m.SGST ?? 0) || 0;
  let igst = Number(m.igst ?? m.igstAmount ?? m.IGST ?? 0) || 0;

  const metaTax =
    Number(m.taxAmount ?? m.tax ?? m.totalGst ?? m.gstTotal ?? m.productGst ?? m.taxOnProduct ?? 0) || 0;
  let totalTax = cgst + sgst + igst;
  if (totalTax <= 0 && metaTax > 0) {
    totalTax = metaTax;
    if (supplyType === "Inter-State") {
      igst = metaTax;
    } else {
      cgst = metaTax / 2;
      sgst = metaTax / 2;
    }
  }

  const grandTotal =
    Number(o.totalAmount ?? 0) || taxableValue + totalTax + platformFee + gstPf || lineNetSum + totalTax + platformFee + gstPf;

  if (taxableValue <= 0 && lineNetSum > 0) taxableValue = lineNetSum;

  return {
    invoiceNo,
    invoiceDate: invoiceAt,
    orderRef: o.orderRef || o.id,
    supplier: { name: supplierName, address: supplierAddr, gstin: supplierGst },
    recipient: {
      name: recipientName,
      phone: recipientPhone,
      email: recipientEmail,
      placeOfSupply,
      supplyType,
    },
    lines,
    taxableValue,
    cgst,
    sgst,
    igst,
    grandTotal,
    amountWords: amountInWordsINR(grandTotal),
  };
}

function formatInvoiceDate(d) {
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function renderTaxInvoiceHtml(model) {
  const m = model;
  const gstinHtml = m.supplier.gstin
    ? escapeHtml(m.supplier.gstin)
    : `<span style="color:#dc2626;font-weight:600;">Not provided</span>`;

  const rowsHtml = m.lines
    .map(
      (line, i) => `
    <tr>
      <td style="padding:10px 8px;border:1px solid #d1d5db;text-align:center;">${i + 1}</td>
      <td style="padding:10px 8px;border:1px solid #d1d5db;">${escapeHtml(line.description)}</td>
      <td style="padding:10px 8px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(String(line.hsn))}</td>
      <td style="padding:10px 8px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(String(line.qty))}</td>
      <td style="padding:10px 8px;border:1px solid #d1d5db;text-align:right;">₹${money2(line.rate)}</td>
      <td style="padding:10px 8px;border:1px solid #d1d5db;text-align:right;">₹${money2(line.amount)}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(m.invoiceNo)} — Tax Invoice</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111827; background: #fff; }
    .wrap { max-width: 820px; margin: 0 auto; padding: 24px 20px 40px; }
    .hero { background: ${TEAL}; color: #fff; border-radius: 12px 12px 0 0; padding: 20px 24px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { width: 44px; height: 44px; border-radius: 8px; background: rgba(255,255,255,.15); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; letter-spacing: -0.5px; }
    .brand h1 { margin: 0; font-size: 1.35rem; font-weight: 700; }
    .brand p { margin: 4px 0 0; font-size: 0.8rem; opacity: 0.92; }
    .inv-meta { text-align: right; }
    .pill-w { display: inline-block; background: #fff; color: #111827; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.06em; padding: 8px 14px; border-radius: 999px; }
    .pill-d { display: inline-block; background: rgba(255,255,255,.2); color: #fff; font-size: 0.8rem; padding: 8px 12px; border-radius: 8px; margin-top: 8px; font-family: ui-monospace, monospace; }
    .subbar { background: ${GRAY_BG}; padding: 10px 24px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #374151; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
    .subbar a { color: #1d4ed8; text-decoration: none; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #e5e7eb; border-top: none; }
    .box { padding: 16px 20px; font-size: 0.85rem; }
    .box h3 { margin: 0 0 10px; font-size: 0.65rem; letter-spacing: 0.08em; color: #6b7280; }
    .box p { margin: 4px 0; line-height: 1.45; }
    .box + .box { border-left: 1px solid #e5e7eb; }
    table.items { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-top: 0; }
    table.items thead th { background: ${GRAY_BG}; padding: 10px 8px; border: 1px solid #d1d5db; text-align: left; font-size: 0.65rem; letter-spacing: 0.05em; color: #4b5563; }
    .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
    .totals-inner { min-width: 280px; font-size: 0.85rem; }
    .totals-inner div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
    .grand { background: ${TEAL}; color: #fff; padding: 12px 16px !important; border-radius: 8px; margin-top: 8px; font-weight: 700; border-bottom: none !important; }
    .words { background: ${GRAY_BG}; padding: 12px 16px; margin-top: 12px; font-size: 0.82rem; font-style: italic; color: #4b5563; border-radius: 8px; }
    .footer { margin-top: 28px; font-size: 0.78rem; color: #4b5563; line-height: 1.55; }
    .sign { margin-top: 32px; text-align: right; font-size: 0.85rem; }
    .disclaimer { margin-top: 28px; text-align: center; font-size: 0.72rem; color: #9ca3af; }
    .print-bar { position: sticky; top: 0; background: #fef3c7; border-bottom: 1px solid #f59e0b; padding: 10px 16px; text-align: center; font-size: 0.85rem; color: #92400e; }
    @media print { .print-bar { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="print-bar">Use your browser’s <strong>Print</strong> dialog → <strong>Save as PDF</strong> to download this invoice.</div>
  <div class="wrap">
    <div class="hero">
      <div class="brand">
        <div class="logo">P4U</div>
        <div>
          <h1>${escapeHtml(MARKETPLACE.name)}</h1>
          <p>${escapeHtml(MARKETPLACE.tagline)}</p>
        </div>
      </div>
      <div class="inv-meta">
        <span class="pill-w">TAX INVOICE</span><br/>
        <span class="pill-d">${escapeHtml(m.invoiceNo)}</span>
        <p style="margin:12px 0 0;font-size:0.85rem;">Date: ${escapeHtml(formatInvoiceDate(m.invoiceDate))}<br/>Order: ${escapeHtml(
          String(m.orderRef),
        )}</p>
      </div>
    </div>
    <div class="subbar">
      <div>
        <span>✉ <a href="mailto:${escapeHtml(MARKETPLACE.supportEmail)}">${escapeHtml(MARKETPLACE.supportEmail)}</a></span>
        &nbsp;·&nbsp;
        <span>🌐 ${escapeHtml(MARKETPLACE.website)}</span>
      </div>
      <div>Original for Recipient</div>
    </div>
    <div class="grid2">
      <div class="box">
        <h3>SUPPLIER (SELLER)</h3>
        <p><strong>${escapeHtml(m.supplier.name)}</strong></p>
        <p>${escapeHtml(m.supplier.address)}</p>
        <p><strong>GSTIN:</strong> ${gstinHtml}</p>
      </div>
      <div class="box">
        <h3>RECIPIENT (BUYER)</h3>
        <p><strong>${escapeHtml(m.recipient.name)}</strong></p>
        <p>📞 ${escapeHtml(String(m.recipient.phone))}</p>
        <p>✉ ${escapeHtml(String(m.recipient.email))}</p>
        <p><strong>Place of Supply:</strong> ${escapeHtml(m.recipient.placeOfSupply)}</p>
        <p><strong>Supply Type:</strong> ${escapeHtml(m.recipient.supplyType)}</p>
      </div>
    </div>
    <table class="items">
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th>DESCRIPTION</th>
          <th style="width:88px;">HSN/SAC</th>
          <th style="width:56px;">QTY</th>
          <th style="width:96px;text-align:right;">RATE</th>
          <th style="width:96px;text-align:right;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="totals">
      <div class="totals-inner">
        <div><span>Taxable Value</span><span>₹${money2(m.taxableValue)}</span></div>
        <div><span>CGST</span><span>₹${money2(m.cgst)}</span></div>
        <div><span>SGST</span><span>₹${money2(m.sgst)}</span></div>
        <div><span>IGST</span><span>₹${money2(m.igst)}</span></div>
        <div class="grand"><span>Grand Total</span><span>₹${money2(m.grandTotal)}</span></div>
      </div>
    </div>
    <div class="words">Amount in words: ${escapeHtml(m.amountWords)}</div>
    <div class="footer">
      <p><strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.</p>
      <p>Subject to local jurisdiction</p>
    </div>
    <div class="sign">
      <p>For <strong>${escapeHtml(m.supplier.name)}</strong></p>
      <p style="margin-top:40px;">Authorised Signatory</p>
    </div>
    <p class="disclaimer">Computer-generated tax invoice. P4U is the marketplace facilitator. The supplier above is responsible for the goods/services and applicable GST.</p>
  </div>
</body>
</html>`;
}

export function openTaxInvoicePrintWindow(html) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}

/** Table row fields for the issued-invoices register (aligned with list UI). */
export function buildRegisterRow(order, vendor, customer) {
  const o = order;
  const meta = parseMeta(o.metadata);
  const model = buildInvoiceModel(o, vendor, customer);
  const invoiceAt = model.invoiceDate;
  const totalTax = model.cgst + model.sgst + model.igst;
  const custName = model.recipient.name;
  const vendorName = model.supplier.name;
  const pos = model.recipient.placeOfSupply;
  const supply = model.recipient.supplyType.toLowerCase().includes("inter") ? "Inter" : "Intra";

  return {
    order: o,
    vendor,
    customer,
    invoiceNo: model.invoiceNo,
    invoiceDate: invoiceAt,
    orderRef: model.orderRef,
    customer: custName,
    vendorName,
    pos,
    supply,
    taxable: model.taxableValue,
    tax: totalTax,
    total: model.grandTotal,
  };
}

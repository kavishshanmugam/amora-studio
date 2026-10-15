import type { AmoraEvent } from "../../data";
import { localDateKey } from "../../utils/events-core";

export function calculateQuoteTotal(subtotal: number, discount: number, priceOverride: number | null): number {
  return priceOverride ?? Math.max(0, subtotal - discount);
}

export function calculateQuoteBalance(total: number, deposit: number): number {
  return Math.max(0, total - deposit);
}

const SAFE_LOGO_DATA_URL = /^data:image\/(?:png|jpeg|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/;

export function logoImageHtml(logo: string | undefined): string {
  if (!logo || !SAFE_LOGO_DATA_URL.test(logo)) return "";
  return `<img src="${logo}" alt="Logo" style="max-height:50px;max-width:180px;margin-bottom:6px;">`;
}

// ponytail: print quote opens a new window with branded A4 layout
// PRD §7.9 — logo, client, event details, lines, total, deposit terms

export async function printQuote(event: AmoraEvent) {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;

  w.document.title = `Quote — ${event.name}`;
  const html = await buildQuoteHTML(event);
  w.document.body.innerHTML = html;
  setTimeout(() => w.print(), 300);
}

async function buildQuoteHTML(event: AmoraEvent): Promise<string> {
  const { getDb } = await import("../../data");
  const db = await getDb();

  // Business settings
  const settings = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings WHERE key IN ('business_name','business_abn','business_phone','business_email','business_instagram','payment_terms','deposit_percent','quote_validity_days','business_logo')"
  );
  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));

  // Client
  const [client] = event.client_id
    ? await db.select<{ name: string; phone: string | null; email: string | null; address: string | null }[]>(
        "SELECT name, phone, email, address FROM contacts WHERE id = ?", [event.client_id]
      )
    : [null];

  // Quote lines
  const lines = await db.select<{
    description: string; quantity: number; unit: string | null;
    unit_price_cents: number; line_discount_cents: number;
  }[]>(
    "SELECT description, quantity, unit, unit_price_cents, COALESCE(line_discount_cents, 0) as line_discount_cents FROM quote_lines WHERE event_id = ? ORDER BY position",
    [event.id]
  );

  const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unit_price_cents - l.line_discount_cents), 0);
  const discount = event.quote_discount_cents ?? 0;
  const total = calculateQuoteTotal(subtotal, discount, event.price_override_cents);
  const depositPct = parseInt(s.deposit_percent ?? "30") || 30;
  const deposit = event.deposit_cents ?? Math.round(total * depositPct / 100);
  const validDays = parseInt(s.quote_validity_days ?? "14") || 14;

  const quoteDate = event.quote_sent_date ?? localDateKey();
  const validUntil = event.quote_valid_until ?? (() => {
    const d = new Date(`${quoteDate}T00:00:00`);
    d.setDate(d.getDate() + validDays);
    return localDateKey(d);
  })();

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Quote — ${esc(event.name)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7A1F2B; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 700; color: #7A1F2B; }
  .brand-sub { font-size: 10px; color: #666; }
  .quote-title { font-size: 16px; font-weight: 600; color: #333; text-align: right; }
  .quote-meta { font-size: 10px; color: #666; text-align: right; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .section-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; font-weight: 600; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600; padding: 6px 8px; border-bottom: 2px solid #ddd; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  .text-right { text-align: right; }
  .total-row td { border-bottom: none; font-weight: 600; }
  .grand-total td { font-size: 14px; border-top: 2px solid #7A1F2B; color: #7A1F2B; }
  .terms { background: #faf8f5; border-radius: 4px; padding: 12px; margin-top: 16px; font-size: 10px; color: #666; }
  .terms h3 { font-size: 10px; font-weight: 600; color: #333; margin-bottom: 4px; }
  .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="header">
  <div>
    ${logoImageHtml(s.business_logo)}
    <div class="brand">${esc(s.business_name ?? "Amora Events")}</div>
    <div class="brand-sub">
      ${s.business_phone ? esc(s.business_phone) + "<br>" : ""}
      ${s.business_email ? esc(s.business_email) + "<br>" : ""}
      ${s.business_instagram ? "@" + esc(s.business_instagram) : ""}
    </div>
  </div>
  <div>
    <div class="quote-title">Quote</div>
    <div class="quote-meta">
      ${esc(event.reference)}<br>
      Date: ${esc(quoteDate)}<br>
      Valid until: ${esc(validUntil)}
    </div>
  </div>
</div>

<div class="two-col">
  <div>
    <div class="section-label">Client</div>
    ${client ? `
      <p style="font-weight:600;">${esc(client.name)}</p>
      ${client.address ? `<p>${esc(client.address)}</p>` : ""}
      ${client.phone ? `<p>${esc(client.phone)}</p>` : ""}
      ${client.email ? `<p>${esc(client.email)}</p>` : ""}
    ` : "<p>—</p>"}
  </div>
  <div>
    <div class="section-label">Event</div>
    <p style="font-weight:600;">${esc(event.name)}</p>
    ${event.start_date ? `<p>${esc(event.start_date)}</p>` : ""}
    ${event.event_type ? `<p>${esc(event.event_type)}</p>` : ""}
  </div>
</div>

${lines.length > 0 ? `
<table>
  <tr>
    <th>Description</th>
    <th class="text-right" style="width:50px">Qty</th>
    <th style="width:50px">Unit</th>
    <th class="text-right" style="width:80px">Unit price</th>
    <th class="text-right" style="width:80px">Total</th>
  </tr>
  ${lines.map((l) => `
  <tr>
    <td>${esc(l.description)}</td>
    <td class="text-right">${l.quantity}</td>
    <td>${esc(l.unit ?? "")}</td>
    <td class="text-right">${fmt(l.unit_price_cents)}</td>
    <td class="text-right">${fmt(l.quantity * l.unit_price_cents - l.line_discount_cents)}</td>
  </tr>`).join("")}
  <tr class="total-row">
    <td colspan="4" class="text-right">Subtotal</td>
    <td class="text-right">${fmt(subtotal)}</td>
  </tr>
  ${discount > 0 ? `
  <tr class="total-row">
    <td colspan="4" class="text-right">Discount</td>
    <td class="text-right">-${fmt(discount)}</td>
  </tr>` : ""}
  <tr class="total-row grand-total">
    <td colspan="4" class="text-right">Total</td>
    <td class="text-right">${fmt(total)}</td>
  </tr>
</table>

<p style="font-size:10px;color:#666;">
  Deposit (${depositPct}%): <strong>${fmt(deposit)}</strong>
  &nbsp;&mdash;&nbsp;
  Balance due: <strong>${fmt(calculateQuoteBalance(total, deposit))}</strong>
</p>
` : "<p>No quote lines yet.</p>"}

${(s.payment_terms || event.bond_cents) ? `
<div class="terms">
  <h3>Terms</h3>
  ${s.payment_terms ? `<p>${esc(s.payment_terms)}</p>` : ""}
  ${event.bond_cents ? `<p>A refundable bond of ${fmt(event.bond_cents)} applies.</p>` : ""}
</div>
` : ""}

${event.quote_notes ? `
<div class="terms">
  <h3>Quote notes</h3>
  <p>${esc(event.quote_notes)}</p>
</div>
` : ""}

${s.business_abn ? `
<div class="footer">
  ABN: ${esc(s.business_abn)}
</div>
` : ""}

</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

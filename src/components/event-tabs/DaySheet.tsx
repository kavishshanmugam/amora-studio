import type { AmoraEvent } from "../../data";
import type { RunSheetItem } from "../../data";

// ponytail: day sheet is a print-only page that opens in a new window
// PRD §7.12 — job name, reference, client, venue, access, times, run sheet, crew, pack list, suppliers

export function printDaySheet(event: AmoraEvent) {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;

  // Render placeholder, then fill with data
  w.document.title = `Day Sheet — ${event.name}`;
  const root = w.document.createElement("div");
  root.id = "day-sheet-root";
  w.document.body.appendChild(root);

  // We'll build the HTML directly — simpler than mounting React in a popup
  buildDaySheetHTML(event).then((html) => {
    w.document.body.innerHTML = html;
    // Auto-trigger print after a short delay
    setTimeout(() => w.print(), 300);
  });
}

async function buildDaySheetHTML(event: AmoraEvent): Promise<string> {
  const { getDb } = await import("../../data");
  const db = await getDb();

  // Fetch related data
  const [client] = event.client_id
    ? await db.select<{ name: string; phone: string | null; email: string | null }[]>(
        "SELECT name, phone, email FROM contacts WHERE id = ?", [event.client_id]
      )
    : [null];

  const venue = event.venue_id
    ? (await db.select<{ name: string; address: string | null; loading_access: string | null; stairs_lift: string | null; power: string | null; rules: string | null }[]>(
        "SELECT name, address, loading_access, stairs_lift, power, rules FROM venues WHERE id = ?", [event.venue_id]
      ))[0] ?? null
    : null;

  const runSheet = await db.select<RunSheetItem[]>(
    "SELECT * FROM run_sheet_items WHERE event_id = ? ORDER BY position", [event.id]
  );

  const crew = await db.select<{ name: string; phone: string | null; role_on_event: string | null; call_time: string | null }[]>(
    `SELECT c.name, c.phone, ec.role_on_event, ec.call_time
     FROM event_contacts ec JOIN contacts c ON ec.contact_id = c.id
     WHERE ec.event_id = ? AND (ec.role_on_event LIKE '%crew%' OR ec.role_on_event LIKE '%helper%' OR ec.call_time IS NOT NULL)`,
    [event.id]
  );

  const suppliers = await db.select<{ name: string; phone: string | null; role_on_event: string | null }[]>(
    `SELECT c.name, c.phone, ec.role_on_event
     FROM event_contacts ec JOIN contacts c ON ec.contact_id = c.id
     WHERE ec.event_id = ? AND c.is_supplier = 1`,
    [event.id]
  );

  const packItems = await db.select<{ name: string; quantity: number; category: string | null; packed: number }[]>(
    "SELECT name, quantity, category, packed FROM styling_items WHERE event_id = ? AND status = 'have' ORDER BY category, name",
    [event.id]
  );

  const times = [
    event.setup_time && `Setup: ${event.setup_time}`,
    event.start_time && `Start: ${event.start_time}`,
    event.end_time && `End: ${event.end_time}`,
    event.packdown_time && `Pack-down: ${event.packdown_time}`,
  ].filter(Boolean);

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Day Sheet — ${esc(event.name)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.4; }
  h1 { font-size: 20px; color: #7A1F2B; margin-bottom: 2px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #7A1F2B; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin: 12px 0 6px; }
  .ref { font-size: 12px; color: #666; font-family: monospace; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 2px solid #7A1F2B; padding-bottom: 8px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 4px; }
  .meta dt { font-weight: 600; color: #666; font-size: 9px; text-transform: uppercase; }
  .meta dd { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 4px; }
  th { text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; color: #666; padding: 3px 6px; border-bottom: 1px solid #ddd; }
  td { padding: 3px 6px; border-bottom: 1px solid #eee; }
  .pack-check { width: 12px; height: 12px; border: 1px solid #999; display: inline-block; margin-right: 6px; vertical-align: middle; }
  .rules { background: #fff8e1; border: 1px solid #f2a33a; border-radius: 4px; padding: 6px 8px; margin-top: 4px; }
  .rules-label { font-weight: 600; color: #f2a33a; font-size: 9px; text-transform: uppercase; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>${esc(event.name)}</h1>
    <span class="ref">${esc(event.reference)}</span>
    ${event.start_date ? ` &mdash; ${esc(event.start_date)}` : ""}
  </div>
  <div style="text-align:right;font-size:10px;color:#666;">
    Amora Events<br>Day Sheet
  </div>
</div>

<div class="two-col">
  <div>
    ${client ? `
    <h2>Client</h2>
    <dl class="meta">
      <dt>Name</dt><dd>${esc(client.name)}</dd>
      ${client.phone ? `<dt>Phone</dt><dd>${esc(client.phone)}</dd>` : ""}
      ${client.email ? `<dt>Email</dt><dd>${esc(client.email)}</dd>` : ""}
    </dl>` : ""}
  </div>
  <div>
    ${venue ? `
    <h2>Venue</h2>
    <dl class="meta">
      <dt>Name</dt><dd>${esc(venue.name)}</dd>
      ${venue.address ? `<dt>Address</dt><dd>${esc(venue.address)}</dd>` : ""}
      ${event.venue_area ? `<dt>Area</dt><dd>${esc(event.venue_area)}</dd>` : ""}
      ${event.indoor_outdoor ? `<dt>Setting</dt><dd>${esc(event.indoor_outdoor)}</dd>` : ""}
    </dl>
    ${venue.loading_access ? `<p style="font-size:10px;"><strong>Loading:</strong> ${esc(venue.loading_access)}</p>` : ""}
    ${venue.stairs_lift ? `<p style="font-size:10px;"><strong>Stairs/lift:</strong> ${esc(venue.stairs_lift)}</p>` : ""}
    ${venue.power ? `<p style="font-size:10px;"><strong>Power:</strong> ${esc(venue.power)}</p>` : ""}
    ` : ""}
  </div>
</div>

${venue?.rules ? `<div class="rules"><span class="rules-label">Venue rules</span><br>${esc(venue.rules)}</div>` : ""}

${(event.access_from || event.access_until) ? `
<p style="margin-top:6px;font-size:10px;"><strong>Access:</strong> ${esc(event.access_from ?? "—")} to ${esc(event.access_until ?? "—")}</p>
` : ""}

${times.length > 0 ? `
<h2>Times</h2>
<p>${times.join(" &nbsp;|&nbsp; ")}</p>
` : ""}

${runSheet.length > 0 ? `
<h2>Run Sheet</h2>
<table>
  <tr><th style="width:60px">Time</th><th>Task</th><th style="width:120px">Who / Notes</th></tr>
  ${runSheet.map((r) => `<tr><td>${esc(r.time ?? "")}</td><td>${esc(r.task ?? "")}</td><td>${esc(r.notes ?? "")}</td></tr>`).join("")}
</table>
` : ""}

${crew.length > 0 ? `
<h2>Crew</h2>
<table>
  <tr><th>Name</th><th>Phone</th><th>Role</th><th>Call time</th></tr>
  ${crew.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone ?? "")}</td><td>${esc(c.role_on_event ?? "")}</td><td>${esc(c.call_time ?? "")}</td></tr>`).join("")}
</table>
` : ""}

${suppliers.length > 0 ? `
<h2>Suppliers</h2>
<table>
  <tr><th>Name</th><th>Phone</th><th>Role</th></tr>
  ${suppliers.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.phone ?? "")}</td><td>${esc(s.role_on_event ?? "")}</td></tr>`).join("")}
</table>
` : ""}

${packItems.length > 0 ? `
<h2>Pack List</h2>
<table>
  <tr><th></th><th>Item</th><th style="width:40px">Qty</th><th>Category</th></tr>
  ${packItems.map((p) => `<tr><td><span class="pack-check"></span></td><td>${esc(p.name)}</td><td>${p.quantity}</td><td>${esc(p.category ?? "")}</td></tr>`).join("")}
</table>
` : ""}

${event.notes ? `<h2>Notes</h2><p style="font-size:10px;">${esc(event.notes)}</p>` : ""}

</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

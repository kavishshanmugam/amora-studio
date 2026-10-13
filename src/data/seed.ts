import { getDb } from "./db";
import { uid } from "./uid";

/** Seed development data. Only runs if the events table is empty. */
export async function seedDevData(): Promise<void> {
  const db = await getDb();

  const rows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM events"
  );
  if ((rows[0]?.cnt ?? 0) > 0) return;

  console.log("[seed] Inserting dev data...");

  // --- Contacts ---
  const clientSarah = uid();
  const clientJess = uid();
  const supplierFlorist = uid();
  const crewHelper = uid();

  const contacts = [
    { id: clientSarah, name: "Sarah Mitchell", is_client: 1, is_supplier: 0, is_crew: 0, phone: "0412 345 678", email: "sarah@email.com", instagram_handle: "sarahmitchell_" },
    { id: clientJess, name: "Jessica Wong", is_client: 1, is_supplier: 0, is_crew: 0, phone: "0423 456 789", email: "jess.wong@email.com" },
    { id: supplierFlorist, name: "Petal & Bloom", is_client: 0, is_supplier: 1, is_crew: 0, role: "Florist", phone: "0398 765 432", email: "hello@petalbloom.com.au", instagram_handle: "petalandbloom", website: "https://petalbloom.com.au" },
    { id: crewHelper, name: "Mia Chen", is_client: 0, is_supplier: 0, is_crew: 1, role: "Helper", phone: "0434 567 890", crew_rate_cents: 3500, crew_rate_unit: "hour" },
  ];

  for (const c of contacts) {
    const keys = ["id", "name", "is_client", "is_supplier", "is_crew", ...Object.keys(c).filter(k => !["id", "name", "is_client", "is_supplier", "is_crew"].includes(k))];
    const vals = keys.map((k) => (c as Record<string, unknown>)[k] ?? null);
    const ph = keys.map(() => "?").join(", ");
    await db.execute(`INSERT INTO contacts (${keys.join(", ")}) VALUES (${ph})`, vals as unknown[]);
  }

  // --- Venues ---
  const venueId = uid();
  await db.execute(
    `INSERT INTO venues (id, name, address, rules, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [venueId, "The Grand Ballroom", "123 Collins St, Melbourne VIC 3000", "No confetti, no open flame. Curfew 11pm.", "Beautiful heritage venue, high ceilings"]
  );

  // --- Events ---
  const eventId1 = uid();
  const eventId2 = uid();

  await db.execute(
    `INSERT INTO events (id, reference, name, status, event_type, start_date, start_time, client_id, venue_id, venue_area, indoor_outdoor, guest_count, table_count, lead_source, folder_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [eventId1, "AE-2026-001", "Mitchell Wedding", "booked", "Wedding", "2026-12-15", "15:00", clientSarah, venueId, "Main Ballroom", "indoor", 120, 12, "Instagram", "/events/2026-12-15 Mitchell Wedding (AE-2026-001)"]
  );

  await db.execute(
    `INSERT INTO events (id, reference, name, status, event_type, start_date, client_id, lead_source, folder_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [eventId2, "AE-2026-002", "Wong Baby Shower", "enquiry", "Baby shower", "2027-02-20", clientJess, "Referral", "/events/2027-02-20 Wong Baby Shower (AE-2026-002)"]
  );

  // --- Catalogue items ---
  const catItems = [
    { name: "Balloon garland (per metre)", category: "Balloons", unit: "metre", price_cents: 8500, position: 1 },
    { name: "Backdrop arch — circle", category: "Backdrops & arches", unit: "each", price_cents: 35000, position: 2 },
    { name: "Table centrepiece", category: "Table styling", unit: "table", price_cents: 4500, position: 3 },
    { name: "Welcome sign", category: "Signage", unit: "each", price_cents: 12000, position: 4 },
    { name: "Setup fee", category: "Fees", unit: "each", price_cents: 15000, position: 5 },
    { name: "Travel (per km)", category: "Fees", unit: "km", price_cents: 100, position: 6 },
  ];

  for (const item of catItems) {
    await db.execute(
      `INSERT INTO catalogue_items (id, name, category, unit, price_cents, position) VALUES (?, ?, ?, ?, ?, ?)`,
      [uid(), item.name, item.category, item.unit, item.price_cents, item.position]
    );
  }

  // --- Settings (defaults) ---
  const defaults = [
    ["business_name", "Amora Events"],
    ["business_phone", ""],
    ["business_email", ""],
    ["business_abn", ""],
    ["business_instagram", ""],
    ["quote_validity_days", "14"],
    ["deposit_percent", "30"],
    ["currency", "AUD"],
  ];

  for (const [key, value] of defaults) {
    await db.execute(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  // --- Checklist templates ---
  const templates = [
    { name: "Wedding", event_type: "Wedding", is_wrap_up: 0, items: [
      { text: "Confirm final numbers with client", days: 14 },
      { text: "Order balloons", days: 7 },
      { text: "Confirm venue access with coordinator", days: 7 },
      { text: "Confirm crew availability", days: 5 },
      { text: "Finalise styling items list", days: 5 },
      { text: "Prep and pack all items", days: 1 },
      { text: "Charge devices and check tools", days: 1 },
      { text: "Load vehicle", days: 0 },
    ]},
    { name: "Birthday", event_type: "Birthday", is_wrap_up: 0, items: [
      { text: "Confirm numbers and dietary requirements", days: 10 },
      { text: "Order balloons and signage", days: 5 },
      { text: "Prep and pack", days: 1 },
    ]},
    { name: "Baby shower", event_type: "Baby shower", is_wrap_up: 0, items: [
      { text: "Confirm theme and colour palette", days: 14 },
      { text: "Order supplies", days: 7 },
      { text: "Prep and pack", days: 1 },
    ]},
    { name: "Corporate", event_type: "Corporate", is_wrap_up: 0, items: [
      { text: "Confirm branding requirements", days: 14 },
      { text: "Confirm access and parking", days: 7 },
      { text: "Prep and pack", days: 1 },
    ]},
    { name: "Engagement", event_type: "Engagement", is_wrap_up: 0, items: [
      { text: "Confirm proposal/reveal details with client", days: 14 },
      { text: "Order balloons and signage", days: 7 },
      { text: "Confirm venue access", days: 5 },
      { text: "Prep and pack all items", days: 1 },
    ]},
    { name: "Christening", event_type: "Christening/Baptism", is_wrap_up: 0, items: [
      { text: "Confirm church/venue styling restrictions", days: 14 },
      { text: "Order supplies", days: 7 },
      { text: "Prep and pack", days: 1 },
    ]},
    { name: "Gender reveal", event_type: "Gender reveal", is_wrap_up: 0, items: [
      { text: "Confirm reveal method with client", days: 14 },
      { text: "Order balloons (check colour sealed!)", days: 7 },
      { text: "Prep and pack", days: 1 },
    ]},
    { name: "Wrap-up", event_type: null, is_wrap_up: 1, items: [
      { text: "Check all items returned and accounted for", days: null },
      { text: "Note any damage or missing items", days: null },
      { text: "Return supplier hire items", days: null },
      { text: "Send thank-you message to client", days: null },
      { text: "Request review / testimonial", days: null },
      { text: "Upload final photos", days: null },
      { text: "Create Instagram post", days: null },
    ]},
  ];

  for (const tmpl of templates) {
    const tmplId = uid();
    await db.execute(
      "INSERT INTO checklist_templates (id, name, event_type, is_wrap_up) VALUES (?, ?, ?, ?)",
      [tmplId, tmpl.name, tmpl.event_type, tmpl.is_wrap_up]
    );
    for (let i = 0; i < tmpl.items.length; i++) {
      const item = tmpl.items[i];
      await db.execute(
        "INSERT INTO checklist_template_items (id, template_id, text, days_before_event, position) VALUES (?, ?, ?, ?, ?)",
        [uid(), tmplId, item.text, item.days, i]
      );
    }
  }

  // --- Default lists ---
  const lists = [
    ["event_types", "Wedding,Engagement,Birthday,Baby shower,Bridal shower,Christening/Baptism,Gender reveal,Proposal,Corporate,Other"],
    ["lead_sources", "Instagram,Referral,Repeat client,Google,Website,Facebook,Wedding expo,Other"],
    ["expense_categories", "Materials,Balloons,Florals,Supplier hire,Crew,Fuel/travel,Other"],
    ["supplier_roles", "Florist,Balloon supplier,Hire company,Cake,Signage,Helper,Photographer,Videographer,DJ,Other"],
  ];

  for (const [key, value] of lists) {
    await db.execute(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  console.log("[seed] Dev data inserted.");
}

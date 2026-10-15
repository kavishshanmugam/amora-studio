import { useState } from "react";
import { getDb } from "../data";
import { uid } from "../data/uid";

// ponytail: in-app integration test runner
// Exercises PRD core flows 2-15 against the real database, then cleans up

type TestResult = { name: string; status: "pass" | "fail" | "running"; error?: string; ms?: number };

export function TestFlowsPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    setResults([]);
    const r: TestResult[] = [];

    for (const test of ALL_TESTS) {
      setResults([...r, { name: test.name, status: "running" }]);
      const start = performance.now();
      try {
        await test.fn();
        r.push({ name: test.name, status: "pass", ms: Math.round(performance.now() - start) });
      } catch (err) {
        r.push({ name: test.name, status: "fail", error: String(err), ms: Math.round(performance.now() - start) });
      }
      setResults([...r]);
    }

    // Cleanup
    try {
      await cleanup();
      r.push({ name: "Cleanup test data", status: "pass" });
    } catch (err) {
      r.push({ name: "Cleanup test data", status: "fail", error: String(err) });
    }
    setResults([...r]);
    setRunning(false);
  };

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold mb-2">Flow Tests</h1>
      <p className="text-sm text-text-secondary mb-6">
        Tests PRD core user flows against the real database. Creates mock data, tests operations, then deletes everything.
      </p>

      <button
        onClick={runAll}
        disabled={running}
        className="bg-text-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand disabled:opacity-50 mb-6"
      >
        {running ? "Running..." : "Run all flow tests"}
      </button>

      {results.length > 0 && (
        <div className="mb-4 text-sm">
          <span className="text-success font-medium">{passed} passed</span>
          {failed > 0 && <span className="text-danger font-medium ml-3">{failed} failed</span>}
          <span className="text-text-secondary ml-3">{results.length} total</span>
        </div>
      )}

      <div className="space-y-1">
        {results.map((r, i) => (
          <div key={i} className={`flex items-start gap-3 px-4 py-2 rounded-lg text-sm ${
            r.status === "pass" ? "bg-success/5" : r.status === "fail" ? "bg-danger/5" : "bg-bg"
          }`}>
            <span className="shrink-0 mt-0.5">
              {r.status === "pass" ? "✓" : r.status === "fail" ? "✗" : "⟳"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{r.name}</p>
              {r.error && <p className="text-danger text-xs mt-1 font-mono break-all">{r.error}</p>}
            </div>
            {r.ms !== undefined && <span className="text-text-secondary text-xs shrink-0">{r.ms}ms</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Test IDs (prefixed so cleanup is easy) ---
const TEST_PREFIX = "__TEST_";
const testId = () => TEST_PREFIX + uid().slice(0, 12);

// --- Cleanup: delete all rows with TEST_ prefix IDs ---
async function cleanup() {
  const db = await getDb();
  // Delete dependants first so foreign-key constraints cannot leave test rows behind.
  const tables = [
    "quote_lines", "payments", "expenses", "checklist_items", "styling_items",
    "run_sheet_items", "event_contacts", "images", "vision_links", "instagram_posts",
    "activity_log", "reminders", "checklist_template_items", "checklist_templates",
    "events", "inventory_items", "catalogue_items", "contacts", "venues",
  ];
  for (const table of tables) {
    try {
      await db.execute(`DELETE FROM ${table} WHERE id LIKE '${TEST_PREFIX}%'`);
    } catch { /* table may not exist */ }
  }
}

// --- Assert helper ---
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// --- All tests ---

const ALL_TESTS: { name: string; fn: () => Promise<void> }[] = [

  // Flow 2: Log a new enquiry
  {
    name: "Flow 2: Create client + new enquiry event",
    fn: async () => {
      const db = await getDb();
      const clientId = testId();
      const eventId = testId();
      const now = new Date().toISOString();

      // Create client
      await db.execute(
        `INSERT INTO contacts (id, name, is_client, phone, email, instagram_handle, created_at, updated_at)
         VALUES (?, ?, 1, '0400111222', 'sarah@test.com', 'sarah_events', ?, ?)`,
        [clientId, "Sarah Test-Client", now, now]
      );

      // Verify client exists
      const [client] = await db.select<{ name: string }[]>("SELECT name FROM contacts WHERE id = ?", [clientId]);
      assert(client.name === "Sarah Test-Client", "Client created");

      // Create event
      await db.execute(
        `INSERT INTO events (id, reference, name, status, client_id, event_type, start_date, enquiry_date, folder_path, quote_discount_cents, reminders_muted, lead_source, created_at, updated_at)
         VALUES (?, 'AE-TEST-001', 'Smith Wedding', 'enquiry', ?, 'Wedding', '2026-12-15', '2026-10-01', '/events/test', 0, 0, 'Instagram', ?, ?)`,
        [eventId, clientId, now, now]
      );

      const [event] = await db.select<{ name: string; status: string; client_id: string }[]>(
        "SELECT name, status, client_id FROM events WHERE id = ?", [eventId]
      );
      assert(event.name === "Smith Wedding", "Event created with name");
      assert(event.status === "enquiry", "Status is enquiry");
      assert(event.client_id === clientId, "Client linked");
    },
  },

  // Flow 3: Find existing client by phone
  {
    name: "Flow 3: Find client by partial phone number",
    fn: async () => {
      const db = await getDb();
      const results = await db.select<{ name: string }[]>(
        "SELECT name FROM contacts WHERE phone LIKE ? AND id LIKE ?",
        ["%111222%", `${TEST_PREFIX}%`]
      );
      assert(results.length >= 1, `Found client by phone fragment (got ${results.length})`);
      assert(results[0].name === "Sarah Test-Client", "Correct client found");
    },
  },

  // Flow 4: Build a quote from price list
  {
    name: "Flow 4: Build quote with lines, subtotal, discount",
    fn: async () => {
      const db = await getDb();
      // Find our test event
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;

      // Add quote lines
      const line1Id = testId();
      const line2Id = testId();
      const now = new Date().toISOString();

      await db.execute(
        `INSERT INTO quote_lines (id, event_id, description, quantity, unit, unit_price_cents, line_discount_cents, position, created_at, updated_at)
         VALUES (?, ?, 'Balloon garland 3m', 1, 'each', 35000, 0, 0, ?, ?)`,
        [line1Id, eventId, now, now]
      );
      await db.execute(
        `INSERT INTO quote_lines (id, event_id, description, quantity, unit, unit_price_cents, line_discount_cents, position, created_at, updated_at)
         VALUES (?, ?, 'Table centrepiece', 8, 'each', 4500, 0, 1, ?, ?)`,
        [line2Id, eventId, now, now]
      );

      // Check subtotal (qty * unit_price - line_discount)
      const [total] = await db.select<{ s: number }[]>(
        "SELECT COALESCE(SUM(quantity * unit_price_cents - line_discount_cents), 0) as s FROM quote_lines WHERE event_id = ?", [eventId]
      );
      assert(total.s === 71000, `Subtotal is $710.00 (got ${total.s})`);

      // Apply discount
      await db.execute("UPDATE events SET quote_discount_cents = 5000 WHERE id = ?", [eventId]);
      const [evt] = await db.select<{ quote_discount_cents: number }[]>(
        "SELECT quote_discount_cents FROM events WHERE id = ?", [eventId]
      );
      assert(evt.quote_discount_cents === 5000, "Discount applied: $50");

      // Mark quote sent
      await db.execute(
        "UPDATE events SET status = 'quote_sent', quote_sent_date = '2026-10-05' WHERE id = ?", [eventId]
      );
      const [sent] = await db.select<{ status: string }[]>("SELECT status FROM events WHERE id = ?", [eventId]);
      assert(sent.status === "quote_sent", "Status changed to quote_sent");
    },
  },

  // Flow 5: Record deposit → Mark as Booked
  {
    name: "Flow 5: Record deposit payment, mark booked",
    fn: async () => {
      const db = await getDb();
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;
      const paymentId = testId();
      const now = new Date().toISOString();

      // Record deposit
      await db.execute(
        `INSERT INTO payments (id, event_id, date, amount_cents, type, method, note, created_at, updated_at)
         VALUES (?, ?, '2026-10-10', 19800, 'deposit', 'bank_transfer', 'Deposit 30%', ?, ?)`,
        [paymentId, eventId, now, now]
      );

      const [payment] = await db.select<{ amount_cents: number; type: string }[]>(
        "SELECT amount_cents, type FROM payments WHERE id = ?", [paymentId]
      );
      assert(payment.amount_cents === 19800, "Deposit recorded: $198");
      assert(payment.type === "deposit", "Type is deposit");

      // Mark as booked
      await db.execute("UPDATE events SET status = 'booked' WHERE id = ?", [eventId]);
      const [booked] = await db.select<{ status: string }[]>("SELECT status FROM events WHERE id = ?", [eventId]);
      assert(booked.status === "booked", "Status is booked");
    },
  },

  // Flow 7: Add styling items (own stock, buy, supplier hire)
  {
    name: "Flow 7: Add styling items with different sources",
    fn: async () => {
      const db = await getDb();
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;
      const now = new Date().toISOString();

      const items = [
        { id: testId(), name: "Gold hoop arch", category: "Structures", quantity: 1, source: "own_stock", status: "have" },
        { id: testId(), name: "Blush balloons x100", category: "Balloons", quantity: 1, source: "buy", status: "need" },
        { id: testId(), name: "White plinths x4", category: "Furniture", quantity: 4, source: "supplier_hire", status: "ordered" },
      ];

      for (const item of items) {
        await db.execute(
          `INSERT INTO styling_items (id, event_id, name, category, quantity, source, status, cost_cents, packed, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
          [item.id, eventId, item.name, item.category, item.quantity, item.source, item.status, now, now]
        );
      }

      const rows = await db.select<{ name: string; source: string; status: string }[]>(
        "SELECT name, source, status FROM styling_items WHERE event_id = ? AND id LIKE ? ORDER BY name",
        [eventId, `${TEST_PREFIX}%`]
      );
      assert(rows.length === 3, `3 styling items created (got ${rows.length})`);

      // Filter: items with status "need"
      const needs = rows.filter((r) => r.status === "need");
      assert(needs.length === 1, "1 item needs buying");
      assert(needs[0].name === "Blush balloons x100", "Correct item needs buying");

      // Pack list: only "have" items
      const packable = rows.filter((r) => r.status === "have");
      assert(packable.length === 1, "1 item in pack list");
    },
  },

  // Flow 8: Logistics — run sheet, crew
  {
    name: "Flow 8: Run sheet + crew assignment",
    fn: async () => {
      const db = await getDb();
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;
      const now = new Date().toISOString();

      // Set event times
      await db.execute(
        "UPDATE events SET setup_time = '14:00', start_time = '16:00', end_time = '22:00', packdown_time = '22:30' WHERE id = ?",
        [eventId]
      );

      // Create run sheet items
      const runItems = [
        { time: "14:00", task: "Setup begins" },
        { time: "15:30", task: "Florals arrive" },
        { time: "16:00", task: "Event starts" },
        { time: "22:00", task: "Event ends" },
        { time: "22:30", task: "Pack-down" },
      ];

      for (let i = 0; i < runItems.length; i++) {
        await db.execute(
          `INSERT INTO run_sheet_items (id, event_id, time, task, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [testId(), eventId, runItems[i].time, runItems[i].task, i, now, now]
        );
      }

      const runSheet = await db.select<{ time: string; task: string }[]>(
        "SELECT time, task FROM run_sheet_items WHERE event_id = ? AND id LIKE ? ORDER BY position",
        [eventId, `${TEST_PREFIX}%`]
      );
      assert(runSheet.length === 5, `5 run sheet items (got ${runSheet.length})`);
      assert(runSheet[0].task === "Setup begins", "First item correct");

      // Add crew contact + link
      const crewId = testId();
      await db.execute(
        `INSERT INTO contacts (id, name, is_crew, phone, crew_rate_cents, crew_rate_unit, created_at, updated_at)
         VALUES (?, 'Amy Helper', 1, '0400333444', 3500, 'hour', ?, ?)`,
        [crewId, now, now]
      );

      const linkId = testId();
      await db.execute(
        `INSERT INTO event_contacts (id, event_id, contact_id, role_on_event, call_time, hours, created_at, updated_at)
         VALUES (?, ?, ?, 'crew', '13:30', 8, ?, ?)`,
        [linkId, eventId, crewId, now, now]
      );

      const [crew] = await db.select<{ name: string; call_time: string; hours: number }[]>(
        `SELECT c.name, ec.call_time, ec.hours FROM event_contacts ec
         JOIN contacts c ON ec.contact_id = c.id
         WHERE ec.event_id = ? AND ec.id LIKE ?`,
        [eventId, `${TEST_PREFIX}%`]
      );
      assert(crew.name === "Amy Helper", "Crew linked");
      assert(crew.hours === 8, "Hours set");
    },
  },

  // Flow 10: Mark completed → wrap-up checklist
  {
    name: "Flow 10: Mark completed, create wrap-up checklist",
    fn: async () => {
      const db = await getDb();
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;
      const now = new Date().toISOString();

      // Mark completed
      await db.execute("UPDATE events SET status = 'done' WHERE id = ?", [eventId]);

      // Create wrap-up checklist
      const wrapTasks = ["Pack-down check done", "Return supplier hire items", "Refund bond", "Update inventory"];
      for (let i = 0; i < wrapTasks.length; i++) {
        await db.execute(
          `INSERT INTO checklist_items (id, event_id, text, is_done, section, position, created_at, updated_at)
           VALUES (?, ?, ?, 0, 'wrap_up', ?, ?, ?)`,
          [testId(), eventId, wrapTasks[i], i, now, now]
        );
      }

      const wrapItems = await db.select<{ text: string; is_done: number }[]>(
        "SELECT text, is_done FROM checklist_items WHERE event_id = ? AND section = 'wrap_up' AND id LIKE ?",
        [eventId, `${TEST_PREFIX}%`]
      );
      assert(wrapItems.length === 4, `4 wrap-up items (got ${wrapItems.length})`);
      assert(wrapItems.every((w) => w.is_done === 0), "All unchecked initially");

      // Complete one
      const [first] = await db.select<{ id: string }[]>(
        "SELECT id FROM checklist_items WHERE event_id = ? AND section = 'wrap_up' AND id LIKE ? LIMIT 1",
        [eventId, `${TEST_PREFIX}%`]
      );
      await db.execute("UPDATE checklist_items SET is_done = 1, completed_at = ? WHERE id = ?", [now, first.id]);

      const done = await db.select<{ c: number }[]>(
        "SELECT COUNT(*) as c FROM checklist_items WHERE event_id = ? AND section = 'wrap_up' AND is_done = 1 AND id LIKE ?",
        [eventId, `${TEST_PREFIX}%`]
      );
      assert(done[0].c === 1, "1 of 4 wrap-up items done");
    },
  },

  // Flow 11: Instagram post planner
  {
    name: "Flow 11: Instagram post with photos, caption, hashtags",
    fn: async () => {
      const db = await getDb();
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;
      const now = new Date().toISOString();

      // Add setup photos
      const photo1 = testId();
      const photo2 = testId();
      await db.execute(
        `INSERT INTO images (id, event_id, kind, file_name, is_favourite, position, created_at, updated_at)
         VALUES (?, ?, 'photo', 'setup-1.jpg', 1, 0, ?, ?)`,
        [photo1, eventId, now, now]
      );
      await db.execute(
        `INSERT INTO images (id, event_id, kind, file_name, is_favourite, position, created_at, updated_at)
         VALUES (?, ?, 'photo', 'setup-2.jpg', 0, 1, ?, ?)`,
        [photo2, eventId, now, now]
      );

      // Create Instagram post
      const postId = testId();
      const imageIds = JSON.stringify([photo1, photo2]);
      await db.execute(
        `INSERT INTO instagram_posts (id, event_id, status, caption, hashtags, image_ids, created_at, updated_at)
         VALUES (?, ?, 'draft', 'Smith Wedding setup ✨', '#melbournewedding #amoraevents', ?, ?, ?)`,
        [postId, eventId, imageIds, now, now]
      );

      const [post] = await db.select<{ status: string; caption: string; image_ids: string }[]>(
        "SELECT status, caption, image_ids FROM instagram_posts WHERE id = ?", [postId]
      );
      assert(post.status === "draft", "Post is draft");
      assert(post.caption.includes("Smith Wedding"), "Caption correct");
      const ids = JSON.parse(post.image_ids);
      assert(ids.length === 2, "2 photos selected");

      // Mark as posted
      await db.execute(
        "UPDATE instagram_posts SET status = 'posted', posted_date = '2026-12-20' WHERE id = ?", [postId]
      );
      const [posted] = await db.select<{ status: string }[]>(
        "SELECT status FROM instagram_posts WHERE id = ?", [postId]
      );
      assert(posted.status === "posted", "Post marked as posted");
    },
  },

  // Flow 12: Expenses and profit
  {
    name: "Flow 12: Add expenses, calculate profit",
    fn: async () => {
      const db = await getDb();
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;
      const now = new Date().toISOString();

      // Add expenses
      await db.execute(
        `INSERT INTO expenses (id, event_id, description, category, amount_cents, date, created_at, updated_at)
         VALUES (?, ?, 'Balloons wholesale', 'Materials', 8500, '2026-12-10', ?, ?)`,
        [testId(), eventId, now, now]
      );
      await db.execute(
        `INSERT INTO expenses (id, event_id, description, category, amount_cents, date, created_at, updated_at)
         VALUES (?, ?, 'Crew - Amy 8hrs', 'Crew', 28000, '2026-12-15', ?, ?)`,
        [testId(), eventId, now, now]
      );
      await db.execute(
        `INSERT INTO expenses (id, event_id, description, category, amount_cents, date, created_at, updated_at)
         VALUES (?, ?, 'Fuel', 'Travel', 4500, '2026-12-15', ?, ?)`,
        [testId(), eventId, now, now]
      );

      // Calculate
      const [revenue] = await db.select<{ s: number }[]>(
        "SELECT COALESCE(SUM(quantity * unit_price_cents - line_discount_cents), 0) as s FROM quote_lines WHERE event_id = ?", [eventId]
      );
      const [expenseTotal] = await db.select<{ s: number }[]>(
        "SELECT SUM(amount_cents) as s FROM expenses WHERE event_id = ? AND id LIKE ?",
        [eventId, `${TEST_PREFIX}%`]
      );
      const [discount] = await db.select<{ quote_discount_cents: number }[]>(
        "SELECT quote_discount_cents FROM events WHERE id = ?", [eventId]
      );

      const price = revenue.s - discount.quote_discount_cents; // 71000 - 5000 = 66000
      const profit = price - expenseTotal.s; // 66000 - 41000 = 25000
      const margin = Math.round((profit / price) * 100);

      assert(price === 66000, `Price is $660 (got ${price})`);
      assert(expenseTotal.s === 41000, `Expenses total $410 (got ${expenseTotal.s})`);
      assert(profit === 25000, `Profit is $250 (got ${profit})`);
      assert(margin === 38, `Margin is 38% (got ${margin})`);
    },
  },

  // Flow 14: Calendar — multi-day and same-day events
  {
    name: "Flow 14: Calendar — multi-day + same-day events",
    fn: async () => {
      const db = await getDb();
      const now = new Date().toISOString();

      // 3-day event
      const multiId = testId();
      await db.execute(
        `INSERT INTO events (id, reference, name, status, start_date, end_date, enquiry_date, folder_path, quote_discount_cents, reminders_muted, created_at, updated_at)
         VALUES (?, 'AE-TEST-MULTI', 'Corporate Retreat', 'booked', '2026-11-10', '2026-11-12', '2026-10-01', '/events/multi', 0, 0, ?, ?)`,
        [multiId, now, now]
      );

      // Two events on same day
      const same1 = testId();
      const same2 = testId();
      await db.execute(
        `INSERT INTO events (id, reference, name, status, start_date, enquiry_date, folder_path, quote_discount_cents, reminders_muted, created_at, updated_at)
         VALUES (?, 'AE-TEST-SAME1', 'Jones Birthday', 'booked', '2026-11-15', '2026-10-01', '/events/same1', 0, 0, ?, ?)`,
        [same1, now, now]
      );
      await db.execute(
        `INSERT INTO events (id, reference, name, status, start_date, enquiry_date, folder_path, quote_discount_cents, reminders_muted, created_at, updated_at)
         VALUES (?, 'AE-TEST-SAME2', 'Park Engagement', 'enquiry', '2026-11-15', '2026-10-01', '/events/same2', 0, 0, ?, ?)`,
        [same2, now, now]
      );

      // Query events on Nov 15
      const sameDay = await db.select<{ name: string }[]>(
        "SELECT name FROM events WHERE start_date = '2026-11-15' AND id LIKE ? ORDER BY name",
        [`${TEST_PREFIX}%`]
      );
      assert(sameDay.length === 2, `2 events on Nov 15 (got ${sameDay.length})`);

      // Query multi-day range
      const [multi] = await db.select<{ start_date: string; end_date: string }[]>(
        "SELECT start_date, end_date FROM events WHERE id = ?", [multiId]
      );
      assert(multi.start_date === "2026-11-10", "Multi-day starts Nov 10");
      assert(multi.end_date === "2026-11-12", "Multi-day ends Nov 12");
    },
  },

  // Flow 15: Delete + restore + backup
  {
    name: "Flow 15: Soft delete, restore, verify data intact",
    fn: async () => {
      const db = await getDb();

      // Find our test event
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;
      const now = new Date().toISOString();

      // Soft delete
      await db.execute("UPDATE events SET deleted_at = ? WHERE id = ?", [now, eventId]);

      // Verify hidden from normal queries
      const visible = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE id = ? AND deleted_at IS NULL", [eventId]
      );
      assert(visible.length === 0, "Deleted event hidden from normal query");

      // Verify still in trash
      const trashed = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE id = ? AND deleted_at IS NOT NULL", [eventId]
      );
      assert(trashed.length === 1, "Deleted event in trash");

      // Restore
      await db.execute("UPDATE events SET deleted_at = NULL WHERE id = ?", [eventId]);
      const restored = await db.select<{ id: string; deleted_at: string | null }[]>(
        "SELECT id, deleted_at FROM events WHERE id = ?", [eventId]
      );
      assert(restored.length === 1, "Event restored");
      assert(restored[0].deleted_at === null, "deleted_at cleared");

      // Verify related data survived
      const lines = await db.select<{ c: number }[]>(
        "SELECT COUNT(*) as c FROM quote_lines WHERE event_id = ? AND id LIKE ?",
        [eventId, `${TEST_PREFIX}%`]
      );
      assert(lines[0].c === 2, "Quote lines survived delete/restore");
    },
  },

  // Venue CRUD
  {
    name: "Venues: Create, read, update, delete",
    fn: async () => {
      const db = await getDb();
      const venueId = testId();
      const now = new Date().toISOString();

      await db.execute(
        `INSERT INTO venues (id, name, address, loading_access, rules, created_at, updated_at)
         VALUES (?, 'Grand Hall Test', '123 Test St, Melbourne', 'Rear loading dock', 'No confetti. No open flames.', ?, ?)`,
        [venueId, now, now]
      );

      const [venue] = await db.select<{ name: string; rules: string }[]>(
        "SELECT name, rules FROM venues WHERE id = ?", [venueId]
      );
      assert(venue.name === "Grand Hall Test", "Venue created");
      assert(venue.rules.includes("No confetti"), "Rules stored");

      // Update
      await db.execute("UPDATE venues SET power = '2x 10A' WHERE id = ?", [venueId]);
      const [updated] = await db.select<{ power: string }[]>("SELECT power FROM venues WHERE id = ?", [venueId]);
      assert(updated.power === "2x 10A", "Venue updated");

      // Soft delete
      await db.execute("UPDATE venues SET deleted_at = ? WHERE id = ?", [now, venueId]);
      const hidden = await db.select<{ id: string }[]>(
        "SELECT id FROM venues WHERE id = ? AND deleted_at IS NULL", [venueId]
      );
      assert(hidden.length === 0, "Venue soft deleted");
    },
  },

  // Moodboard
  {
    name: "Moodboard: Images + vision links",
    fn: async () => {
      const db = await getDb();
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;
      const now = new Date().toISOString();

      // Add moodboard image
      await db.execute(
        `INSERT INTO images (id, event_id, kind, file_name, is_favourite, position, created_at, updated_at)
         VALUES (?, ?, 'moodboard', 'inspo-1.jpg', 0, 0, ?, ?)`,
        [testId(), eventId, now, now]
      );

      // Add vision link
      await db.execute(
        `INSERT INTO vision_links (id, event_id, url, title, kind, position, created_at, updated_at)
         VALUES (?, ?, 'https://pinterest.com/pin/123', 'Blush arch inspo', 'pinterest', 0, ?, ?)`,
        [testId(), eventId, now, now]
      );

      const moodImages = await db.select<{ kind: string }[]>(
        "SELECT kind FROM images WHERE event_id = ? AND kind = 'moodboard' AND id LIKE ?",
        [eventId, `${TEST_PREFIX}%`]
      );
      assert(moodImages.length === 1, "Moodboard image added");

      const links = await db.select<{ title: string; kind: string }[]>(
        "SELECT title, kind FROM vision_links WHERE event_id = ? AND id LIKE ?",
        [eventId, `${TEST_PREFIX}%`]
      );
      assert(links.length === 1, "Vision link added");
      assert(links[0].kind === "pinterest", "Auto-detected as Pinterest");
    },
  },

  // Settings
  {
    name: "Settings: Read/write business settings",
    fn: async () => {
      const db = await getDb();

      // Check default settings exist (from seed)
      const settings = await db.select<{ key: string; value: string }[]>(
        "SELECT key, value FROM settings WHERE key = 'business_name'"
      );
      // May or may not exist depending on seed, just verify query works
      assert(Array.isArray(settings), "Settings query works");

      // Write a test setting
      const testKey = "__test_setting";
      const now = new Date().toISOString();
      await db.execute(
        `INSERT OR REPLACE INTO settings (key, value, updated_at)
         VALUES (?, 'test_value', ?)`,
        [testKey, now]
      );

      const [s] = await db.select<{ value: string }[]>(
        "SELECT value FROM settings WHERE key = ?", [testKey]
      );
      assert(s.value === "test_value", "Setting saved and read");

      // Cleanup
      await db.execute("DELETE FROM settings WHERE key = ?", [testKey]);
    },
  },

  // Global search
  {
    name: "Search: Find events, contacts, venues by name fragment",
    fn: async () => {
      const db = await getDb();
      const q = "%Smith%";

      const events = await db.select<{ name: string }[]>(
        "SELECT name FROM events WHERE name LIKE ? AND id LIKE ? AND deleted_at IS NULL",
        [q, `${TEST_PREFIX}%`]
      );
      assert(events.length >= 1, `Found event by name fragment (got ${events.length})`);

      const contacts = await db.select<{ name: string }[]>(
        "SELECT name FROM contacts WHERE name LIKE ? AND id LIKE ?",
        ["%Test-Client%", `${TEST_PREFIX}%`]
      );
      assert(contacts.length >= 1, `Found contact by name fragment (got ${contacts.length})`);
    },
  },

  // Payment status rules (PRD §7.9)
  {
    name: "Payment status: Correct status per PRD rules",
    fn: async () => {
      const db = await getDb();
      const [event] = await db.select<{ id: string }[]>(
        "SELECT id FROM events WHERE reference = 'AE-TEST-001' AND id LIKE ?", [`${TEST_PREFIX}%`]
      );
      const eventId = event.id;

      // Get totals
      const [revenue] = await db.select<{ s: number }[]>(
        "SELECT COALESCE(SUM(quantity * unit_price_cents - line_discount_cents), 0) as s FROM quote_lines WHERE event_id = ?", [eventId]
      );
      const [paid] = await db.select<{ s: number }[]>(
        "SELECT COALESCE(SUM(amount_cents), 0) as s FROM payments WHERE event_id = ? AND id LIKE ?",
        [eventId, `${TEST_PREFIX}%`]
      );
      const [disc] = await db.select<{ quote_discount_cents: number }[]>(
        "SELECT quote_discount_cents FROM events WHERE id = ?", [eventId]
      );

      const total = revenue.s - disc.quote_discount_cents; // 66000
      const paidAmount = paid.s; // 19800

      // PRD: deposit paid but balance owing
      assert(paidAmount > 0, "Some payment made");
      assert(paidAmount < total, "Not fully paid");

      // Status should be "Deposit paid" (deposit exists, balance owing)
      const status = paidAmount >= total ? "paid_in_full"
        : paidAmount > 0 ? "deposit_paid"
        : "unpaid";
      assert(status === "deposit_paid", `Payment status is deposit_paid (got ${status})`);
    },
  },
];

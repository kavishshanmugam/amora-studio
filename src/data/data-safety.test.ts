import { describe, expect, it } from "vitest";
import { generateRemindersFromRules } from "./repositories/reminders";
import { permanentlyDelete, permanentlyDeleteTemplate } from "./permanent-delete";
import { confirmTemplateDeletion } from "../pages/TemplatesPage";

type QueryResult = Record<string, unknown>[];

class FakeDb {
  readonly calls: Array<{ sql: string; params?: unknown[] }> = [];
  constructor(
    private readonly selectResult: (sql: string, params?: unknown[]) => QueryResult = () => [],
    private readonly failOn?: string,
  ) {}

  async select<T>(sql: string, params?: unknown[]): Promise<T> {
    this.calls.push({ sql, params });
    return this.selectResult(sql, params) as T;
  }

  async execute(sql: string, params?: unknown[]): Promise<unknown> {
    this.calls.push({ sql, params });
    if (this.failOn && sql.includes(this.failOn)) throw new Error("injected failure");
    return { rowsAffected: 1 };
  }
}

describe("configured reminder generation", () => {
  it("creates each enabled due-date reminder and skips disabled rules", async () => {
    const db = new FakeDb((sql) => {
      if (sql.includes("notification_settings")) {
        return [{
          follow_up_reminder: 1,
          deposit_due_reminder: 1,
          balance_due_reminder: 0,
          event_week_reminder: 1,
          items_not_packed_reminder: 1,
          wrap_up_reminder: 1,
        }];
      }
      if (sql.includes("FROM events")) {
        return [{
          id: "event-1",
          name: "Garden wedding",
          follow_up_date: "2026-05-01",
          deposit_due_date: "2026-05-02",
          balance_due_date: "2026-05-03",
          start_date: "2026-05-10",
          end_date: "2026-05-11",
        }];
      }
      if (sql.includes("FROM styling_items")) return [{ event_id: "event-1" }];
      return [];
    });

    const created = await generateRemindersFromRules(db, () => "reminder-id");

    expect(created).toBe(5);
    const inserts = db.calls.filter((call) => call.sql.includes("INSERT INTO reminders"));
    expect(inserts.map((call) => call.params?.[1])).toEqual([
      "follow_up",
      "deposit_due",
      "event_week",
      "items_not_packed",
      "wrap_up",
    ]);
    expect(inserts.map((call) => call.params?.[3])).toEqual([
      "2026-04-30T23:00:00.000Z",
      "2026-05-01T23:00:00.000Z",
      "2026-05-02T23:00:00.000Z",
      "2026-05-08T23:00:00.000Z",
      "2026-05-11T23:00:00.000Z",
    ]);
  });

  it("updates the existing event and rule when reconciliation runs again", async () => {
    const db = new FakeDb((sql) => {
      if (sql.includes("notification_settings")) {
        return [{ follow_up_reminder: 1 }];
      }
      if (sql.includes("FROM events")) {
        return [{ id: "event-1", name: "Launch", follow_up_date: "2026-05-01" }];
      }
      if (sql.includes("FROM reminders")) {
        return [{
          id: "existing-id",
          event_id: "event-1",
          type: "follow_up",
          scheduled_for: "2026-04-30T23:00:00.000Z",
          title: "Follow up: Launch",
          body: "Follow up for Launch is due today.",
        }];
      }
      return [];
    });

    await generateRemindersFromRules(db, () => "new-id");

    const update = db.calls.find((call) => call.sql.includes("UPDATE reminders"));
    expect(update?.params?.[update.params.length - 1]).toBe("existing-id");
    expect(db.calls.some((call) => call.sql.includes("INSERT INTO reminders"))).toBe(false);
  });
});

describe("template deletion confirmation", () => {
  it("uses a destructive confirmation naming the template", () => {
    let message = "";
    const confirmed = confirmTemplateDeletion("Wedding checklist", (value) => {
      message = value;
      return false;
    });

    expect(confirmed).toBe(false);
    expect(message).toContain("Wedding checklist");
    expect(message).toContain("cannot be undone");
  });
});

describe("dependency-safe permanent deletion", () => {
  it("deletes event children before their parent inside a transaction", async () => {
    const db = new FakeDb();

    await permanentlyDelete(db, "event", "event-1");

    const statements = db.calls.map((call) => call.sql);
    expect(statements[0]).toBe("BEGIN TRANSACTION");
    expect(statements[statements.length - 1]).toBe("COMMIT");
    const parentIndex = statements.findIndex((sql) => sql.includes("DELETE FROM events"));
    expect(parentIndex).toBeGreaterThan(1);
    for (const table of ["quote_lines", "payments", "styling_items", "event_contacts", "reminders"]) {
      expect(statements.findIndex((sql) => sql.includes(`DELETE FROM ${table}`))).toBeLessThan(parentIndex);
    }
  });

  it("clears or removes every contact dependency before deleting the contact", async () => {
    const db = new FakeDb();

    await permanentlyDelete(db, "contact", "contact-1");

    const statements = db.calls.map((call) => call.sql);
    const parentIndex = statements.findIndex((sql) => sql.includes("DELETE FROM contacts"));
    for (const dependency of ["venues", "events", "event_contacts", "styling_items", "expenses", "run_sheet_items"]) {
      expect(statements.findIndex((sql) => sql.includes(dependency))).toBeLessThan(parentIndex);
    }
  });

  it("clears dependencies for venue, catalogue, and inventory trash items", async () => {
    const cases = [
      {
        type: "venue" as const,
        id: "venue-1",
        expected: ["UPDATE events SET venue_id = NULL", "DELETE FROM venues"],
      },
      {
        type: "catalogue" as const,
        id: "catalogue-1",
        expected: [
          "UPDATE quote_lines SET catalogue_item_id = NULL",
          "DELETE FROM catalogue_package_items",
          "DELETE FROM catalogue_items",
        ],
      },
      {
        type: "inventory" as const,
        id: "inventory-1",
        expected: [
          "UPDATE catalogue_items SET inventory_item_id = NULL",
          "UPDATE styling_items SET inventory_item_id = NULL",
          "DELETE FROM inventory_items",
        ],
      },
    ];

    for (const item of cases) {
      const db = new FakeDb();
      await permanentlyDelete(db, item.type, item.id);
      const statements = db.calls.map((call) => call.sql);
      expect(statements[0]).toBe("BEGIN TRANSACTION");
      expect(statements[statements.length - 1]).toBe("COMMIT");
      for (const expected of item.expected) {
        expect(statements.some((sql) => sql.includes(expected))).toBe(true);
      }
    }
  });

  it("recalculates affected package totals when permanently deleting a component", async () => {
    const db = new FakeDb();

    await permanentlyDelete(db, "catalogue", "component-1");

    const statements = db.calls.map((call) => call.sql);
    const recalculateIndex = statements.findIndex(
      (sql) => sql.includes("UPDATE catalogue_items") && sql.includes("price_cents"),
    );
    const unlinkIndex = statements.findIndex((sql) => sql.includes("DELETE FROM catalogue_package_items"));
    const deleteIndex = statements.findIndex((sql) => sql.includes("DELETE FROM catalogue_items"));
    expect(recalculateIndex).toBeGreaterThan(0);
    expect(recalculateIndex).toBeLessThan(unlinkIndex);
    expect(unlinkIndex).toBeLessThan(deleteIndex);
    expect(statements[recalculateIndex]).toContain("catalogue_item_id <> ?");
    expect(db.calls[recalculateIndex].params).toEqual(["component-1", "component-1"]);
  });

  it("rolls back without deleting the parent when a child cleanup fails", async () => {
    const db = new FakeDb(() => [], "payments");

    await expect(permanentlyDelete(db, "event", "event-1")).rejects.toThrow("injected failure");

    expect(db.calls.some((call) => call.sql === "ROLLBACK")).toBe(true);
    expect(db.calls.some((call) => call.sql.includes("DELETE FROM events"))).toBe(false);
  });

  it("deletes template items before the template inside a transaction", async () => {
    const db = new FakeDb();

    await permanentlyDeleteTemplate(db, "template-1");

    expect(db.calls.map((call) => call.sql)).toEqual([
      "BEGIN TRANSACTION",
      "DELETE FROM checklist_template_items WHERE template_id = ?",
      "DELETE FROM checklist_templates WHERE id = ?",
      "COMMIT",
    ]);
  });
});

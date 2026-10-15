import { describe, expect, it } from "vitest";
import {
  claimReminderForDelivery,
  generateRemindersFromRules,
} from "./reminders";

type Row = Record<string, unknown>;

class ReminderDb {
  readonly calls: Array<{ sql: string; params?: unknown[] }> = [];

  constructor(private readonly rows: (sql: string) => Row[]) {}

  async select<T>(sql: string, params?: unknown[]): Promise<T> {
    this.calls.push({ sql, params });
    return this.rows(sql) as T;
  }

  async execute(sql: string, params?: unknown[]): Promise<unknown> {
    this.calls.push({ sql, params });
    return { rowsAffected: 1 };
  }
}

describe("managed reminder reconciliation", () => {
  it("updates changed managed reminders and deletes obsolete ones without touching custom reminders", async () => {
    const db = new ReminderDb((sql) => {
      if (sql.includes("notification_settings")) return [{ follow_up_reminder: 1 }];
      if (sql.includes("FROM events")) {
        return [{ id: "event-1", name: "Renamed launch", follow_up_date: "2026-05-02" }];
      }
      if (sql.includes("FROM styling_items")) return [];
      if (sql.includes("FROM reminders")) {
        return [
          {
            id: "managed-current",
            type: "follow_up",
            event_id: "event-1",
            scheduled_for: "2026-04-01T00:00:00.000Z",
            title: "Old title",
            body: "Old body",
          },
          {
            id: "managed-obsolete",
            type: "deposit_due",
            event_id: "muted-or-deleted-event",
            scheduled_for: "2026-04-01T00:00:00.000Z",
            title: "Deposit due",
            body: "Old body",
          },
        ];
      }
      return [];
    });

    await generateRemindersFromRules(db, () => "new-id");

    const begin = db.calls.findIndex((call) => call.sql.includes("BEGIN IMMEDIATE"));
    const firstRead = db.calls.findIndex((call) => call.sql.includes("SELECT"));
    expect(begin).toBeGreaterThanOrEqual(0);
    expect(begin).toBeLessThan(firstRead);

    const eventSelect = db.calls.find((call) => call.sql.includes("FROM events"));
    expect(eventSelect?.sql).toContain("status NOT IN ('lost', 'cancelled', 'closed', 'done')");

    const update = db.calls.find((call) => call.sql.includes("UPDATE reminders"));
    expect(update?.params).toEqual([
      "2026-05-01T23:00:00.000Z",
      "Follow up: Renamed launch",
      "Follow up for Renamed launch is due today.",
      "managed-current",
    ]);
    const deletes = db.calls.filter((call) => call.sql.includes("DELETE FROM reminders"));
    expect(deletes.map((call) => call.params)).toEqual([["managed-obsolete"]]);
    const managedSelect = db.calls.find((call) => call.sql.includes("FROM reminders"));
    expect(managedSelect?.sql).toContain("WHERE type IN");
    expect(managedSelect?.params).not.toContain("custom");
  });
});

describe("reminder delivery claims", () => {
  it("claims only a pending reminder with a conditional update", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const db = {
      select: async <T>() => [] as T,
      execute: async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
        return { rowsAffected: 1 };
      },
    };

    const claimed = await claimReminderForDelivery(
      db,
      "reminder-1",
      "2026-05-01T00:00:00.000Z",
    );

    expect(claimed).toBe(true);
    expect(calls[0].sql).toContain("fired_at IS NULL");
    expect(calls[0].sql).toContain("dismissed_at IS NULL");
    expect(calls[0].params).toEqual([
      "2026-05-01T00:00:00.000Z",
      "reminder-1",
    ]);
  });
});

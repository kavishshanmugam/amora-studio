import { describe, expect, it } from "vitest";
import { BACKUP_TABLES, createBackupData, parseBackup, restoreBackup } from "./backup-restore";
import type { BackupData } from "./backup-restore";

describe("backup table coverage", () => {
  it("includes every application data table in dependency-safe insert order", () => {
    expect(BACKUP_TABLES).toEqual([
      "contacts",
      "venues",
      "inventory_items",
      "catalogue_items",
      "catalogue_package_items",
      "events",
      "event_contacts",
      "quote_lines",
      "styling_items",
      "expenses",
      "payments",
      "run_sheet_items",
      "checklist_items",
      "images",
      "vision_links",
      "instagram_posts",
      "activity_log",
      "reminders",
      "checklist_templates",
      "checklist_template_items",
      "hashtag_sets",
      "notification_settings",
      "settings",
    ]);
  });
});

describe("parseBackup", () => {
  it("rejects malformed JSON with a useful error", () => {
    expect(() => parseBackup("{not json")).toThrow("not valid JSON");
  });

  it.each([
    ["a non-object root", "[]"],
    ["an unknown table", '{"users":[]}'],
    ["a non-array table", '{"contacts":{}}'],
    ["a non-object row", '{"contacts":[null]}'],
    ["an unsafe column name", '{"contacts":[{"id); DROP TABLE contacts;--":"x"}]}'],
    ["a non-scalar value", '{"contacts":[{"id":{"nested":true}}]}'],
  ])("rejects %s", (_description, json) => {
    expect(() => parseBackup(json)).toThrow("Invalid backup");
  });

  it("rejects partial snapshots that could leave stale dependent rows", () => {
    expect(() => parseBackup('{"events":[]}')).toThrow('missing table "contacts"');
  });
});

type Call = { sql: string; values?: unknown[] };

function fakeDb(options: { failOn?: string } = {}) {
  const calls: Call[] = [];
  return {
    calls,
    db: {
      select: async (sql: string) => [{ sql }],
      execute: async (sql: string, values?: unknown[]) => {
        calls.push({ sql, values });
        if (options.failOn && sql.startsWith(options.failOn)) throw new Error("database write failed");
        return { rowsAffected: 0, lastInsertId: 0 };
      },
    },
  };
}

function completeBackup(overrides: Partial<BackupData> = {}): BackupData {
  return Object.fromEntries(
    BACKUP_TABLES.map((table) => [table, overrides[table] ?? []]),
  ) as BackupData;
}

describe("createBackupData", () => {
  it("reads every table and does not disguise read failures as empty data", async () => {
    const selected: string[] = [];
    const db = {
      execute: async () => ({ rowsAffected: 0, lastInsertId: 0 }),
      select: async (sql: string) => {
        selected.push(sql);
        if (sql.includes("notification_settings")) throw new Error("read failed");
        return [];
      },
    };

    await expect(createBackupData(db)).rejects.toThrow("notification_settings");
    expect(selected).toContain("SELECT * FROM catalogue_package_items");
    expect(selected).toContain("SELECT * FROM checklist_template_items");
  });
});

describe("restoreBackup", () => {
  it("deletes in child-first order, clears empty tables, inserts parent-first, and commits", async () => {
    const { db, calls } = fakeDb();
    await restoreBackup(db, completeBackup({
      contacts: [],
      events: [{ id: "event-1", reference: "AE-1" }],
      event_contacts: [{ id: "link-1", event_id: "event-1", contact_id: "contact-1" }],
    }));

    expect(calls[0]?.sql).toBe("BEGIN IMMEDIATE TRANSACTION");
    expect(calls.slice(1, 1 + BACKUP_TABLES.length).map((call) => call.sql)).toEqual(
      [...BACKUP_TABLES].reverse().map((table) => `DELETE FROM ${table}`),
    );
    expect(calls.slice(-3).map((call) => call.sql)).toEqual([
      "INSERT INTO events (id, reference) VALUES (?, ?)",
      "INSERT INTO event_contacts (id, event_id, contact_id) VALUES (?, ?, ?)",
      "COMMIT",
    ]);
  });

  it("rolls back atomically and rethrows when an insert fails", async () => {
    const { db, calls } = fakeDb({ failOn: "INSERT INTO events" });

    await expect(restoreBackup(db, completeBackup({ events: [{ id: "event-1" }] }))).rejects.toThrow("database write failed");
    expect(calls[calls.length - 1]?.sql).toBe("ROLLBACK");
    expect(calls.some((call) => call.sql === "COMMIT")).toBe(false);
  });

  it("rejects partial snapshots before changing the database", async () => {
    const { db, calls } = fakeDb();
    const partial = { events: [] } as unknown as BackupData;

    await expect(restoreBackup(db, partial)).rejects.toThrow('missing table "contacts"');
    expect(calls).toEqual([]);
  });
});

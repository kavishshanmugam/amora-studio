import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const select = vi.fn();

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn(async () => ({ execute, select })),
  },
}));

describe("runMigrations", () => {
  beforeEach(() => {
    execute.mockReset();
    select.mockReset();
  });

  it("deduplicates existing reminders before enforcing event/type uniqueness", async () => {
    select.mockResolvedValue([
      { name: "001_initial" },
      { name: "002_styling_position" },
    ]);
    execute.mockResolvedValue({ rowsAffected: 0 });
    const { runMigrations } = await import("./db");

    await runMigrations();

    const statements = execute.mock.calls.map(([sql]) => sql.trim());
    const dedupe = statements.findIndex((sql) => sql.startsWith("DELETE FROM reminders"));
    const uniqueIndex = statements.findIndex((sql) =>
      sql.startsWith("CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_event_type"),
    );
    expect(dedupe).toBeGreaterThan(-1);
    expect(uniqueIndex).toBeGreaterThan(dedupe);
  });

  it("rolls back migration statements when recording the migration fails", async () => {
    select.mockResolvedValue([{ name: "001_initial" }]);
    execute.mockImplementation(async (sql: string) => {
      if (sql.startsWith("INSERT INTO _migrations")) throw new Error("record failed");
      return { rowsAffected: 0 };
    });
    const { runMigrations } = await import("./db");

    await expect(runMigrations()).rejects.toThrow("record failed");

    const statements = execute.mock.calls.map(([sql]) => sql.trim());
    const begin = statements.indexOf("BEGIN IMMEDIATE TRANSACTION");
    const alter = statements.findIndex((sql) => sql.startsWith("ALTER TABLE styling_items"));
    const record = statements.findIndex((sql) => sql.startsWith("INSERT INTO _migrations"));
    const rollback = statements.indexOf("ROLLBACK");
    expect(begin).toBeGreaterThan(-1);
    expect(begin).toBeLessThan(alter);
    expect(alter).toBeLessThan(record);
    expect(record).toBeLessThan(rollback);
    expect(statements).not.toContain("COMMIT");
  });
});

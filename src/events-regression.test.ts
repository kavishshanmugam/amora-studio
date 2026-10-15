import { describe, expect, it, vi, beforeEach } from "vitest";

const select = vi.fn();
const execute = vi.fn();

vi.mock("./data/db", () => ({
  getDb: vi.fn(async () => ({ select, execute })),
}));

import { canChangeBoardStatusDirectly, runAfterEventDeletion } from "./pages/EventsPage";
import { eventsRepo } from "./data/repositories/events";
import { clampFinancialTotal } from "./components/event-tabs/QuotePaymentsTab";

beforeEach(() => {
  select.mockReset();
  execute.mockReset();
  select.mockResolvedValue([]);
  execute.mockResolvedValue({ rowsAffected: 1 });
});

describe("event status transitions", () => {
  it("prevents board controls from directly selecting statuses that require a reason", () => {
    expect(canChangeBoardStatusDirectly("lost")).toBe(false);
    expect(canChangeBoardStatusDirectly("cancelled")).toBe(false);
    expect(canChangeBoardStatusDirectly("booked")).toBe(true);
  });
});

describe("event deletion sequencing", () => {
  it("does not announce success until deletion resolves", async () => {
    const order: string[] = [];
    let resolveDelete!: () => void;
    const deletion = new Promise<void>((resolve) => { resolveDelete = resolve; });
    const task = runAfterEventDeletion(
      async () => { order.push("delete-start"); await deletion; order.push("delete-done"); },
      () => { order.push("success"); },
    );

    await Promise.resolve();
    expect(order).toEqual(["delete-start"]);
    resolveDelete();
    await task;
    expect(order).toEqual(["delete-start", "delete-done", "success"]);
  });

  it("does not announce success when deletion fails", async () => {
    const success = vi.fn();
    await expect(runAfterEventDeletion(async () => { throw new Error("delete failed"); }, success))
      .rejects.toThrow("delete failed");
    expect(success).not.toHaveBeenCalled();
  });
});

describe("deep event duplication", () => {
  it("creates the parent and all copied children in one transaction", async () => {
    select.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM quote_lines")) return [{ description: "Arch", quantity: 1, unit: "each", unit_price_cents: 10000, line_discount_cents: 0, catalogue_item_id: null, position: 0 }];
      return [];
    });

    const duplicate = await eventsRepo.deepDuplicate("source-event", { reference: "AE-2026-002", name: "Copy" } as never);

    const statements = execute.mock.calls.map(([sql]) => sql);
    expect(statements[0]).toBe("BEGIN TRANSACTION");
    expect(statements.some((sql) => sql.includes("INSERT INTO events"))).toBe(true);
    expect(statements.some((sql) => sql.includes("INSERT INTO quote_lines"))).toBe(true);
    expect(statements[statements.length - 1]).toBe("COMMIT");
    expect(duplicate.id).toBeTruthy();
  });

  it("rolls back the parent when copying a child fails", async () => {
    select.mockImplementation(async (sql: string) => sql.includes("FROM quote_lines")
      ? [{ description: "Arch", quantity: 1, unit: "each", unit_price_cents: 10000, line_discount_cents: 0, catalogue_item_id: null, position: 0 }]
      : []);
    execute.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO quote_lines")) throw new Error("copy failed");
      return { rowsAffected: 1 };
    });

    await expect(eventsRepo.deepDuplicate("source-event", { reference: "AE-2026-002", name: "Copy" } as never))
      .rejects.toThrow("copy failed");
    expect(execute.mock.calls[execute.mock.calls.length - 1]?.[0]).toBe("ROLLBACK");
    expect(execute.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(false);
  });
});

describe("financial totals", () => {
  it("clamps a discount-reduced total at zero", () => {
    expect(clampFinancialTotal(5000, 7500)).toBe(0);
    expect(clampFinancialTotal(5000, 1000)).toBe(4000);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { runSheetRepo } from "./run-sheet";

vi.mock("../db", () => ({ getDb: vi.fn() }));

describe("run sheet ordering", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads items in persisted position order so reordering is visible", async () => {
    const select = vi.fn().mockResolvedValue([]);
    vi.mocked(getDb).mockResolvedValue({ select } as never);

    await runSheetRepo.findByEvent("event-1");

    expect(select).toHaveBeenCalledWith(
      "SELECT * FROM run_sheet_items WHERE event_id = ? ORDER BY position, date, time",
      ["event-1"],
    );
  });
});

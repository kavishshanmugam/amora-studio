import { beforeEach, describe, expect, it, vi } from "vitest";

const { select, useQuery } = vi.hoisted(() => ({
  select: vi.fn(),
  useQuery: vi.fn((options) => options),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery,
  useMutation: vi.fn((options) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("../data", () => ({
  catalogueRepo: {},
  getDb: vi.fn(async () => ({ select })),
}));

import { usePackageItems } from "./use-catalogue";

describe("catalogue package queries", () => {
  beforeEach(() => {
    select.mockReset();
    useQuery.mockClear();
  });

  it("hides inactive and deleted components while retaining their package links", async () => {
    const query = usePackageItems("package-1") as unknown as {
      queryFn: () => Promise<unknown[]>;
    };

    await query.queryFn();

    expect(select).toHaveBeenCalledWith(
      expect.stringContaining("ci.active = 1"),
      ["package-1"],
    );
    expect(select.mock.calls[0][0]).toContain("ci.deleted_at IS NULL");
    expect(select.mock.calls[0][0]).not.toContain("DELETE");
  });
});

import { describe, expect, it } from "vitest";
import { reorderItemIds, reorderUpdateSql } from "./use-drag-reorder";

describe("drag reorder safety", () => {
  const items = [
    { id: "todo-a", is_done: 0 },
    { id: "todo-b", is_done: 0 },
    { id: "done-a", is_done: 1 },
  ];

  it("moves an item to the target position", () => {
    expect(reorderItemIds("todo-a", "todo-b", items)).toEqual(["todo-b", "todo-a", "done-a"]);
  });

  it("returns no reorder for moves rejected by a section guard", () => {
    expect(reorderItemIds(
      "todo-b",
      "done-a",
      items,
      (source, target) => source.is_done === target.is_done,
    )).toBeNull();
  });

  it("only builds update SQL for explicitly supported tables", () => {
    expect(reorderUpdateSql("checklist_items")).toContain("UPDATE checklist_items SET position");
    expect(() => reorderUpdateSql("contacts" as "checklist_items")).toThrow("Unsupported reorder table");
  });
});

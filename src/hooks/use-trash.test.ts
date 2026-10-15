import { describe, expect, it } from "vitest";
import { permanentDeleteInvalidationKeys } from "./use-trash";

describe("permanent delete cache invalidation", () => {
  it("invalidates catalogue and dependent quote caches after catalogue deletion", () => {
    expect(permanentDeleteInvalidationKeys("catalogue")).toEqual([
      ["trash"],
      ["catalogue"],
      ["quote-lines"],
    ]);
  });

  it("invalidates each deleted entity and caches backed by changed relationships", () => {
    expect(permanentDeleteInvalidationKeys("venue")).toEqual([
      ["trash"], ["venues"], ["events"],
    ]);
    expect(permanentDeleteInvalidationKeys("inventory")).toEqual([
      ["trash"], ["inventory"], ["catalogue"], ["styling-items"],
    ]);
    expect(permanentDeleteInvalidationKeys("contact")).toEqual([
      ["trash"], ["contacts"], ["venues"], ["events"], ["event-contacts"],
      ["styling-items"], ["expenses"], ["run-sheet"],
    ]);
    expect(permanentDeleteInvalidationKeys("event")).toEqual([
      ["trash"], ["events"], ["quote-lines"], ["payments"], ["paid-total"],
      ["expenses"], ["styling-items"], ["checklist"], ["run-sheet"],
      ["event-contacts"], ["images"], ["vision-links"], ["instagram-post"],
      ["activity-log"], ["reminders"],
    ]);
  });
});

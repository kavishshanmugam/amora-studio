import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculateQuoteTotal } from "../src/components/event-tabs/PrintQuote";

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

test.describe("event tab regressions", () => {
  test("printed totals honour a flat-price override", () => {
    expect(calculateQuoteTotal(125_00, 25_00, 80_00)).toBe(80_00);
    expect(calculateQuoteTotal(125_00, 25_00, null)).toBe(100_00);
  });

  test("quote and payment workflow exposes all persisted financial fields", () => {
    const quote = source("src/components/event-tabs/QuotePaymentsTab.tsx");
    for (const field of [
      "Quote discount ($)", "Quote valid until", "Quote notes",
      "Deposit ($)", "Deposit due", "Balance due",
      "Bond ($)", "Bond received", "Bond returned", "Bond notes",
      "Contract signed",
    ]) {
      expect(quote).toContain(field);
    }
    expect(quote).toContain("Number.isFinite");
    expect(quote).toContain("min=\"0\"");
  });

  test("fractional quote and styling quantities are preserved and validated", () => {
    const quote = source("src/components/event-tabs/QuotePaymentsTab.tsx");
    const styling = source("src/components/event-tabs/StylingTab.tsx");
    expect(quote).not.toContain("parseInt(qty)");
    expect(quote).not.toContain("quantity: parseInt(e.target.value)");
    expect(styling).not.toContain("parseInt(quantity)");
    expect(styling).not.toContain("const v = parseInt(e.target.value)");
    expect(quote).toContain('step="any"');
    expect(styling).toContain('step="any"');
  });

  test("styling items can link inventory and supplier records", () => {
    const styling = source("src/components/event-tabs/StylingTab.tsx");
    expect(styling).toContain("useInventoryItems");
    expect(styling).toContain("useContacts");
    expect(styling).toContain("inventory_item_id: data.inventory_item_id");
    expect(styling).toContain("supplier_contact_id: data.supplier_contact_id");
    expect(styling).toContain("Event colour");
    expect(styling).toContain("Palette");
  });

  test("child mutations refresh badges and venue detail caches", () => {
    const stylingHook = source("src/hooks/use-styling-items.ts");
    const checklistHook = source("src/hooks/use-checklist.ts");
    const venuesHook = source("src/hooks/use-venues.ts");
    expect(stylingHook).toContain('["tab-counts", vars.event_id]');
    expect(checklistHook).toContain('["tab-counts", vars.event_id]');
    expect(venuesHook).toContain('["venue-detail", vars.id]');
  });

  test("checklist templates are filtered by section and event type", () => {
    const checklist = source("src/components/event-tabs/ChecklistTab.tsx");
    expect(checklist).toContain('["templates-for-section", isWrapUp, eventType]');
    expect(checklist).toContain("event_type IS NULL OR event_type = ?");
    expect(checklist).toContain("event_type, is_wrap_up");
  });

  test("checklist reordering stays within the visible completion group", () => {
    const checklist = source("src/components/event-tabs/ChecklistTab.tsx");
    expect(checklist).toContain("source.is_done === target.is_done");
    expect(checklist).toContain("useDragReorder<ChecklistItem>");
  });

  test("operational event fields are editable from logistics", () => {
    const logistics = source("src/components/event-tabs/LogisticsTab.tsx");
    for (const field of ["Access from", "Access until", "Travel (km)", "Travel notes"]) {
      expect(logistics).toContain(field);
    }
  });

  test("destructive child actions require confirmation", () => {
    const quote = source("src/components/event-tabs/QuotePaymentsTab.tsx");
    const checklist = source("src/components/event-tabs/ChecklistTab.tsx");
    const logistics = source("src/components/event-tabs/LogisticsTab.tsx");
    expect(quote.match(/<ConfirmDialog/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(checklist).toContain("Remove checklist item?");
    expect(logistics).toContain("Remove run sheet item?");
  });
});

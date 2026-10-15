import { test, expect } from "@playwright/test";
import { eventDateKeys, localDateKey, normalizeEventForm } from "../src/utils/events-core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test.describe("event regression coverage", () => {
  test("event form exposes venue assignment and constrained numeric fields", async ({ page }) => {
    await page.goto("/events?new=1");

    await expect(page.getByLabel("Venue", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Guests")).toHaveAttribute("min", "0");
    await expect(page.getByLabel("Tables")).toHaveAttribute("min", "0");
    await expect(page.getByLabel("Travel (km)")).toHaveAttribute("min", "0");
  });

  test("disabling optional date and time sections clears their values", async ({ page }) => {
    await page.goto("/events?new=1");

    await page.getByLabel("Multi-day event").check();
    await page.getByLabel("End date").fill("2030-05-03");
    await page.getByLabel("Multi-day event").uncheck();
    await page.getByLabel("Multi-day event").check();
    await expect(page.getByLabel("End date")).toHaveValue("");

    await page.getByLabel("Add times").check();
    await page.getByLabel("Start", { exact: true }).fill("18:30");
    await page.getByLabel("Add times").uncheck();
    await page.getByLabel("Add times").check();
    await expect(page.getByLabel("Start", { exact: true })).toHaveValue("");
  });

  test("calendar month navigation changes the visible month", async ({ page }) => {
    await page.goto("/calendar");

    const heading = page.locator("main h2");
    const initialMonth = await heading.textContent();
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(heading).not.toHaveText(initialMonth ?? "");
  });

  test("local date and multi-day helpers do not use UTC slicing", () => {
    const lateLocalTime = new Date(2029, 11, 31, 23, 30);
    expect(localDateKey(lateLocalTime)).toBe("2029-12-31");
    expect(eventDateKeys("2030-05-01", "2030-05-03")).toEqual([
      "2030-05-01",
      "2030-05-02",
      "2030-05-03",
    ]);
  });

  test("event form normalization clears hidden values and rejects invalid ranges", () => {
    expect(normalizeEventForm({
      startDate: "2030-05-03",
      endDate: "2030-05-01",
      multiDay: true,
      showTimes: false,
      setupTime: "16:00",
      startTime: "18:00",
      endTime: "22:00",
      packdownTime: "23:00",
    })).toEqual({ ok: false, error: "End date cannot be before start date." });

    expect(normalizeEventForm({
      startDate: "2030-05-03",
      endDate: "2030-05-04",
      multiDay: false,
      showTimes: false,
      setupTime: "16:00",
      startTime: "18:00",
      endTime: "22:00",
      packdownTime: "23:00",
    })).toMatchObject({
      ok: true,
      endDate: null,
      setupTime: null,
      startTime: null,
      endTime: null,
      packdownTime: null,
    });
  });
});

test("contact and venue search destinations consume the selected record id", () => {
  for (const file of ["src/pages/ContactsPage.tsx", "src/pages/VenuesPage.tsx"]) {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).toContain("useSearchParams");
    expect(source).toContain('searchParams.get("selected")');
  }
});

test("pipeline exposes every status and a keyboard-operable status control", () => {
  const source = readFileSync(resolve(process.cwd(), "src/pages/EventsPage.tsx"), "utf8");
  for (const status of ["follow_up", "planning", "wrap_up", "closed"]) {
    expect(source).toContain(`status: "${status}"`);
  }
  expect(source).toContain("Move ${event.name} to status");
});

test("date-only UI values use local calendar dates instead of UTC slicing", () => {
  for (const file of [
    "src/pages/SettingsPage.tsx",
    "src/pages/InventoryPage.tsx",
    "src/components/event-tabs/ChecklistTab.tsx",
    "src/components/event-tabs/PrintQuote.tsx",
    "src/components/event-tabs/PhotosTab.tsx",
  ]) {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).not.toContain("toISOString().slice(0, 10)");
  }
});

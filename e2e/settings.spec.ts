import { test, expect } from "@playwright/test";

test.describe("M2 Settings Page", () => {
  test("settings page renders", async ({ page }) => {
    await page.goto("/settings");
    // The heading is always rendered regardless of DB state
    await expect(page.locator("main h1")).toBeVisible();
  });

  test("settings page shows business fields", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Business name")).toBeVisible();
    await expect(page.getByText("Phone")).toBeVisible();
    await expect(page.getByText("Email")).toBeVisible();
    await expect(page.getByText("Quote validity (days)")).toBeVisible();
  });

  test("settings page shows lists section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Lists")).toBeVisible();
    await expect(page.getByText("Event types")).toBeVisible();
    await expect(page.getByText("Lead sources")).toBeVisible();
  });

  test("settings page shows about section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("About")).toBeVisible();
    await expect(page.getByText("v0.1.0")).toBeVisible();
  });
});

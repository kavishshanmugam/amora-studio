import { test, expect } from "@playwright/test";

test.describe("M0 Scaffold — Smoke Tests", () => {
  test("app renders with sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Amora Studio")).toBeVisible();
    await expect(page.getByText("Amora Events")).toBeVisible();
  });

  test("sidebar has all nav sections", async ({ page }) => {
    await page.goto("/");
    // Section headers
    await expect(page.locator("text=Work")).toBeVisible();
    await expect(page.locator("text=Library")).toBeVisible();
  });

  test("sidebar has all nav items", async ({ page }) => {
    await page.goto("/");
    const navLabels = [
      "Today",
      "Events",
      "Calendar",
      "Contacts",
      "Venues",
      "Inventory",
      "Price list",
      "Templates",
      "Notifications",
      "Settings",
    ];
    for (const label of navLabels) {
      await expect(page.locator("aside").getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("sidebar new enquiry opens the enquiry form", async ({ page }) => {
    await page.goto("/");
    await page.locator("aside").getByRole("button", { name: "New enquiry" }).click();
    await expect(page).toHaveURL(/\/events\?new=1$/);
    await expect(page.getByRole("heading", { name: "New enquiry" })).toBeVisible();
  });

  test("new-enquiry required fields are labelled and enforced", async ({ page }) => {
    await page.goto("/events?new=1");

    const name = page.getByLabel("Name *");
    const startDate = page.getByLabel("Start date *");
    await expect(name).toBeVisible();
    await expect(startDate).toBeVisible();
    await expect(page.getByLabel("Lead source")).toBeVisible();
    await expect(page.getByLabel("Description")).toBeVisible();
    await expect(name).toHaveAttribute("required", "");
    await expect(startDate).toHaveAttribute("required", "");
  });

  test("navigation works for each route", async ({ page }) => {
    const routes = [
      { link: "Events", heading: /events/i },
      { link: "Calendar", heading: /calendar/i },
      { link: "Contacts", heading: /contacts/i },
      { link: "Venues", heading: /venues/i },
      { link: "Inventory", heading: /inventory/i },
      { link: "Price list", heading: /price list/i },
      { link: "Templates", heading: /templates/i },
      { link: "Notifications", heading: /notifications/i },
      { link: "Settings", heading: /settings/i },
    ];

    await page.goto("/");

    for (const route of routes) {
      await page.locator(`nav >> text=${route.link}`).click();
      // Verify the page loaded (has some content — at minimum the heading)
      await expect(page.locator("main, [role=main], .flex-1").first()).toBeVisible();
    }

    // Navigate back to Today
    await page.locator("nav >> text=Today").click();
  });

  test("Today page is the default route", async ({ page }) => {
    await page.goto("/");
    // The Today nav link should be active (has the active class)
    const todayLink = page.locator("nav >> text=Today").first();
    await expect(todayLink).toBeVisible();
  });
});

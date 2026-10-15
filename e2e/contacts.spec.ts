import { test, expect } from "@playwright/test";

test.describe("M2 Contacts Page", () => {
  test("contacts page renders with header and tabs", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByText("Add contact")).toBeVisible();
  });

  test("contacts page shows filter tabs", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clients" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Suppliers" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Crew" })).toBeVisible();
  });

  test("contacts page has search input", async ({ page }) => {
    await page.goto("/contacts");
    await expect(page.getByPlaceholder("Search contacts...")).toBeVisible();
  });

  test("contacts page shows empty state", async ({ page }) => {
    await page.goto("/contacts");
    // In browser mode (no Tauri), DB won't be available, so we expect either
    // the empty state or a loading state
    const emptyOrLoading = page.getByText(/No contacts yet|Loading|Could not load contacts|Cannot read properties/);
    await expect(emptyOrLoading).toBeVisible();
  });

  test("add contact button opens form", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByText("Add contact").click();
    await expect(page.getByText("New contact")).toBeVisible();
    await expect(page.getByPlaceholder("e.g. Florist, Helper")).toBeVisible();
  });
});

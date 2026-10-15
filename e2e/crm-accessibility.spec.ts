import { test, expect } from "@playwright/test";

test.describe("CRM form accessibility and validation", () => {
  test("contact form exposes persistent names for every field", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByRole("button", { name: "Add contact" }).click();

    for (const name of [
      "Name *", "Business name", "Client", "Supplier", "Crew", "Role",
      "Phone", "Email", "Address", "Instagram", "Website", "Notes",
    ]) {
      await expect(page.getByLabel(name, { exact: true })).toBeVisible();
    }

    await page.getByLabel("Crew", { exact: true }).check();
    await expect(page.getByLabel("Rate ($)", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Per", { exact: true })).toBeVisible();
  });

  test("venue form exposes persistent names and reports a blank required name", async ({ page }) => {
    await page.goto("/venues");
    await page.getByRole("button", { name: "Add venue" }).click();

    for (const name of [
      "Name *", "Address", "Venue coordinator", "Loading access", "Stairs / lift",
      "Power", "Rules", "Instagram", "Website", "Notes",
    ]) {
      await expect(page.getByLabel(name, { exact: true })).toBeVisible();
    }

    const name = page.getByLabel("Name *", { exact: true });
    await page.getByRole("button", { name: "Create" }).click();
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Venue name is required.", { exact: true })).toBeVisible();
  });
});

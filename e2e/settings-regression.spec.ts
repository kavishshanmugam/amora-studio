import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BACKUP_TABLES } from "../src/utils/backup-restore";

test.describe("backup restore safety", () => {
  test("requires explicit confirmation after validating a selected backup", async ({ page }) => {
    await page.goto("/settings");

    await page.getByLabel("Choose backup file").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(Object.fromEntries(BACKUP_TABLES.map((table) => [table, []])))),
    });

    await expect(page.getByText(`This will replace data in ${BACKUP_TABLES.length} tables from backup.json.`))
      .toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm restore" })).toBeVisible();
    await expect(page.getByText("Restore complete! Refresh to see changes.")).not.toBeVisible();
  });

  test("reports invalid files without starting a restore", async ({ page }) => {
    await page.goto("/settings");

    await page.getByLabel("Choose backup file").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{not json"),
    });

    await expect(page.getByRole("status")).toContainText("Restore failed: Backup file is not valid JSON.");
    await expect(page.getByRole("button", { name: "Confirm restore" })).not.toBeVisible();
  });
});

test("configured supplier roles and expense categories feed their forms", () => {
  const contacts = readFileSync(resolve(process.cwd(), "src/pages/ContactsPage.tsx"), "utf8");
  const quote = readFileSync(resolve(process.cwd(), "src/components/event-tabs/QuotePaymentsTab.tsx"), "utf8");
  expect(contacts).toContain('useSetting("supplier_roles")');
  expect(quote).toContain('useSetting("expense_categories")');
});

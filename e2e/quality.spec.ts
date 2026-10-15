import { test, expect } from "@playwright/test";

test.describe("Minimum-window UX", () => {
  test.use({ viewport: { width: 1024, height: 700 } });

  test("browser test harness has no uncaught console or page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await expect(page.getByText("Amora Studio")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("event filters and search remain usable at the supported minimum width", async ({ page }) => {
    await page.goto("/events");

    const completed = page.getByRole("button", { name: "Completed", exact: true });
    await expect(completed).toBeVisible();

    const completedBox = await completed.boundingBox();
    expect(completedBox).not.toBeNull();
    expect(completedBox!.x + completedBox!.width).toBeLessThanOrEqual(1024);

    const search = page.getByPlaceholder("Search events...");
    await expect(search).toBeVisible();
    const searchBox = await search.boundingBox();
    expect(searchBox).not.toBeNull();
    expect(searchBox!.width).toBeGreaterThanOrEqual(180);
  });
});

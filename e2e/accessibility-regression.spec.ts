import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

async function mountSharedComponent(page: import("@playwright/test").Page, source: string) {
  await page.goto("/");
  await page.evaluate(async (body) => {
    const ReactModule = await import("/@id/react");
    const React = ReactModule.default ?? ReactModule;
    const ReactDOMModule = await import("/@id/react-dom/client");
    const ReactDOM = ReactDOMModule.default ?? ReactDOMModule;
    const fixture = document.createElement("div");
    fixture.id = "shared-component-fixture";
    document.body.append(fixture);
    const factory = new Function("React", "ReactDOM", `return (${body})`);
    await factory(React, ReactDOM)();
  }, source);
}

test("unknown routes provide a useful recovery page", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Back to Today" })).toHaveAttribute("href", "/");
});

test("client-side navigation moves focus to main content", async ({ page }) => {
  await page.goto("/");
  await page.locator("nav").getByText("Events", { exact: true }).click();
  await expect(page.locator("main")).toBeFocused();
});

test("production source guards the destructive test-flow route", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  expect(app).toContain("import.meta.env.DEV");
  expect(app).toMatch(/import\.meta\.env\.DEV[\s\S]*path="\/test-flows"/);
});

test("confirmation dialogs trap focus, start safely, and restore focus", async ({ page }) => {
  await mountSharedComponent(page, `async () => {
    const mod = await import('/src/components/shared/ConfirmDialog.tsx');
    const fixture = document.getElementById('shared-component-fixture');
    const opener = document.createElement('button');
    opener.textContent = 'Delete record';
    fixture.before(opener);
    opener.focus();
    const root = ReactDOM.createRoot(fixture);
    const close = () => root.render(null);
    root.render(React.createElement(mod.ConfirmDialog, {
      open: true, title: 'Delete record?', message: 'This cannot be undone.', danger: true,
      confirmLabel: 'Delete', onConfirm: close, onCancel: close
    }));
  }`);

  const opener = page.getByRole("button", { name: "Delete record" });
  const dialog = page.getByRole("alertdialog", { name: "Delete record?" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Delete" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("contact lookup exposes a labelled keyboard-operable combobox", async ({ page }) => {
  await page.goto("/events?new=1");
  const search = page.getByRole("combobox", { name: "Client" });
  await expect(search).toHaveAttribute("aria-autocomplete", "list");
  await search.fill("Alex");
  await expect(search).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await expect(search).toHaveAttribute("aria-activedescendant", /.+/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "New contact" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "New contact" }).getByRole("textbox", { name: "Name", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "New contact" })).toBeHidden();
  await expect(search).toBeFocused();
});

test("undo toast is announced, persistent by default, and has named controls", async ({ page }) => {
  await mountSharedComponent(page, `async () => {
    const mod = await import('/src/components/shared/Toast.tsx');
    function Trigger() {
      const toast = mod.useToast();
      return React.createElement('button', { onClick: () => toast.show('Contact deleted', { onUndo: () => {} }) }, 'Show toast');
    }
    ReactDOM.createRoot(document.getElementById('shared-component-fixture')).render(
      React.createElement(mod.ToastProvider, null, React.createElement(Trigger))
    );
  }`);
  await page.getByRole("button", { name: "Show toast" }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText("Contact deleted");
  await expect(page.getByRole("button", { name: "Dismiss notification" })).toBeVisible();
  await page.waitForTimeout(5_200);
  await expect(status).toBeVisible();
});

test("global styles support keyboard focus, reduced motion, and scaled layouts", async ({ page }) => {
  await page.goto("/");
  const rules = await page.evaluate(() => Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try { return Array.from(sheet.cssRules).map((rule) => rule.cssText); } catch { return []; }
    }).join("\n"));
  expect(rules).toContain(":focus-visible");
  expect(rules).toContain("prefers-reduced-motion");
  expect(rules).toContain("min-width: 0px");
});

test("draggable event lists expose keyboard reordering", () => {
  const hook = readFileSync(new URL("../src/hooks/use-drag-reorder.ts", import.meta.url), "utf8");
  expect(hook).toContain("moveItem");
  for (const file of ["QuotePaymentsTab.tsx", "ChecklistTab.tsx", "LogisticsTab.tsx"]) {
    const source = readFileSync(new URL(`../src/components/event-tabs/${file}`, import.meta.url), "utf8");
    expect(source).toContain("Alt+Arrow");
  }
});

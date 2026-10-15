import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogueItem, InventoryItem } from "./data/types";

const select = vi.fn();
const execute = vi.fn();

vi.mock("./data/db", () => ({
  getDb: vi.fn(async () => ({ select, execute })),
}));

import { catalogueRepo } from "./data/repositories/catalogue";
import {
  catalogueFormToPatch,
  deleteCatalogueItemWithUndo,
  validateCatalogueForm,
} from "./pages/PriceListPage";
import {
  inventoryFormToPatch,
  validateInventoryForm,
} from "./pages/InventoryPage";

const catalogueItem: CatalogueItem = {
  id: "catalogue-1",
  name: "Arch",
  category: "Backdrops & arches",
  description: "Old description",
  unit: "each",
  price_cents: 12000,
  inventory_item_id: "inventory-1",
  is_package: 0,
  active: 0,
  position: 7,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  deleted_at: null,
};

const inventoryItem: InventoryItem = {
  id: "inventory-1",
  name: "Gold arch",
  category: "Arches",
  quantity_owned: 2,
  hire_price_cents: 12000,
  replacement_cost_cents: 30000,
  storage_location: "Shelf A",
  condition: "good",
  notes: null,
  photo: "C:/photos/arch.jpg",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  deleted_at: null,
};

describe("catalogue regression coverage", () => {
  beforeEach(() => {
    select.mockReset();
    execute.mockReset();
  });

  it("lists inactive non-deleted catalogue items when requested", async () => {
    select.mockResolvedValue([catalogueItem]);

    await catalogueRepo.findAvailable();

    expect(select).toHaveBeenCalledWith(
      "SELECT * FROM catalogue_items WHERE deleted_at IS NULL ORDER BY position, name",
    );
  });

  it("preserves catalogue linkage and lifecycle fields while editing", () => {
    const patch = catalogueFormToPatch({
      name: "  Updated arch  ",
      category: "Backdrops & arches",
      description: "Updated",
      unit: "each",
      price: "130.50",
      is_package: false,
    });

    expect(patch).toEqual({
      name: "Updated arch",
      category: "Backdrops & arches",
      description: "Updated",
      unit: "each",
      price_cents: 13050,
      is_package: 0,
    });
    expect(patch).not.toHaveProperty("inventory_item_id");
    expect(patch).not.toHaveProperty("active");
    expect(patch).not.toHaveProperty("position");
    expect(patch).not.toHaveProperty("deleted_at");
  });

  it("preserves an inventory photo and lifecycle fields while editing", () => {
    const patch = inventoryFormToPatch({
      name: "  Gold arch  ",
      category: "Arches",
      quantity_owned: "3",
      hire_price: "140",
      replacement_cost: "350",
      storage_location: "Shelf B",
      condition: "good",
      notes: "Polished",
    });

    expect(patch.name).toBe("Gold arch");
    expect(patch.quantity_owned).toBe(3);
    expect(patch).not.toHaveProperty("photo");
    expect(patch).not.toHaveProperty("deleted_at");
    expect({ ...inventoryItem, ...patch }).toMatchObject({
      photo: "C:/photos/arch.jpg",
      deleted_at: null,
    });
  });

  it("returns clear catalogue name and price validation errors", () => {
    expect(validateCatalogueForm({
      name: "   ", category: "", description: "", unit: "each", price: "-1", is_package: false,
    })).toEqual({
      name: "Enter an item name.",
      price: "Enter a price of 0 or more.",
    });
  });

  it("offers Undo only after catalogue deletion succeeds", async () => {
    const order: string[] = [];
    let resolveDelete!: () => void;
    const deletion = new Promise<void>((resolve) => { resolveDelete = resolve; });

    const pending = deleteCatalogueItemWithUndo(
      "catalogue-1",
      async () => { order.push("delete-start"); await deletion; order.push("delete-finish"); },
      (_message, onUndo) => { order.push("toast"); onUndo(); },
      async () => { order.push("restore"); },
    );

    await Promise.resolve();
    expect(order).toEqual(["delete-start"]);
    resolveDelete();
    await pending;
    expect(order).toEqual(["delete-start", "delete-finish", "toast", "restore"]);
  });

  it("returns clear inventory quantity and price validation errors", () => {
    expect(validateInventoryForm({
      name: "", category: "", quantity_owned: "1.5", hire_price: "abc",
      replacement_cost: "-2", storage_location: "", condition: "good", notes: "",
    })).toEqual({
      name: "Enter an item name.",
      quantity_owned: "Enter a whole quantity of 0 or more.",
      hire_price: "Enter a hire price of 0 or more.",
      replacement_cost: "Enter a replacement cost of 0 or more, or leave it blank.",
    });
  });

  it("recomputes parent package totals after a component price changes", async () => {
    select.mockResolvedValue([{ package_id: "package-1" }, { package_id: "package-2" }]);

    await catalogueRepo.update("catalogue-1", { price_cents: 15000 });

    expect(select).toHaveBeenCalledWith(
      "SELECT DISTINCT package_id FROM catalogue_package_items WHERE catalogue_item_id = ?",
      ["catalogue-1"],
    );
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("UPDATE catalogue_items"), ["package-1"]);
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("UPDATE catalogue_items"), ["package-2"]);
  });

  it("recomputes parent package totals after a component is deactivated", async () => {
    select.mockResolvedValue([{ package_id: "package-1" }]);

    await catalogueRepo.update("catalogue-1", { active: 0 });

    expect(execute.mock.calls[0]).toEqual(["BEGIN TRANSACTION"]);
    expect(select).toHaveBeenCalledWith(
      "SELECT DISTINCT package_id FROM catalogue_package_items WHERE catalogue_item_id = ?",
      ["catalogue-1"],
    );
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("COALESCE(SUM"), ["package-1"]);
    expect(execute.mock.calls[execute.mock.calls.length - 1]).toEqual(["COMMIT"]);
  });

  it("rolls back a component price update when package recalculation fails", async () => {
    select.mockResolvedValue([{ package_id: "package-1" }]);
    execute.mockImplementation(async (sql: string) => {
      if (sql.includes("COALESCE(SUM")) throw new Error("recalculation failed");
      return { rowsAffected: 1 };
    });

    await expect(catalogueRepo.update("catalogue-1", { price_cents: 15000 }))
      .rejects.toThrow("recalculation failed");

    expect(execute.mock.calls[0]).toEqual(["BEGIN TRANSACTION"]);
    expect(execute.mock.calls[execute.mock.calls.length - 1]).toEqual(["ROLLBACK"]);
  });

  it("soft-deletes a component and excludes it from parent package totals atomically", async () => {
    select.mockResolvedValue([{ package_id: "package-1" }]);

    await catalogueRepo.softDelete("catalogue-1");

    expect(execute.mock.calls[0]).toEqual(["BEGIN TRANSACTION"]);
    expect(select).toHaveBeenCalledWith(
      "SELECT DISTINCT package_id FROM catalogue_package_items WHERE catalogue_item_id = ?",
      ["catalogue-1"],
    );
    const recalculation = execute.mock.calls.find(([sql]) => sql.includes("COALESCE(SUM"));
    expect(recalculation?.[0]).toContain("ci.active = 1");
    expect(recalculation?.[0]).toContain("ci.deleted_at IS NULL");
    expect(recalculation?.[1]).toEqual(["package-1"]);
    expect(execute.mock.calls[execute.mock.calls.length - 1]).toEqual(["COMMIT"]);
  });

  it("restores a component and includes it in parent package totals without recreating links", async () => {
    select.mockResolvedValue([{ package_id: "package-1" }]);

    await catalogueRepo.restore("catalogue-1");

    expect(execute.mock.calls[0]).toEqual(["BEGIN TRANSACTION"]);
    expect(select).toHaveBeenCalledWith(
      "SELECT DISTINCT package_id FROM catalogue_package_items WHERE catalogue_item_id = ?",
      ["catalogue-1"],
    );
    expect(execute.mock.calls.some(([sql]) => sql.includes("SET deleted_at = NULL"))).toBe(true);
    expect(execute.mock.calls.some(([sql]) => sql.includes("DELETE FROM catalogue_package_items"))).toBe(false);
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("COALESCE(SUM"), ["package-1"]);
    expect(execute.mock.calls[execute.mock.calls.length - 1]).toEqual(["COMMIT"]);
  });

  it("adds a package component and recalculates its total atomically", async () => {
    execute.mockImplementation(async (sql: string) => {
      if (sql.includes("COALESCE(SUM")) throw new Error("recalculation failed");
      return { rowsAffected: 1 };
    });

    await expect(catalogueRepo.addPackageItem("package-1", "catalogue-1", 2))
      .rejects.toThrow("recalculation failed");

    expect(execute.mock.calls[0]).toEqual(["BEGIN TRANSACTION"]);
    expect(execute.mock.calls.some(([sql]) => sql.includes("INSERT INTO catalogue_package_items"))).toBe(true);
    expect(execute.mock.calls[execute.mock.calls.length - 1]).toEqual(["ROLLBACK"]);
  });

  it("removes a package component and recalculates its total atomically", async () => {
    select.mockResolvedValue([{ package_id: "package-1" }]);
    execute.mockImplementation(async (sql: string) => {
      if (sql.includes("COALESCE(SUM")) throw new Error("recalculation failed");
      return { rowsAffected: 1 };
    });

    await expect(catalogueRepo.removePackageItem("package-item-1"))
      .rejects.toThrow("recalculation failed");

    expect(execute.mock.calls[0]).toEqual(["BEGIN TRANSACTION"]);
    expect(execute.mock.calls.some(([sql]) => sql.includes("DELETE FROM catalogue_package_items"))).toBe(true);
    expect(execute.mock.calls[execute.mock.calls.length - 1]).toEqual(["ROLLBACK"]);
  });
});

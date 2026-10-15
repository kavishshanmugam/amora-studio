import type { CatalogueItem } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";
import { uid } from "../uid";

type CatalogueDb = Awaited<ReturnType<typeof getDb>>;

async function inTransaction(db: CatalogueDb, operation: () => Promise<void>): Promise<void> {
  await db.execute("BEGIN TRANSACTION");
  try {
    await operation();
    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

async function recalculatePackage(db: CatalogueDb, packageId: string): Promise<void> {
  await db.execute(
    `UPDATE catalogue_items
     SET price_cents = (
       SELECT COALESCE(SUM(ci.price_cents * cpi.quantity), 0)
       FROM catalogue_package_items cpi
       JOIN catalogue_items ci ON ci.id = cpi.catalogue_item_id
       WHERE cpi.package_id = catalogue_items.id
         AND ci.active = 1
         AND ci.deleted_at IS NULL
       ), updated_at = datetime('now')
     WHERE id = ?`,
    [packageId],
  );
}

class CatalogueRepository extends BaseRepository<CatalogueItem> {
  constructor() {
    super("catalogue_items", true);
  }

  async findActive(): Promise<CatalogueItem[]> {
    const db = await getDb();
    return db.select<CatalogueItem[]>(
      "SELECT * FROM catalogue_items WHERE active = 1 AND deleted_at IS NULL ORDER BY position, name"
    );
  }

  async findAvailable(): Promise<CatalogueItem[]> {
    const db = await getDb();
    return db.select<CatalogueItem[]>(
      "SELECT * FROM catalogue_items WHERE deleted_at IS NULL ORDER BY position, name"
    );
  }

  override async softDelete(id: string): Promise<void> {
    const db = await getDb();
    await inTransaction(db, async () => {
      const parents = await db.select<{ package_id: string }[]>(
        "SELECT DISTINCT package_id FROM catalogue_package_items WHERE catalogue_item_id = ?",
        [id],
      );
      await super.softDelete(id);
      for (const { package_id } of parents) await recalculatePackage(db, package_id);
    });
  }

  override async restore(id: string): Promise<void> {
    const db = await getDb();
    await inTransaction(db, async () => {
      const parents = await db.select<{ package_id: string }[]>(
        "SELECT DISTINCT package_id FROM catalogue_package_items WHERE catalogue_item_id = ?",
        [id],
      );
      await super.restore(id);
      for (const { package_id } of parents) await recalculatePackage(db, package_id);
    });
  }

  override async update(
    id: string,
    data: Partial<Omit<CatalogueItem, "id" | "created_at" | "updated_at">>
  ): Promise<void> {
    if (!("price_cents" in data) && !("active" in data)) {
      await super.update(id, data);
      return;
    }

    const db = await getDb();
    await inTransaction(db, async () => {
      await super.update(id, data);
      const parents = await db.select<{ package_id: string }[]>(
        "SELECT DISTINCT package_id FROM catalogue_package_items WHERE catalogue_item_id = ?",
        [id],
      );
      for (const { package_id } of parents) await recalculatePackage(db, package_id);
    });
  }

  async addPackageItem(packageId: string, catalogueItemId: string, quantity: number): Promise<void> {
    const db = await getDb();
    await inTransaction(db, async () => {
      await db.execute(
        "INSERT INTO catalogue_package_items (id, package_id, catalogue_item_id, quantity) VALUES (?, ?, ?, ?)",
        [uid(), packageId, catalogueItemId, quantity],
      );
      await recalculatePackage(db, packageId);
    });
  }

  async removePackageItem(id: string): Promise<void> {
    const db = await getDb();
    await inTransaction(db, async () => {
      const [row] = await db.select<{ package_id: string }[]>(
        "SELECT package_id FROM catalogue_package_items WHERE id = ?",
        [id],
      );
      await db.execute("DELETE FROM catalogue_package_items WHERE id = ?", [id]);
      if (row) await recalculatePackage(db, row.package_id);
    });
  }

  async findByCategory(category: string): Promise<CatalogueItem[]> {
    const db = await getDb();
    return db.select<CatalogueItem[]>(
      "SELECT * FROM catalogue_items WHERE category = ? AND active = 1 AND deleted_at IS NULL ORDER BY position",
      [category]
    );
  }

  async findPackages(): Promise<CatalogueItem[]> {
    const db = await getDb();
    return db.select<CatalogueItem[]>(
      "SELECT * FROM catalogue_items WHERE is_package = 1 AND active = 1 AND deleted_at IS NULL ORDER BY name"
    );
  }
}

export const catalogueRepo = new CatalogueRepository();

import type { CatalogueItem } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

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

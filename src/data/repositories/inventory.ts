import type { InventoryItem } from "../types";
import { BaseRepository } from "./base";

class InventoryRepository extends BaseRepository<InventoryItem> {
  constructor() {
    super("inventory_items", true);
  }
}

export const inventoryRepo = new InventoryRepository();

import type { StylingItem } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

class StylingItemsRepository extends BaseRepository<StylingItem> {
  constructor() {
    super("styling_items", false);
  }

  async findByEvent(eventId: string): Promise<StylingItem[]> {
    const db = await getDb();
    return db.select<StylingItem[]>(
      "SELECT * FROM styling_items WHERE event_id = ? ORDER BY category, created_at",
      [eventId]
    );
  }
}

export const stylingItemsRepo = new StylingItemsRepository();

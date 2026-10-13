import type { ChecklistItem, ChecklistTemplate } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

class ChecklistItemsRepository extends BaseRepository<ChecklistItem> {
  constructor() {
    super("checklist_items", false);
  }

  async findByEvent(eventId: string, section?: string): Promise<ChecklistItem[]> {
    const db = await getDb();
    if (section) {
      return db.select<ChecklistItem[]>(
        "SELECT * FROM checklist_items WHERE event_id = ? AND section = ? ORDER BY position",
        [eventId, section]
      );
    }
    return db.select<ChecklistItem[]>(
      "SELECT * FROM checklist_items WHERE event_id = ? ORDER BY section, position",
      [eventId]
    );
  }
}

class ChecklistTemplatesRepository extends BaseRepository<ChecklistTemplate> {
  constructor() {
    super("checklist_templates", false);
  }
}

export const checklistItemsRepo = new ChecklistItemsRepository();
export const checklistTemplatesRepo = new ChecklistTemplatesRepository();

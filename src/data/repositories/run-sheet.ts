import { getDb } from "../db";
import { BaseRepository } from "./base";

export interface RunSheetItem {
  id: string;
  event_id: string;
  date: string | null;
  time: string | null;
  task: string | null;
  assigned_contact_id: string | null;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

class RunSheetRepository extends BaseRepository<RunSheetItem> {
  constructor() {
    super("run_sheet_items", false);
  }

  async findByEvent(eventId: string): Promise<RunSheetItem[]> {
    const db = await getDb();
    return db.select<RunSheetItem[]>(
      "SELECT * FROM run_sheet_items WHERE event_id = ? ORDER BY position",
      [eventId]
    );
  }
}

export const runSheetRepo = new RunSheetRepository();

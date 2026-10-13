import type { ActivityLog } from "../types";
import { getDb } from "../db";
import { uid } from "../uid";

class ActivityLogRepository {
  async findByEvent(eventId: string, limit = 50): Promise<ActivityLog[]> {
    const db = await getDb();
    return db.select<ActivityLog[]>(
      "SELECT * FROM activity_log WHERE event_id = ? ORDER BY timestamp DESC LIMIT ?",
      [eventId, limit]
    );
  }

  async log(eventId: string, type: string, summary: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      "INSERT INTO activity_log (id, event_id, type, summary) VALUES (?, ?, ?, ?)",
      [uid(), eventId, type, summary]
    );
  }
}

export const activityLogRepo = new ActivityLogRepository();

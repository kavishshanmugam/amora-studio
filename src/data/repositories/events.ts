import type { AmoraEvent, EventStatus } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

class EventsRepository extends BaseRepository<AmoraEvent> {
  constructor() {
    super("events", true);
  }

  async findByStatus(status: EventStatus): Promise<AmoraEvent[]> {
    const db = await getDb();
    return db.select<AmoraEvent[]>(
      "SELECT * FROM events WHERE status = ? AND deleted_at IS NULL ORDER BY start_date",
      [status]
    );
  }

  async findUpcoming(days = 30): Promise<AmoraEvent[]> {
    const db = await getDb();
    return db.select<AmoraEvent[]>(
      `SELECT * FROM events
       WHERE deleted_at IS NULL
         AND start_date >= date('now')
         AND start_date <= date('now', '+' || ? || ' days')
       ORDER BY start_date`,
      [days]
    );
  }

  async findByClient(clientId: string): Promise<AmoraEvent[]> {
    const db = await getDb();
    return db.select<AmoraEvent[]>(
      "SELECT * FROM events WHERE client_id = ? AND deleted_at IS NULL ORDER BY start_date DESC",
      [clientId]
    );
  }

  /** Generate next reference: AE-YYYY-NNN */
  async nextReference(): Promise<string> {
    const db = await getDb();
    const year = new Date().getFullYear();
    const prefix = `AE-${year}-`;
    const rows = await db.select<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM events WHERE reference LIKE ?`,
      [`${prefix}%`]
    );
    const num = (rows[0]?.cnt ?? 0) + 1;
    return `${prefix}${String(num).padStart(3, "0")}`;
  }
}

export const eventsRepo = new EventsRepository();

import type { QuoteLine } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

class QuoteLinesRepository extends BaseRepository<QuoteLine> {
  constructor() {
    super("quote_lines", false);
  }

  async findByEvent(eventId: string): Promise<QuoteLine[]> {
    const db = await getDb();
    return db.select<QuoteLine[]>(
      "SELECT * FROM quote_lines WHERE event_id = ? ORDER BY position",
      [eventId]
    );
  }

  /** Quote total = sum of (qty * unit_price - line_discount) */
  async subtotalForEvent(eventId: string): Promise<number> {
    const db = await getDb();
    const rows = await db.select<{ total: number }[]>(
      `SELECT COALESCE(SUM(quantity * unit_price_cents - line_discount_cents), 0) as total
       FROM quote_lines WHERE event_id = ?`,
      [eventId]
    );
    return rows[0]?.total ?? 0;
  }
}

export const quoteLinesRepo = new QuoteLinesRepository();

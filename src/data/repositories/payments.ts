import type { Payment } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

class PaymentsRepository extends BaseRepository<Payment> {
  constructor() {
    super("payments", false);
  }

  async findByEvent(eventId: string): Promise<Payment[]> {
    const db = await getDb();
    return db.select<Payment[]>(
      "SELECT * FROM payments WHERE event_id = ? ORDER BY date DESC",
      [eventId]
    );
  }

  async totalForEvent(eventId: string): Promise<number> {
    const db = await getDb();
    const rows = await db.select<{ total: number }[]>(
      "SELECT COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE event_id = ?",
      [eventId]
    );
    return rows[0]?.total ?? 0;
  }
}

export const paymentsRepo = new PaymentsRepository();

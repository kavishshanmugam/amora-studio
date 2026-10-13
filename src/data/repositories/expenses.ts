import type { Expense } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

class ExpensesRepository extends BaseRepository<Expense> {
  constructor() {
    super("expenses", false);
  }

  async findByEvent(eventId: string): Promise<Expense[]> {
    const db = await getDb();
    return db.select<Expense[]>(
      "SELECT * FROM expenses WHERE event_id = ? ORDER BY date DESC",
      [eventId]
    );
  }
}

export const expensesRepo = new ExpensesRepository();

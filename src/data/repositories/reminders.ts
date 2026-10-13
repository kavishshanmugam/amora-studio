import type { Reminder } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

class RemindersRepository extends BaseRepository<Reminder> {
  constructor() {
    super("reminders", false);
  }

  async findPending(): Promise<Reminder[]> {
    const db = await getDb();
    return db.select<Reminder[]>(
      `SELECT * FROM reminders
       WHERE fired_at IS NULL AND dismissed_at IS NULL
       ORDER BY scheduled_for`
    );
  }

  async findUnread(): Promise<Reminder[]> {
    const db = await getDb();
    return db.select<Reminder[]>(
      `SELECT * FROM reminders
       WHERE fired_at IS NOT NULL AND read_at IS NULL AND dismissed_at IS NULL
       ORDER BY fired_at DESC`
    );
  }
}

export const remindersRepo = new RemindersRepository();

import type { EventContact } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

class EventContactsRepository extends BaseRepository<EventContact> {
  constructor() {
    super("event_contacts", false);
  }

  async findByEvent(eventId: string): Promise<EventContact[]> {
    const db = await getDb();
    return db.select<EventContact[]>(
      "SELECT * FROM event_contacts WHERE event_id = ? ORDER BY created_at",
      [eventId]
    );
  }

  async unlink(eventId: string, contactId: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      "DELETE FROM event_contacts WHERE event_id = ? AND contact_id = ?",
      [eventId, contactId]
    );
  }
}

export const eventContactsRepo = new EventContactsRepository();

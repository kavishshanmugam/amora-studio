import type { AmoraEvent, EventStatus } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";
import { uid } from "../uid";

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

  override async update(id: string, data: Partial<Omit<AmoraEvent, "id" | "created_at" | "updated_at">>): Promise<void> {
    const next = { ...data };
    if (data.status) {
      if (data.status === "lost") next.cancel_reason = null;
      else if (data.status === "cancelled") next.lost_reason = null;
      else { next.lost_reason = null; next.cancel_reason = null; }
    }
    return super.update(id, next);
  }

  async copyChildren(sourceEventId: string, targetEventId: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    const quoteLines = await db.select<Record<string, unknown>[]>("SELECT description, quantity, unit, unit_price_cents, line_discount_cents, catalogue_item_id, position FROM quote_lines WHERE event_id = ? ORDER BY position", [sourceEventId]);
    for (const line of quoteLines) await db.execute("INSERT INTO quote_lines (id, event_id, description, quantity, unit, unit_price_cents, line_discount_cents, catalogue_item_id, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [uid(), targetEventId, line.description, line.quantity, line.unit, line.unit_price_cents, line.line_discount_cents, line.catalogue_item_id, line.position, now, now]);
    const styling = await db.select<Record<string, unknown>[]>("SELECT name, category, quantity, source, supplier_text, cost_cents, notes, position FROM styling_items WHERE event_id = ? ORDER BY position", [sourceEventId]);
    for (const item of styling) await db.execute("INSERT INTO styling_items (id, event_id, name, category, quantity, source, supplier_text, cost_cents, notes, status, inventory_item_id, due_back_date, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,'need',null,null,?,?,?)", [uid(), targetEventId, item.name, item.category, item.quantity, item.source, item.supplier_text, item.cost_cents, item.notes, item.position, now, now]);
    const checklist = await db.select<Record<string, unknown>[]>("SELECT text, section, due_date, position FROM checklist_items WHERE event_id = ? ORDER BY position", [sourceEventId]);
    for (const item of checklist) await db.execute("INSERT INTO checklist_items (id, event_id, text, is_done, due_date, completed_at, section, position, created_at, updated_at) VALUES (?,?,?,0,?,null,?,?,?,?)", [uid(), targetEventId, item.text, item.due_date, item.section, item.position, now, now]);
  }

  async deepDuplicate(
    sourceEventId: string,
    data: Omit<AmoraEvent, "id" | "created_at" | "updated_at">,
  ): Promise<AmoraEvent> {
    const db = await getDb();
    await db.execute("BEGIN TRANSACTION");
    try {
      const duplicate = await this.create(data);
      await this.copyChildren(sourceEventId, duplicate.id);
      await db.execute("COMMIT");
      return duplicate;
    } catch (error) {
      await db.execute("ROLLBACK");
      throw error;
    }
  }

  /** Generate next reference: AE-YYYY-NNN */
  async nextReference(): Promise<string> {
    const db = await getDb();
    const year = new Date().getFullYear();
    const settings = await db.select<{ value: string | null }[]>("SELECT value FROM settings WHERE key = 'reference_prefix'");
    const configuredPrefix = settings[0]?.value?.trim() || "AE";
    const prefix = `${configuredPrefix}-${year}-`;
    const rows = await db.select<{ mx: string | null }[]>(
      `SELECT MAX(reference) as mx FROM events WHERE reference LIKE ?`,
      [`${prefix}%`]
    );
    const last = rows[0]?.mx;
    const num = last ? parseInt(last.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(num).padStart(3, "0")}`;
  }
}

export const eventsRepo = new EventsRepository();

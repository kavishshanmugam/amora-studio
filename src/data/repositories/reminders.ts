import type { Reminder } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";
import { uid } from "../uid";

interface ReminderDatabase {
  select<T>(sql: string, params?: unknown[]): Promise<T>;
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

function rowsAffected(result: unknown): number {
  if (typeof result !== "object" || result === null || !("rowsAffected" in result)) return 0;
  const value = (result as { rowsAffected?: unknown }).rowsAffected;
  return typeof value === "number" ? value : 0;
}

export async function claimReminderForDelivery(
  db: ReminderDatabase,
  id: string,
  firedAt: string,
): Promise<boolean> {
  const result = await db.execute(
    `UPDATE reminders SET fired_at = ?
     WHERE id = ? AND fired_at IS NULL AND dismissed_at IS NULL`,
    [firedAt, id],
  );
  return rowsAffected(result) === 1;
}

export async function releaseReminderDeliveryClaim(
  db: ReminderDatabase,
  id: string,
  firedAt: string,
): Promise<void> {
  await db.execute(
    "UPDATE reminders SET fired_at = NULL WHERE id = ? AND fired_at = ?",
    [id, firedAt],
  );
}

interface NotificationSettings {
  follow_up_reminder?: number;
  deposit_due_reminder?: number;
  balance_due_reminder?: number;
  event_week_reminder?: number;
  items_not_packed_reminder?: number;
  wrap_up_reminder?: number;
}

interface ReminderEvent {
  id: string;
  name: string;
  follow_up_date?: string | null;
  deposit_due_date?: string | null;
  balance_due_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

interface ReminderDraft {
  type: string;
  scheduledFor: string;
  title: string;
  body: string;
}

interface ManagedReminderRow {
  id: string;
  type: string;
  event_id: string;
  scheduled_for: string;
  title: string;
  body: string | null;
}

const MANAGED_REMINDER_TYPES = [
  "follow_up",
  "deposit_due",
  "balance_due",
  "event_week",
  "items_not_packed",
  "wrap_up",
] as const;

function localDateParts(date: string): [number, number, number] {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return [year, month - 1, day];
}

function atNineLocal(date: string): string {
  const [year, month, day] = localDateParts(date);
  return new Date(year, month, day, 9).toISOString();
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = localDateParts(date);
  return new Date(year, month, day + days, 9).toISOString();
}

function draftsForEvent(
  event: ReminderEvent,
  settings: NotificationSettings,
  hasUnpackedItems: boolean,
): ReminderDraft[] {
  const drafts: ReminderDraft[] = [];
  if (settings.follow_up_reminder && event.follow_up_date) {
    drafts.push({
      type: "follow_up",
      scheduledFor: atNineLocal(event.follow_up_date),
      title: `Follow up: ${event.name}`,
      body: `Follow up for ${event.name} is due today.`,
    });
  }
  if (settings.deposit_due_reminder && event.deposit_due_date) {
    drafts.push({
      type: "deposit_due",
      scheduledFor: atNineLocal(event.deposit_due_date),
      title: `Deposit due: ${event.name}`,
      body: `The deposit for ${event.name} is due today.`,
    });
  }
  if (settings.balance_due_reminder && event.balance_due_date) {
    drafts.push({
      type: "balance_due",
      scheduledFor: atNineLocal(event.balance_due_date),
      title: `Balance due: ${event.name}`,
      body: `The balance for ${event.name} is due today.`,
    });
  }
  if (settings.event_week_reminder && event.start_date) {
    drafts.push({
      type: "event_week",
      scheduledFor: shiftDate(event.start_date, -7),
      title: `Event week: ${event.name}`,
      body: `${event.name} is one week away.`,
    });
  }
  if (settings.items_not_packed_reminder && event.start_date && hasUnpackedItems) {
    drafts.push({
      type: "items_not_packed",
      scheduledFor: shiftDate(event.start_date, -1),
      title: `Items not packed: ${event.name}`,
      body: `${event.name} still has items to pack.`,
    });
  }
  if (settings.wrap_up_reminder && event.start_date) {
    drafts.push({
      type: "wrap_up",
      scheduledFor: shiftDate(event.end_date || event.start_date, 1),
      title: `Wrap up: ${event.name}`,
      body: `Complete the wrap-up for ${event.name}.`,
    });
  }
  return drafts;
}

/** Materialize configured reminder rules into idempotent reminder rows. */
export async function generateRemindersFromRules(
  db: ReminderDatabase,
  createId: () => string = uid,
): Promise<number> {
  await db.execute("BEGIN IMMEDIATE TRANSACTION");
  try {
    const settingsRows = await db.select<NotificationSettings[]>(
      "SELECT * FROM notification_settings WHERE id = 1",
    );
    const settings = settingsRows[0] ?? {};
    const events = await db.select<ReminderEvent[]>(
      `SELECT id, name, follow_up_date, deposit_due_date, balance_due_date, start_date, end_date
       FROM events
       WHERE deleted_at IS NULL
         AND reminders_muted = 0
         AND status NOT IN ('lost', 'cancelled', 'closed', 'done')`,
    );
    const unpacked = await db.select<{ event_id: string }[]>(
      `SELECT DISTINCT event_id FROM styling_items WHERE packed = 0`,
    );
    const eventsWithUnpackedItems = new Set(unpacked.map((row) => row.event_id));

    const desired = new Map<string, { eventId: string; draft: ReminderDraft }>();
    for (const event of events) {
      for (const draft of draftsForEvent(event, settings, eventsWithUnpackedItems.has(event.id))) {
        desired.set(`${event.id}\u0000${draft.type}`, { eventId: event.id, draft });
      }
    }

    const managed = await db.select<ManagedReminderRow[]>(
      `SELECT id, type, event_id, scheduled_for, title, body
       FROM reminders
       WHERE type IN (${MANAGED_REMINDER_TYPES.map(() => "?").join(", ")})`,
      [...MANAGED_REMINDER_TYPES],
    );

    const reconciled = new Set<string>();
    for (const reminder of managed) {
      const key = `${reminder.event_id}\u0000${reminder.type}`;
      const match = desired.get(key);
      if (!match || reconciled.has(key)) {
        await db.execute("DELETE FROM reminders WHERE id = ?", [reminder.id]);
        continue;
      }

      const { draft } = match;
      const scheduleChanged = reminder.scheduled_for !== draft.scheduledFor;
      const resetDelivery = scheduleChanged
        ? ", fired_at = NULL, read_at = NULL, dismissed_at = NULL"
        : "";
      await db.execute(
        `UPDATE reminders
         SET scheduled_for = ?, title = ?, body = ?${resetDelivery}
         WHERE id = ?`,
        [draft.scheduledFor, draft.title, draft.body, reminder.id],
      );
      reconciled.add(key);
      desired.delete(key);
    }

    for (const { eventId, draft } of desired.values()) {
      await db.execute(
        `INSERT INTO reminders (id, type, event_id, scheduled_for, title, body)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [createId(), draft.type, eventId, draft.scheduledFor, draft.title, draft.body],
      );
    }
    await db.execute("COMMIT");
    return desired.size + reconciled.size;
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

class RemindersRepository extends BaseRepository<Reminder> {
  constructor() {
    super("reminders", false);
  }

  async generateFromRules(): Promise<number> {
    return generateRemindersFromRules(await getDb());
  }

  async claimForDelivery(id: string, firedAt: string): Promise<boolean> {
    return claimReminderForDelivery(await getDb(), id, firedAt);
  }

  async releaseDeliveryClaim(id: string, firedAt: string): Promise<void> {
    return releaseReminderDeliveryClaim(await getDb(), id, firedAt);
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

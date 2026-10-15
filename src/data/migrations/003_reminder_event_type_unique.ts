export default {
  name: "003_reminder_event_type_unique",
  statements: [
    `DELETE FROM reminders
     WHERE event_id IS NOT NULL
       AND rowid NOT IN (
         SELECT MIN(rowid)
         FROM reminders
         WHERE event_id IS NOT NULL
         GROUP BY event_id, type
       )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_event_type
     ON reminders(event_id, type)
     WHERE event_id IS NOT NULL
       AND type IN ('follow_up','deposit_due','balance_due','event_week','items_not_packed','wrap_up')`,
  ],
};

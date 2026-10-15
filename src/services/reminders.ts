import type { Reminder } from "../data/types";

interface DeliveryOptions {
  pending: Reminder[];
  now: string;
  isCancelled: () => boolean;
  requestPermission: () => Promise<boolean>;
  claim: (id: string, firedAt: string) => Promise<boolean>;
  release: (id: string, firedAt: string) => Promise<void>;
  notify: (notification: { title: string; body: string }) => void | Promise<void>;
}

/** Deliver due reminders after atomically claiming each database row. */
export async function deliverDueReminders({
  pending,
  now,
  isCancelled,
  requestPermission,
  claim,
  release,
  notify,
}: DeliveryOptions): Promise<number> {
  const due = pending.filter(
    (reminder) =>
      reminder.scheduled_for <= now &&
      !reminder.dismissed_at &&
      !reminder.fired_at,
  );
  if (due.length === 0 || isCancelled()) return 0;

  const permitted = await requestPermission();
  if (!permitted || isCancelled()) return 0;

  let delivered = 0;
  for (const reminder of due) {
    if (isCancelled()) break;
    const firedAt = new Date().toISOString();
    if (!(await claim(reminder.id, firedAt))) continue;

    if (isCancelled()) {
      await release(reminder.id, firedAt);
      break;
    }

    try {
      await notify({
        title: reminder.title || "Amora Events",
        body: reminder.body || "Reminder",
      });
      delivered += 1;
    } catch {
      await release(reminder.id, firedAt);
    }
  }
  return delivered;
}

import { addDays, format, isValid, parseISO } from "date-fns";
import type { EventStatus } from "../data/types";

export const EVENT_STATUSES: ReadonlyArray<{ value: EventStatus; label: string }> = [
  { value: "enquiry", label: "Enquiry" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "follow_up", label: "Follow up" },
  { value: "booked", label: "Booked" },
  { value: "planning", label: "Planning" },
  { value: "ready", label: "Ready" },
  { value: "done", label: "Completed" },
  { value: "wrap_up", label: "Wrap up" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
  { value: "cancelled", label: "Cancelled" },
];

export const EVENT_STATUS_LABELS = Object.fromEntries(
  EVENT_STATUSES.map(({ value, label }) => [value, label])
) as Record<EventStatus, string>;

export function localDateKey(date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function eventDateKeys(startDate: string, endDate?: string | null): string[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate || startDate);
  if (!isValid(start) || !isValid(end) || end < start) return [startDate];
  const keys: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) keys.push(localDateKey(day));
  return keys;
}

interface EventFormVisibility {
  startDate: string;
  endDate: string;
  multiDay: boolean;
  showTimes: boolean;
  setupTime: string;
  startTime: string;
  endTime: string;
  packdownTime: string;
}

type NormalizedEventForm =
  | { ok: false; error: string }
  | {
      ok: true;
      endDate: string | null;
      setupTime: string | null;
      startTime: string | null;
      endTime: string | null;
      packdownTime: string | null;
    };

export function normalizeEventForm(values: EventFormVisibility): NormalizedEventForm {
  if (values.multiDay && values.endDate && values.endDate < values.startDate) {
    return { ok: false, error: "End date cannot be before start date." };
  }
  return {
    ok: true,
    endDate: values.multiDay ? values.endDate || null : null,
    setupTime: values.showTimes ? values.setupTime || null : null,
    startTime: values.showTimes ? values.startTime || null : null,
    endTime: values.showTimes ? values.endTime || null : null,
    packdownTime: values.showTimes ? values.packdownTime || null : null,
  };
}

export function parseSettingList(value: string | null | undefined, fallback: readonly string[]): string[] {
  const items = value?.split(",").map((item) => item.trim()).filter(Boolean);
  return items?.length ? items : [...fallback];
}

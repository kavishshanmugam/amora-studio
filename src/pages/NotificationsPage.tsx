import { Bell, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { remindersRepo } from "../data";
import type { Reminder } from "../data";

function useUnreadReminders() {
  return useQuery({
    queryKey: ["reminders", "unread"],
    queryFn: () => remindersRepo.findUnread(),
  });
}

function usePendingReminders() {
  return useQuery({
    queryKey: ["reminders", "pending"],
    queryFn: () => remindersRepo.findPending(),
  });
}

function useDismissReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      remindersRepo.update(id, { dismissed_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      remindersRepo.update(id, { read_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function NotificationsPage() {
  const { data: unread = [] } = useUnreadReminders();
  const { data: pending = [] } = usePendingReminders();
  const dismiss = useDismissReminder();
  const markRead = useMarkRead();

  const hasContent = unread.length > 0 || pending.length > 0;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold mb-6">Notifications</h1>

      {!hasContent ? (
        <div className="bg-surface rounded-xl p-8 border border-border text-center">
          <Bell size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <p className="text-text-secondary">No notifications.</p>
          <p className="text-sm text-text-secondary/70 mt-1">
            Reminders will appear here when they're due.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-3">New</h2>
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                {unread.map((r) => (
                  <ReminderRow key={r.id} reminder={r} onDismiss={() => dismiss.mutate(r.id)} onRead={() => markRead.mutate(r.id)} />
                ))}
              </div>
            </section>
          )}
          {pending.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-3">Upcoming</h2>
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                {pending.map((r) => (
                  <ReminderRow key={r.id} reminder={r} onDismiss={() => dismiss.mutate(r.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ReminderRow({ reminder, onDismiss, onRead }: {
  reminder: Reminder; onDismiss: () => void; onRead?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <Bell size={16} className="text-brand shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{reminder.title}</p>
        {reminder.body && <p className="text-xs text-text-secondary mt-0.5">{reminder.body}</p>}
        <p className="text-[10px] text-text-secondary mt-1">{reminder.scheduled_for}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {onRead && (
          <button onClick={onRead} className="p-1.5 rounded hover:bg-bg text-text-secondary hover:text-success" title="Mark read">
            <Check size={14} />
          </button>
        )}
        <button onClick={onDismiss} className="p-1.5 rounded hover:bg-bg text-text-secondary hover:text-danger" title="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

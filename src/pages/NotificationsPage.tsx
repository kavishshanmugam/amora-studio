import { Bell, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Notifications</h1>
        {unread.length > 0 && (
          <button onClick={() => unread.forEach((r) => markRead.mutate(r.id))}
            className="text-xs text-brand hover:underline">Mark all read</button>
        )}
      </div>

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
  const navigate = useNavigate();
  const handleClick = () => {
    if (onRead) onRead();
    if (reminder.event_id) navigate(`/events/${reminder.event_id}`);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <Bell size={16} className="text-brand shrink-0" />
      <button onClick={handleClick} className="flex-1 min-w-0 text-left hover:bg-highlight/10 -m-1 p-1 rounded transition-colors">
        <p className="text-sm font-medium">{reminder.title}</p>
        {reminder.body && <p className="text-xs text-text-secondary mt-0.5">{reminder.body}</p>}
        <p className="text-[10px] text-text-secondary mt-1">{reminder.scheduled_for}</p>
      </button>
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

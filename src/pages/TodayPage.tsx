import { format, isToday, isTomorrow, isBefore, addDays } from "date-fns";
import { Sun, CalendarDays, AlertCircle, DollarSign, Clock } from "lucide-react";
import { useEvents, useUpcomingEvents } from "../hooks/use-events";
import { useContact } from "../hooks/use-contacts";
import type { AmoraEvent } from "../data";

const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-info/10 text-info",
  quote_sent: "bg-need/10 text-need",
  booked: "bg-success/10 text-success",
  planning: "bg-brand/10 text-brand",
  ready: "bg-success/15 text-success",
  done: "bg-bg text-text-secondary",
};

export function TodayPage() {
  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  const { data: allEvents = [] } = useEvents();
  const { data: upcoming = [] } = useUpcomingEvents(7);

  // Today's and tomorrow's events
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");
  const todayEvents = allEvents.filter((e) => e.start_date === todayStr && !e.deleted_at);
  const tomorrowEvents = allEvents.filter((e) => e.start_date === tomorrowStr && !e.deleted_at);

  // Needs action
  const followUps = allEvents.filter(
    (e) => e.follow_up_date && e.follow_up_date <= todayStr && e.status === "enquiry" && !e.deleted_at
  );
  const quotesPending = allEvents.filter(
    (e) => e.status === "quote_sent" && e.quote_sent_date &&
      isBefore(new Date(e.quote_sent_date), addDays(today, -5)) && !e.deleted_at
  );
  const depositsOverdue = allEvents.filter(
    (e) => e.deposit_due_date && e.deposit_due_date < todayStr && e.status === "booked" && !e.deleted_at
  );

  const needsAction = [...followUps, ...quotesPending, ...depositsOverdue];

  // This month stats
  const monthStart = format(today, "yyyy-MM-01");
  const monthEnd = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");
  const thisMonthBooked = allEvents.filter(
    (e) => e.start_date >= monthStart && e.start_date <= monthEnd &&
      ["booked", "planning", "ready", "done"].includes(e.status) && !e.deleted_at
  );

  const hasContent = todayEvents.length > 0 || tomorrowEvents.length > 0 || needsAction.length > 0 || upcoming.length > 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl font-bold text-text-primary">{greeting}</h1>
        <p className="text-text-secondary mt-1">{format(today, "EEEE d MMMM yyyy")}</p>
      </div>

      {!hasContent ? (
        <div className="bg-surface rounded-xl p-8 border border-border text-center">
          <Sun size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <p className="text-text-secondary">All caught up.</p>
          <p className="text-sm text-text-secondary/70 mt-1">
            Create your first enquiry to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Today's events */}
          {todayEvents.length > 0 && (
            <DashSection title="Today" icon={<CalendarDays size={16} />}>
              {todayEvents.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </DashSection>
          )}

          {/* Tomorrow */}
          {tomorrowEvents.length > 0 && (
            <DashSection title="Tomorrow" icon={<Clock size={16} />}>
              {tomorrowEvents.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </DashSection>
          )}

          {/* Needs action */}
          {needsAction.length > 0 && (
            <DashSection title="Needs action" icon={<AlertCircle size={16} />}>
              {followUps.map((e) => (
                <ActionRow key={e.id} event={e} reason="Follow-up due" />
              ))}
              {quotesPending.map((e) => (
                <ActionRow key={e.id} event={e} reason="Quote awaiting reply" />
              ))}
              {depositsOverdue.map((e) => (
                <ActionRow key={e.id} event={e} reason="Deposit overdue" />
              ))}
            </DashSection>
          )}

          {/* Upcoming this week */}
          {upcoming.length > 0 && (
            <DashSection title="Coming up" icon={<CalendarDays size={16} />}>
              {upcoming.filter((e) => e.start_date !== todayStr && e.start_date !== tomorrowStr).map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </DashSection>
          )}

          {/* This month */}
          <DashSection title="This month" icon={<DollarSign size={16} />}>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Jobs booked" value={String(thisMonthBooked.length)} />
              <StatCard label="Upcoming this week" value={String(upcoming.length)} />
            </div>
          </DashSection>
        </>
      )}
    </div>
  );
}

function DashSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-secondary">{icon}</span>
        <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium">{title}</h2>
      </div>
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function EventRow({ event }: { event: AmoraEvent }) {
  const { data: client } = useContact(event.client_id);

  let dateLabel = event.start_date;
  try {
    const d = new Date(event.start_date + "T00:00:00");
    if (isToday(d)) dateLabel = "Today";
    else if (isTomorrow(d)) dateLabel = "Tomorrow";
    else dateLabel = format(d, "EEE d MMM");
  } catch { /* keep raw */ }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: event.colour || "#7A1F2B" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.name}</p>
        <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
          <span>{dateLabel}</span>
          {event.start_time && <span>· {event.start_time}</span>}
          {client && <span>· {client.name}</span>}
        </div>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[event.status] ?? "bg-bg text-text-secondary"}`}>
        {event.status.replace(/_/g, " ")}
      </span>
    </div>
  );
}

function ActionRow({ event, reason }: { event: AmoraEvent; reason: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <AlertCircle size={16} className="text-need shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.name}</p>
        <p className="text-xs text-need">{reason}</p>
      </div>
      <span className="text-xs text-text-secondary font-mono">{event.reference}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
}

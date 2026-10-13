import { format, isToday, isTomorrow, isBefore, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sun, CalendarDays, AlertCircle, DollarSign, Clock, CheckSquare, Package } from "lucide-react";
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

  // Checklist items due today or overdue (for booked/planning events)
  const activeEvents = allEvents.filter((e) => ["booked", "planning", "ready"].includes(e.status) && !e.deleted_at);
  const checklistDue = useQuery({
    queryKey: ["checklist-due-today", todayStr],
    queryFn: async () => {
      if (activeEvents.length === 0) return [];
      const { getDb } = await import("../data");
      const db = await getDb();
      const placeholders = activeEvents.map(() => "?").join(",");
      return db.select<{ event_id: string; task: string; due_date: string }[]>(
        `SELECT ci.event_id, ci.task, ci.due_date FROM checklist_items ci
         WHERE ci.event_id IN (${placeholders}) AND ci.is_done = 0 AND ci.due_date IS NOT NULL AND ci.due_date <= ?
         ORDER BY ci.due_date LIMIT 10`,
        [...activeEvents.map((e) => e.id), todayStr]
      );
    },
    enabled: activeEvents.length > 0,
  });

  // Styling items still "need" for upcoming events (next 14 days)
  const soonEvents = allEvents.filter(
    (e) => e.start_date >= todayStr && e.start_date <= format(addDays(today, 14), "yyyy-MM-dd") &&
      ["booked", "planning", "ready"].includes(e.status) && !e.deleted_at
  );
  const stylingNeeded = useQuery({
    queryKey: ["styling-needed", todayStr],
    queryFn: async () => {
      if (soonEvents.length === 0) return [];
      const { getDb } = await import("../data");
      const db = await getDb();
      const placeholders = soonEvents.map(() => "?").join(",");
      return db.select<{ event_id: string; count: number }[]>(
        `SELECT event_id, COUNT(*) as count FROM styling_items
         WHERE event_id IN (${placeholders}) AND status = 'need'
         GROUP BY event_id`,
        soonEvents.map((e) => e.id)
      );
    },
    enabled: soonEvents.length > 0,
  });

  const needsAction = [...followUps, ...quotesPending, ...depositsOverdue];
  const checklistItems = checklistDue.data ?? [];
  const stylingItems = stylingNeeded.data ?? [];

  // This month stats
  const monthStart = format(today, "yyyy-MM-01");
  const monthEnd = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");
  const thisMonthBooked = allEvents.filter(
    (e) => e.start_date >= monthStart && e.start_date <= monthEnd &&
      ["booked", "planning", "ready", "done"].includes(e.status) && !e.deleted_at
  );

  // Financial stats
  const financialStats = useQuery({
    queryKey: ["today-financials", monthStart, monthEnd],
    queryFn: async () => {
      const { getDb } = await import("../data");
      const db = await getDb();
      // Revenue = total price of booked events this month
      const bookedIds = thisMonthBooked.map((e) => e.id);
      if (bookedIds.length === 0) return { revenue: 0, received: 0, outstanding: 0 };
      const placeholders = bookedIds.map(() => "?").join(",");
      const [revRows, paidRows] = await Promise.all([
        db.select<{ total: number }[]>(
          `SELECT COALESCE(SUM(CASE WHEN price_override_cents IS NOT NULL THEN price_override_cents
            ELSE (SELECT COALESCE(SUM(quantity * unit_price_cents - line_discount_cents), 0) FROM quote_lines WHERE event_id = e.id) - e.quote_discount_cents END), 0) as total
           FROM events e WHERE e.id IN (${placeholders})`,
          bookedIds
        ),
        db.select<{ total: number }[]>(
          `SELECT COALESCE(SUM(p.amount_cents), 0) as total FROM payments p
           WHERE p.event_id IN (${placeholders})`,
          bookedIds
        ),
      ]);
      const revenue = revRows[0]?.total ?? 0;
      const received = paidRows[0]?.total ?? 0;
      return { revenue, received, outstanding: revenue - received };
    },
  });

  const stats = financialStats.data ?? { revenue: 0, received: 0, outstanding: 0 };
  const hasContent = todayEvents.length > 0 || tomorrowEvents.length > 0 || needsAction.length > 0 || upcoming.length > 0 || checklistItems.length > 0 || stylingItems.length > 0;

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

          {/* Checklist items due */}
          {checklistItems.length > 0 && (
            <DashSection title="Checklist due" icon={<CheckSquare size={16} />}>
              {checklistItems.map((ci, i) => {
                const ev = allEvents.find((e) => e.id === ci.event_id);
                return (
                  <ActionRow key={`cl-${i}`} event={ev!} reason={`${ci.task}${ci.due_date < todayStr ? " (overdue)" : ""}`} />
                );
              }).filter(Boolean)}
            </DashSection>
          )}

          {/* Styling items needed */}
          {stylingItems.length > 0 && (
            <DashSection title="Items to source" icon={<Package size={16} />}>
              {stylingItems.map((si) => {
                const ev = soonEvents.find((e) => e.id === si.event_id);
                return ev ? (
                  <ActionRow key={`st-${si.event_id}`} event={ev} reason={`${si.count} item${si.count > 1 ? "s" : ""} still needed`} />
                ) : null;
              })}
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
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Jobs booked" value={String(thisMonthBooked.length)} />
              <StatCard label="Revenue" value={stats.revenue > 0 ? `$${(stats.revenue / 100).toLocaleString("en-AU", { minimumFractionDigits: 0 })}` : "—"} />
              <StatCard label="Received" value={stats.received > 0 ? `$${(stats.received / 100).toLocaleString("en-AU", { minimumFractionDigits: 0 })}` : "—"} />
              <StatCard label="Outstanding" value={stats.outstanding > 0 ? `$${(stats.outstanding / 100).toLocaleString("en-AU", { minimumFractionDigits: 0 })}` : "—"} />
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
  const navigate = useNavigate();
  const { data: client } = useContact(event.client_id);

  let dateLabel = event.start_date;
  try {
    const d = new Date(event.start_date + "T00:00:00");
    if (isToday(d)) dateLabel = "Today";
    else if (isTomorrow(d)) dateLabel = "Tomorrow";
    else dateLabel = format(d, "EEE d MMM");
  } catch { /* keep raw */ }

  return (
    <button onClick={() => navigate(`/events/${event.id}`)} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 w-full text-left hover:bg-highlight/20 transition-colors">
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
    </button>
  );
}

function ActionRow({ event, reason }: { event: AmoraEvent; reason: string }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(`/events/${event.id}`)} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 w-full text-left hover:bg-highlight/20 transition-colors">
      <AlertCircle size={16} className="text-need shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.name}</p>
        <p className="text-xs text-need">{reason}</p>
      </div>
      <span className="text-xs text-text-secondary font-mono">{event.reference}</span>
    </button>
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

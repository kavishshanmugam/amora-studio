import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CalendarDays, User, MapPin, Phone, Mail, Instagram,
  Copy, Trash2, BellOff, Bell, MoreHorizontal, Clock, Users, Table2,
  Tag, FileText, Banknote,
} from "lucide-react";
import { useEvent, useUpdateEvent, useDeleteEvent, useCreateEvent } from "../hooks/use-events";
import { useContact } from "../hooks/use-contacts";
import { useActivityLog } from "../hooks/use-activity-log";
import type { AmoraEvent, EventStatus, ActivityLog } from "../data";
import { quoteLinesRepo, paymentsRepo, expensesRepo, eventsRepo } from "../data";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { QuotePaymentsTab } from "../components/event-tabs/QuotePaymentsTab";
import { ChecklistTab } from "../components/event-tabs/ChecklistTab";
import { ContactsTab } from "../components/event-tabs/ContactsTab";
import { StylingTab } from "../components/event-tabs/StylingTab";
import { LogisticsTab } from "../components/event-tabs/LogisticsTab";
import { MoodboardTab } from "../components/event-tabs/MoodboardTab";
import { PhotosTab } from "../components/event-tabs/PhotosTab";
import { printDaySheet } from "../components/event-tabs/DaySheet";
import { printQuote } from "../components/event-tabs/PrintQuote";

// ponytail: single-page event detail, tabs added as M6+ build out
const EVENT_TABS = [
  "Overview", "Quote & payments", "Moodboard", "Styling", "Checklist", "Logistics", "Contacts", "Photos & Instagram",
] as const;
type EventTab = (typeof EVENT_TABS)[number];

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "enquiry", label: "Enquiry" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "follow_up", label: "Follow up" },
  { value: "booked", label: "Booked" },
  { value: "planning", label: "Planning" },
  { value: "ready", label: "Ready" },
  { value: "done", label: "Completed" },
  { value: "wrap_up", label: "Wrap up" },
  { value: "lost", label: "Lost" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-info/10 text-info border-info/30",
  quote_sent: "bg-need/10 text-need border-need/30",
  follow_up: "bg-need/10 text-need border-need/30",
  booked: "bg-success/10 text-success border-success/30",
  planning: "bg-brand/10 text-brand border-brand/30",
  ready: "bg-success/15 text-success border-success/30",
  done: "bg-bg text-text-secondary border-border",
  wrap_up: "bg-bg text-text-secondary border-border",
  lost: "bg-danger/10 text-danger border-danger/30",
  cancelled: "bg-danger/10 text-danger border-danger/30",
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<EventTab>("Overview");
  const [showMenu, setShowMenu] = useState(false);

  const { data: event, isLoading } = useEvent(id ?? null);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const createEvent = useCreateEvent();
  const tabCounts = useTabCounts(id ?? null);

  if (isLoading) return <div className="p-8 text-text-secondary">Loading...</div>;
  if (!event) return <div className="p-8 text-text-secondary">Event not found.</div>;

  const handleStatusChange = (status: EventStatus) => {
    updateEvent.mutate({ id: event.id, data: { status } });
  };

  const handleDelete = () => {
    if (confirm("Move this event to trash?")) {
      deleteEvent.mutate(event.id);
      navigate("/events");
    }
  };

  const handleMuteToggle = () => {
    updateEvent.mutate({ id: event.id, data: { reminders_muted: event.reminders_muted ? 0 : 1 } });
  };

  const handleDuplicate = async () => {
    const newName = `${event.name} (copy)`;
    const ref = await eventsRepo.nextReference();
    // Copy most fields, reset client/dates/payments
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = event;
    const result = await createEvent.mutateAsync({
      ...rest,
      reference: ref,
      name: newName,
      status: "enquiry" as const,
      client_id: null,
      folder_path: `/events/${event.start_date} ${newName} (${ref})`,
      price_override_cents: null,
      quote_discount_cents: 0,
      quote_sent_date: null,
      quote_valid_until: null,
      quote_notes: null,
      deposit_cents: null,
      deposit_due_date: null,
      balance_due_date: null,
      bond_received_date: null,
      bond_returned_date: null,
      bond_notes: null,
      contract_signed_date: null,
      follow_up_date: null,
      reminders_muted: 0,
      lost_reason: null,
      cancel_reason: null,
    });
    navigate(`/events/${result.id}`);
  };

  return (
    <div className="max-w-5xl h-full flex flex-col">
      {/* Back link */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-3 w-fit">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <EventHeader
        event={event}
        onStatusChange={handleStatusChange}
        showMenu={showMenu}
        onToggleMenu={() => setShowMenu(!showMenu)}
        onDelete={handleDelete}
        onMuteToggle={handleMuteToggle}
        onDuplicate={handleDuplicate}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mt-4 mb-4 overflow-x-auto">
        {EVENT_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t
                ? "border-brand text-brand font-medium"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {t}
            {tabCounts[t] !== undefined && (
              <span className="ml-1.5 text-[10px] text-text-secondary">{tabCounts[t]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "Overview" && <OverviewTab event={event} />}
        {tab === "Quote & payments" && <QuotePaymentsTab event={event} />}
        {tab === "Styling" && <StylingTab event={event} />}
        {tab === "Checklist" && <ChecklistTab event={event} />}
        {tab === "Logistics" && <LogisticsTab event={event} />}
        {tab === "Contacts" && <ContactsTab event={event} />}
        {tab === "Moodboard" && <MoodboardTab event={event} />}
        {tab === "Photos & Instagram" && <PhotosTab event={event} />}
      </div>
    </div>
  );
}

function EventHeader({ event, onStatusChange, showMenu, onToggleMenu, onDelete, onMuteToggle, onDuplicate }: {
  event: AmoraEvent;
  onStatusChange: (s: EventStatus) => void;
  showMenu: boolean;
  onToggleMenu: () => void;
  onDelete: () => void;
  onMuteToggle: () => void;
  onDuplicate: () => void;
}) {
  const { data: client } = useContact(event.client_id);
  const navigate = useNavigate();

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-start gap-4">
        {/* Colour bar */}
        <div className="w-1.5 h-16 rounded-full shrink-0 mt-1" style={{ backgroundColor: event.colour || "#7A1F2B" }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl font-bold truncate">{event.name}</h1>
            <span className="text-sm font-mono text-text-secondary">{event.reference}</span>
          </div>

          {/* Status + type + client row */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={event.status}
              onChange={(e) => onStatusChange(e.target.value as EventStatus)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium border cursor-pointer outline-none ${STATUS_COLORS[event.status] ?? "bg-bg text-text-secondary border-border"}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {event.event_type && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Tag size={12} /> {event.event_type}
              </span>
            )}

            {event.palette && (
              <div className="flex gap-1">
                {event.palette.split(",").map((c, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c.trim() }} />
                ))}
              </div>
            )}
          </div>

          {/* Client info */}
          {client && (
            <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
              <span className="flex items-center gap-1 font-medium text-text-primary">
                <User size={14} /> {client.name}
              </span>
              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-brand">
                  <Phone size={12} /> {client.phone}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-brand">
                  <Mail size={12} /> {client.email}
                </a>
              )}
              {client.instagram_handle && (
                <span className="flex items-center gap-1">
                  <Instagram size={12} /> @{client.instagram_handle}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => navigate("/events", { state: { editId: event.id } })} className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-bg">
            Edit
          </button>
          <div className="relative">
            <button onClick={onToggleMenu} className="p-2 rounded-lg hover:bg-bg text-text-secondary">
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg py-1 z-10 min-w-[180px]">
                <MenuButton icon={<FileText size={14} />} label="Print day sheet" onClick={() => { printDaySheet(event); onToggleMenu(); }} />
                <MenuButton icon={<Banknote size={14} />} label="Print quote" onClick={() => { printQuote(event); onToggleMenu(); }} />
                <div className="border-t border-border my-1" />
                <MenuButton icon={<Copy size={14} />} label="Duplicate job" onClick={() => { onDuplicate(); onToggleMenu(); }} />
                <MenuButton icon={event.reminders_muted ? <Bell size={14} /> : <BellOff size={14} />}
                  label={event.reminders_muted ? "Unmute reminders" : "Mute reminders"}
                  onClick={() => { onMuteToggle(); onToggleMenu(); }} />
                <div className="border-t border-border my-1" />
                <MenuButton icon={<Trash2 size={14} />} label="Delete" onClick={() => { onDelete(); onToggleMenu(); }} danger />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuButton({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg ${danger ? "text-danger" : "text-text-primary"}`}
    >
      {icon} {label}
    </button>
  );
}

// --- Tab Counts ---

function useTabCounts(eventId: string | null): Partial<Record<EventTab, string>> {
  const { data } = useQuery({
    queryKey: ["tab-counts", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      if (!eventId) return {};
      const { getDb } = await import("../data");
      const db = await getDb();
      const [styling, checklist, checklistDone] = await Promise.all([
        db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM styling_items WHERE event_id = ?", [eventId]),
        db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM checklist_items WHERE event_id = ?", [eventId]),
        db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM checklist_items WHERE event_id = ? AND is_done = 1", [eventId]),
      ]);
      const s = styling[0]?.c ?? 0;
      const ct = checklist[0]?.c ?? 0;
      const cd = checklistDone[0]?.c ?? 0;
      const result: Partial<Record<EventTab, string>> = {};
      if (s > 0) result["Styling"] = String(s);
      if (ct > 0) result["Checklist"] = `${cd}/${ct}`;
      return result;
    },
  });
  return data ?? {};
}

// --- Overview Tab ---

function OverviewTab({ event }: { event: AmoraEvent }) {
  const { data: client } = useContact(event.client_id);
  const { data: activities = [] } = useActivityLog(event.id);

  const { data: quoteTotal = 0 } = useQuery({
    queryKey: ["quote-total", event.id],
    queryFn: () => quoteLinesRepo.subtotalForEvent(event.id),
  });
  const { data: paidTotal = 0 } = useQuery({
    queryKey: ["paid-total", event.id],
    queryFn: () => paymentsRepo.totalForEvent(event.id),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", event.id],
    queryFn: () => expensesRepo.findByEvent(event.id),
  });

  const price = event.price_override_cents ?? (quoteTotal - event.quote_discount_cents);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const profit = price - expenseTotal;
  const owing = price - paidTotal;

  let dateStr = "";
  try {
    dateStr = format(new Date(event.start_date + "T00:00:00"), "EEEE d MMMM yyyy");
    if (event.end_date) dateStr += ` — ${format(new Date(event.end_date + "T00:00:00"), "EEEE d MMMM yyyy")}`;
  } catch {
    dateStr = event.start_date;
  }

  const timeStr = [
    event.setup_time && `Setup ${event.setup_time}`,
    event.start_time && `Start ${event.start_time}`,
    event.end_time && `End ${event.end_time}`,
    event.packdown_time && `Pack-down ${event.packdown_time}`,
  ].filter(Boolean).join(" · ");

  const fmtCents = (cents: number) => `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Left column: detail cards */}
      <div className="col-span-2 space-y-3">
        {/* Date & Time */}
        <DetailCard icon={<CalendarDays size={14} />} label="DATE" value={dateStr} />
        {timeStr && <DetailCard icon={<Clock size={14} />} label="TIMES" value={timeStr} />}

        {/* Venue */}
        {event.venue_id && <VenueCard venueId={event.venue_id} area={event.venue_area} indoor={event.indoor_outdoor} />}

        {/* Client */}
        {client && (
          <DetailCard icon={<User size={14} />} label="CLIENT">
            <p className="text-sm font-medium">{client.name}</p>
            <div className="flex gap-3 mt-1 text-xs text-text-secondary">
              {client.phone && <span>{client.phone}</span>}
              {client.email && <span>{client.email}</span>}
              {client.instagram_handle && <span>@{client.instagram_handle}</span>}
            </div>
          </DetailCard>
        )}

        {/* Event type & theme */}
        {(event.event_type || event.theme) && (
          <DetailCard icon={<Tag size={14} />} label="EVENT TYPE & THEME"
            value={[event.event_type, event.theme].filter(Boolean).join(" — ")} />
        )}

        {/* Guests & tables */}
        {(event.guest_count || event.table_count) && (
          <div className="flex gap-3">
            {event.guest_count != null && <DetailCard icon={<Users size={14} />} label="GUESTS" value={String(event.guest_count)} />}
            {event.table_count != null && <DetailCard icon={<Table2 size={14} />} label="TABLES" value={String(event.table_count)} />}
          </div>
        )}

        {/* Lead source */}
        {event.lead_source && <DetailCard icon={<Tag size={14} />} label="LEAD SOURCE" value={event.lead_source} />}

        {/* Notes */}
        {event.notes && <DetailCard icon={<FileText size={14} />} label="NOTES" value={event.notes} />}

        {/* Activity log */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-3">Activity</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-text-secondary">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {activities.slice(0, 10).map((a: ActivityLog) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p>{a.summary}</p>
                    <p className="text-[10px] text-text-secondary">{formatTimestamp(a.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right column: at-a-glance */}
      <div className="space-y-3">
        <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium">At a glance</h3>
          <GlanceRow icon={<Banknote size={14} />} label="Quote total" value={price > 0 ? fmtCents(price) : "—"} />
          <GlanceRow icon={<Banknote size={14} />} label="Paid" value={paidTotal > 0 ? fmtCents(paidTotal) : "—"} color="text-success" />
          <GlanceRow icon={<Banknote size={14} />} label="Owing" value={owing > 0 ? fmtCents(owing) : "—"} color={owing > 0 ? "text-danger" : undefined} />
          <div className="border-t border-border" />
          <GlanceRow icon={<Banknote size={14} />} label="Expenses" value={expenseTotal > 0 ? fmtCents(expenseTotal) : "—"} />
          <GlanceRow icon={<Banknote size={14} />} label="Profit" value={price > 0 ? fmtCents(profit) : "—"}
            color={profit > 0 ? "text-success" : profit < 0 ? "text-danger" : undefined} />
          {price > 0 && (
            <p className="text-[10px] text-text-secondary text-right">
              {Math.round((profit / price) * 100)}% margin
            </p>
          )}
        </div>

        {/* Quick dates */}
        <div className="bg-surface rounded-xl border border-border p-4 space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-1">Key dates</h3>
          <DateRow label="Enquiry" date={event.enquiry_date} />
          <DateRow label="Follow-up" date={event.follow_up_date} />
          <DateRow label="Quote sent" date={event.quote_sent_date} />
          <DateRow label="Contract signed" date={event.contract_signed_date} />
          <DateRow label="Deposit due" date={event.deposit_due_date} />
          <DateRow label="Balance due" date={event.balance_due_date} />
        </div>
      </div>
    </div>
  );
}

function VenueCard({ venueId, area, indoor }: { venueId: string; area: string | null; indoor: string | null }) {
  // ponytail: inline query, no separate hook needed for one usage
  const { data: venue } = useQuery({
    queryKey: ["venue-detail", venueId],
    queryFn: async () => {
      const { venuesRepo } = await import("../data");
      return venuesRepo.findById(venueId);
    },
    enabled: !!venueId,
  });

  if (!venue) return null;

  return (
    <DetailCard icon={<MapPin size={14} />} label="VENUE">
      <p className="text-sm font-medium">{venue.name}</p>
      {venue.address && <p className="text-xs text-text-secondary mt-0.5">{venue.address}</p>}
      <div className="flex gap-3 mt-1 text-xs text-text-secondary">
        {area && <span>{area}</span>}
        {indoor && <span className="capitalize">{indoor}</span>}
      </div>
    </DetailCard>
  );
}

function DetailCard({ icon, label, value, children }: {
  icon: React.ReactNode; label: string; value?: string; children?: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-text-secondary">{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">{label}</span>
      </div>
      {value && <p className="text-sm">{value}</p>}
      {children}
    </div>
  );
}

function GlanceRow({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-text-secondary">
        {icon} {label}
      </span>
      <span className={`font-medium ${color ?? ""}`}>{value}</span>
    </div>
  );
}

function DateRow({ label, date }: { label: string; date: string | null | undefined }) {
  if (!date) return null;
  let formatted = date;
  try { formatted = format(new Date(date + "T00:00:00"), "d MMM yyyy"); } catch { /* use raw */ }
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-secondary">{label}</span>
      <span>{formatted}</span>
    </div>
  );
}

function formatTimestamp(ts: string): string {
  try { return format(new Date(ts), "d MMM yyyy, h:mm a"); } catch { return ts; }
}

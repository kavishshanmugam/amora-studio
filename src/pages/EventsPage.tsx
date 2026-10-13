import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PartyPopper, Plus, Search, CalendarDays, User, ChevronRight, List, LayoutGrid, Copy, Trash2 } from "lucide-react";
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, useNextReference } from "../hooks/use-events";
import { useContact } from "../hooks/use-contacts";
import type { AmoraEvent, EventStatus } from "../data";
import { ContactLookup } from "../components/shared/ContactLookup";
import { format } from "date-fns";

const STATUSES: { key: EventStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "enquiry", label: "Enquiry" },
  { key: "quote_sent", label: "Quote sent" },
  { key: "booked", label: "Booked" },
  { key: "planning", label: "Planning" },
  { key: "ready", label: "Ready" },
  { key: "done", label: "Completed" },
  { key: "lost", label: "Lost" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-info/10 text-info",
  quote_sent: "bg-need/10 text-need",
  follow_up: "bg-need/10 text-need",
  booked: "bg-success/10 text-success",
  planning: "bg-brand/10 text-brand",
  ready: "bg-success/15 text-success",
  done: "bg-bg text-text-secondary",
  wrap_up: "bg-bg text-text-secondary",
  closed: "bg-bg text-text-secondary",
  lost: "bg-danger/10 text-danger",
  cancelled: "bg-danger/10 text-danger",
};

const STATUS_LABELS: Record<string, string> = {
  enquiry: "Enquiry",
  quote_sent: "Quote sent",
  follow_up: "Follow up",
  booked: "Booked",
  planning: "Planning",
  ready: "Ready",
  done: "Completed",
  wrap_up: "Wrap up",
  closed: "Closed",
  lost: "Lost",
  cancelled: "Cancelled",
};

const EVENT_TYPES = [
  "Wedding", "Engagement", "Birthday", "Baby shower", "Bridal shower",
  "Christening/Baptism", "Gender reveal", "Proposal", "Corporate", "Other",
];

const LEAD_SOURCES = [
  "Instagram", "Referral", "Repeat client", "Google", "Website", "Facebook", "Wedding expo", "Other",
];

export function EventsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<"list" | "board">("list");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Handle edit navigation from EventDetailPage
  useEffect(() => {
    const state = location.state as { editId?: string; newEnquiry?: boolean } | null;
    if (state?.editId) {
      setEditingId(state.editId);
      setShowForm(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (state?.newEnquiry) {
      setShowForm(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const { data: events = [], isLoading } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const { data: nextRef } = useNextReference();

  const filtered = events.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.reference.toLowerCase().includes(q) ||
        e.event_type?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort: upcoming by date, past newest first
  const sorted = [...filtered].sort((a, b) => {
    const now = new Date().toISOString().slice(0, 10);
    const aFuture = a.start_date >= now;
    const bFuture = b.start_date >= now;
    if (aFuture && bFuture) return a.start_date.localeCompare(b.start_date);
    if (!aFuture && !bFuture) return b.start_date.localeCompare(a.start_date);
    return aFuture ? -1 : 1;
  });

  const handleCreate = async (data: EventFormData) => {
    const ref = nextRef ?? `AE-${new Date().getFullYear()}-001`;
    const folderPath = `/events/${data.start_date} ${data.name} (${ref})`;
    const result = await createEvent.mutateAsync({
      reference: ref,
      name: data.name,
      status: "enquiry",
      lost_reason: null,
      cancel_reason: null,
      event_type: data.event_type || null,
      theme: data.theme || null,
      palette: null,
      description: data.description || null,
      colour: null,
      start_date: data.start_date,
      end_date: data.end_date || null,
      setup_time: data.setup_time || null,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      packdown_time: data.packdown_time || null,
      access_from: null,
      access_until: null,
      venue_id: data.venue_id || null,
      venue_area: data.venue_area || null,
      indoor_outdoor: data.indoor_outdoor || null,
      client_id: data.client_id || null,
      guest_count: data.guest_count ? parseInt(data.guest_count) : null,
      table_count: data.table_count ? parseInt(data.table_count) : null,
      lead_source: data.lead_source || null,
      referred_by: data.referred_by || null,
      enquiry_date: new Date().toISOString().slice(0, 10),
      follow_up_date: data.follow_up_date || null,
      quote_sent_date: null,
      quote_valid_until: null,
      quote_discount_cents: 0,
      quote_notes: null,
      price_override_cents: null,
      deposit_cents: null,
      deposit_due_date: null,
      balance_due_date: null,
      bond_cents: null,
      bond_received_date: null,
      bond_returned_date: null,
      bond_notes: null,
      contract_signed_date: null,
      travel_km: data.travel_km ? parseFloat(data.travel_km) : null,
      travel_notes: null,
      notes: data.notes || null,
      reminders_muted: 0,
      folder_path: folderPath,
      deleted_at: null,
    });
    setShowForm(false);
    if (result?.id) navigate(`/events/${result.id}`);
  };

  const handleUpdate = async (data: EventFormData) => {
    if (!editingId) return;
    await updateEvent.mutateAsync({
      id: editingId,
      data: {
        name: data.name,
        event_type: data.event_type || null,
        theme: data.theme || null,
        description: data.description || null,
        start_date: data.start_date,
        end_date: data.end_date || null,
        setup_time: data.setup_time || null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        packdown_time: data.packdown_time || null,
        venue_id: data.venue_id || null,
        venue_area: data.venue_area || null,
        indoor_outdoor: data.indoor_outdoor || null,
        client_id: data.client_id || null,
        guest_count: data.guest_count ? parseInt(data.guest_count) : null,
        table_count: data.table_count ? parseInt(data.table_count) : null,
        lead_source: data.lead_source || null,
        referred_by: data.referred_by || null,
        follow_up_date: data.follow_up_date || null,
        travel_km: data.travel_km ? parseFloat(data.travel_km) : null,
        notes: data.notes || null,
      },
    });
    setEditingId(null);
  };

  const handleDuplicate = async (event: AmoraEvent) => {
    const ref = nextRef ?? `AE-${new Date().getFullYear()}-001`;
    const newName = `${event.name} (copy)`;
    const folderPath = `/events/${event.start_date} ${newName} (${ref})`;
    await createEvent.mutateAsync({
      reference: ref,
      name: newName,
      status: "enquiry",
      lost_reason: null,
      cancel_reason: null,
      event_type: event.event_type,
      theme: event.theme,
      palette: event.palette,
      description: event.description,
      colour: event.colour,
      start_date: event.start_date,
      end_date: event.end_date,
      setup_time: event.setup_time,
      start_time: event.start_time,
      end_time: event.end_time,
      packdown_time: event.packdown_time,
      access_from: event.access_from,
      access_until: event.access_until,
      venue_id: event.venue_id,
      venue_area: event.venue_area,
      indoor_outdoor: event.indoor_outdoor,
      client_id: event.client_id,
      guest_count: event.guest_count,
      table_count: event.table_count,
      lead_source: event.lead_source,
      referred_by: event.referred_by,
      enquiry_date: new Date().toISOString().slice(0, 10),
      follow_up_date: null,
      quote_sent_date: null,
      quote_valid_until: null,
      quote_discount_cents: 0,
      quote_notes: null,
      price_override_cents: null,
      deposit_cents: null,
      deposit_due_date: null,
      balance_due_date: null,
      bond_cents: null,
      bond_received_date: null,
      bond_returned_date: null,
      bond_notes: null,
      contract_signed_date: null,
      travel_km: event.travel_km,
      travel_notes: event.travel_notes,
      notes: event.notes,
      reminders_muted: 0,
      folder_path: folderPath,
      deleted_at: null,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Move this event to trash?")) deleteEvent.mutate(id);
  };

  return (
    <div className="max-w-5xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-3xl font-bold">Events</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-bg rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-surface shadow-sm text-text-primary" : "text-text-secondary"}`}
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView("board")}
              className={`p-1.5 rounded-md transition-colors ${view === "board" ? "bg-surface shadow-sm text-text-primary" : "text-text-secondary"}`}
              title="Board view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); }}
            className="flex items-center gap-2 bg-text-primary text-white rounded-full py-2 px-5 text-sm font-medium hover:bg-brand transition-colors"
          >
            <Plus size={16} />
            New enquiry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 bg-bg rounded-lg p-1 overflow-x-auto">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                statusFilter === s.key
                  ? "bg-surface text-text-primary font-medium shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand bg-surface"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {view === "list" ? (
          <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="p-8 text-center text-text-secondary">Loading...</div>
            ) : sorted.length === 0 ? (
              <div className="p-8 text-center">
                <PartyPopper size={48} className="mx-auto text-text-secondary/30 mb-4" />
                <p className="text-text-secondary">
                  {search || statusFilter !== "all" ? "No events match." : "No events yet."}
                </p>
                {!search && statusFilter === "all" && (
                  <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-brand hover:underline">
                    Create your first enquiry
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                {sorted.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => navigate(`/events/${event.id}`)}
                    onDuplicate={() => handleDuplicate(event)}
                    onDelete={() => handleDelete(event.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <PipelineBoard
            events={filtered}
            onEdit={(id) => setEditingId(id)}
            onStatusChange={(id, status) => updateEvent.mutate({ id, data: { status } })}
          />
        )}

        {/* Side sheet */}
        {(showForm || editingId) && (
          <div className="w-96 bg-surface rounded-xl border border-border p-5 overflow-y-auto shrink-0">
            <EventForm
              event={editingId ? events.find((e) => e.id === editingId) : undefined}
              onSave={editingId ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingId(null); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, onClick, onDuplicate, onDelete }: {
  event: AmoraEvent;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { data: client } = useContact(event.client_id);

  let dateStr = "";
  try {
    dateStr = format(new Date(event.start_date + "T00:00:00"), "EEE d MMM yyyy");
  } catch {
    dateStr = event.start_date;
  }

  return (
    <div className="group w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-bg/50 transition-colors">
      {/* Colour bar */}
      <div
        className="w-1 h-12 rounded-full shrink-0"
        style={{ backgroundColor: event.colour || "#7A1F2B" }}
      />
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{event.name}</p>
          <span className="text-xs font-mono text-text-secondary">{event.reference}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {dateStr}
          </span>
          {client && (
            <span className="flex items-center gap-1">
              <User size={12} />
              {client.name}
            </span>
          )}
          {event.event_type && <span>{event.event_type}</span>}
        </div>
      </button>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[event.status] ?? "bg-bg text-text-secondary"}`}>
        {STATUS_LABELS[event.status] ?? event.status}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onDuplicate} title="Duplicate" className="p-1.5 rounded hover:bg-bg text-text-secondary hover:text-text-primary">
          <Copy size={14} />
        </button>
        <button onClick={onDelete} title="Move to trash" className="p-1.5 rounded hover:bg-bg text-text-secondary hover:text-danger">
          <Trash2 size={14} />
        </button>
      </div>
      <button onClick={onClick}>
        <ChevronRight size={14} className="text-text-secondary/30 shrink-0" />
      </button>
    </div>
  );
}

// --- Pipeline Board ---

const BOARD_COLUMNS: { status: EventStatus; label: string; color: string }[] = [
  { status: "enquiry", label: "Enquiry", color: "#3B6FB6" },
  { status: "quote_sent", label: "Quote sent", color: "#F2A33A" },
  { status: "booked", label: "Booked", color: "#3E8E5E" },
  { status: "ready", label: "Ready", color: "#3E8E5E" },
  { status: "done", label: "Completed", color: "#999" },
];

function PipelineBoard({ events, onEdit, onStatusChange }: {
  events: AmoraEvent[];
  onEdit: (id: string) => void;
  onStatusChange: (id: string, status: EventStatus) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex gap-3 overflow-x-auto">
      {BOARD_COLUMNS.map((col) => {
        const colEvents = events.filter((e) => e.status === col.status);
        return (
          <div
            key={col.status}
            className="flex-1 min-w-[200px] flex flex-col"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-highlight/20"); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove("bg-highlight/20"); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("bg-highlight/20");
              if (dragId) {
                onStatusChange(dragId, col.status);
                setDragId(null);
              }
            }}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-2 px-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                {col.label}
              </span>
              <span className="text-[10px] text-text-secondary bg-bg px-1.5 py-0.5 rounded-full ml-auto">
                {colEvents.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 bg-bg/50 rounded-xl p-2 space-y-2 overflow-y-auto">
              {colEvents.map((event) => (
                <BoardCard
                  key={event.id}
                  event={event}
                  onEdit={() => onEdit(event.id)}
                  onDragStart={() => setDragId(event.id)}
                />
              ))}
              {colEvents.length === 0 && (
                <p className="text-xs text-text-secondary/50 text-center py-4">
                  No events
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({ event, onEdit, onDragStart }: {
  event: AmoraEvent;
  onEdit: () => void;
  onDragStart: () => void;
}) {
  const { data: client } = useContact(event.client_id);

  let dateStr = "";
  try {
    dateStr = format(new Date(event.start_date + "T00:00:00"), "d MMM");
  } catch {
    dateStr = event.start_date;
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onEdit}
      className="bg-surface rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-2">
        <div className="w-1 h-full rounded-full shrink-0 mt-0.5" style={{ backgroundColor: event.colour || "#7A1F2B" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{event.name}</p>
          <p className="text-[10px] text-text-secondary font-mono">{event.reference}</p>
          {client && (
            <p className="text-xs text-text-secondary mt-1 truncate flex items-center gap-1">
              <User size={10} /> {client.name}
            </p>
          )}
          <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
            <CalendarDays size={10} /> {dateStr}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Event Form ---

interface EventFormData {
  name: string;
  event_type: string;
  theme: string;
  description: string;
  start_date: string;
  end_date: string;
  setup_time: string;
  start_time: string;
  end_time: string;
  packdown_time: string;
  client_id: string | null;
  client_name: string;
  venue_id: string | null;
  venue_name: string;
  venue_area: string;
  indoor_outdoor: string;
  guest_count: string;
  table_count: string;
  lead_source: string;
  referred_by: string;
  follow_up_date: string;
  travel_km: string;
  notes: string;
}

function EventForm({ event, onSave, onCancel }: {
  event?: AmoraEvent;
  onSave: (data: EventFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EventFormData>({
    name: event?.name ?? "",
    event_type: event?.event_type ?? "",
    theme: event?.theme ?? "",
    description: event?.description ?? "",
    start_date: event?.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: event?.end_date ?? "",
    setup_time: event?.setup_time ?? "",
    start_time: event?.start_time ?? "",
    end_time: event?.end_time ?? "",
    packdown_time: event?.packdown_time ?? "",
    client_id: event?.client_id ?? null,
    client_name: "",
    venue_id: event?.venue_id ?? null,
    venue_name: "",
    venue_area: event?.venue_area ?? "",
    indoor_outdoor: event?.indoor_outdoor ?? "",
    guest_count: event?.guest_count ? String(event.guest_count) : "",
    table_count: event?.table_count ? String(event.table_count) : "",
    lead_source: event?.lead_source ?? "",
    referred_by: event?.referred_by ?? "",
    follow_up_date: event?.follow_up_date ?? "",
    travel_km: event?.travel_km ? String(event.travel_km) : "",
    notes: event?.notes ?? "",
  });
  const [showTimes, setShowTimes] = useState(!!(event?.setup_time || event?.start_time));
  const [showMultiDay, setShowMultiDay] = useState(!!event?.end_date);

  const set = (key: keyof EventFormData, value: string | null) =>
    setForm((prev) => ({ ...prev, [key]: value as string }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.start_date) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-medium">
        {event ? "Edit event" : "New enquiry"}
      </h3>

      {/* Client */}
      <Section title="Client">
        <ContactLookup
          label="Client"
          value={form.client_id}
          displayName={form.client_name}
          onSelect={(c) => { set("client_id", c.id); set("client_name", c.name); }}
          onClear={() => { set("client_id", null); set("client_name", ""); }}
        />
        <div className="flex gap-2">
          <SelectField label="Lead source" value={form.lead_source} onChange={(v) => set("lead_source", v)} options={LEAD_SOURCES} />
          <Field label="Referred by" value={form.referred_by} onChange={(v) => set("referred_by", v)} />
        </div>
        <Field label="Follow-up date" value={form.follow_up_date} onChange={(v) => set("follow_up_date", v)} type="date" />
      </Section>

      {/* Event details */}
      <Section title="Event">
        <Field label="Name *" value={form.name} onChange={(v) => set("name", v)} autoFocus />
        <div className="flex gap-2">
          <SelectField label="Type" value={form.event_type} onChange={(v) => set("event_type", v)} options={EVENT_TYPES} />
          <Field label="Theme" value={form.theme} onChange={(v) => set("theme", v)} placeholder="e.g. Boho neutral" />
        </div>
        <TextArea label="Description" value={form.description} onChange={(v) => set("description", v)} />
      </Section>

      {/* When */}
      <Section title="When">
        <Field label="Start date *" value={form.start_date} onChange={(v) => set("start_date", v)} type="date" />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showMultiDay} onChange={(e) => setShowMultiDay(e.target.checked)}
            className="rounded border-border accent-brand" />
          Multi-day event
        </label>
        {showMultiDay && (
          <Field label="End date" value={form.end_date} onChange={(v) => set("end_date", v)} type="date" />
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showTimes} onChange={(e) => setShowTimes(e.target.checked)}
            className="rounded border-border accent-brand" />
          Add times
        </label>
        {showTimes && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Setup" value={form.setup_time} onChange={(v) => set("setup_time", v)} type="time" />
            <Field label="Start" value={form.start_time} onChange={(v) => set("start_time", v)} type="time" />
            <Field label="End" value={form.end_time} onChange={(v) => set("end_time", v)} type="time" />
            <Field label="Pack-down" value={form.packdown_time} onChange={(v) => set("packdown_time", v)} type="time" />
          </div>
        )}
      </Section>

      {/* Where */}
      <Section title="Where">
        <Field label="Venue area" value={form.venue_area} onChange={(v) => set("venue_area", v)} placeholder="e.g. Main ballroom" />
        <div className="flex gap-2">
          <SelectField label="Indoor / outdoor" value={form.indoor_outdoor} onChange={(v) => set("indoor_outdoor", v)}
            options={["indoor", "outdoor", "both"]} />
          <Field label="Travel (km)" value={form.travel_km} onChange={(v) => set("travel_km", v)} type="number" />
        </div>
      </Section>

      {/* Numbers */}
      <Section title="Numbers">
        <div className="flex gap-2">
          <Field label="Guests" value={form.guest_count} onChange={(v) => set("guest_count", v)} type="number" />
          <Field label="Tables" value={form.table_count} onChange={(v) => set("table_count", v)} type="number" />
        </div>
      </Section>

      {/* Notes */}
      <TextArea label="Notes" value={form.notes} onChange={(v) => set("notes", v)} />

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 text-sm py-2.5 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium">
          {event ? "Save" : "Create enquiry"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm py-2.5 px-4 rounded-lg border border-border hover:bg-bg transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// --- Primitives ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean;
}) {
  return (
    <div className="flex-1">
      <label className="text-xs text-text-secondary">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoFocus={autoFocus} step={type === "number" ? "any" : undefined}
        className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex-1">
      <label className="text-xs text-text-secondary">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-text-secondary">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="w-full text-sm mt-1 px-3 py-2 border border-border rounded-lg outline-none focus:border-brand bg-surface resize-none" />
    </div>
  );
}

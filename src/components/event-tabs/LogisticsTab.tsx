import { MapPin, Clock, Truck, Plus, Trash2, Wand2, Users, Phone, GripVertical } from "lucide-react";
import { useState } from "react";
import { useContact } from "../../hooks/use-contacts";
import { useEventContacts } from "../../hooks/use-event-contacts";
import { useStylingItems } from "../../hooks/use-styling-items";
import type { AmoraEvent, EventContact } from "../../data";
import { runSheetRepo } from "../../data";
import type { RunSheetItem } from "../../data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDragReorder } from "../../hooks/use-drag-reorder";
import { useUpdateEvent } from "../../hooks/use-events";
import { ConfirmDialog } from "../shared/ConfirmDialog";

export function LogisticsTab({ event }: { event: AmoraEvent }) {
  return (
    <div className="space-y-4">
      {event.venue_id && <VenueAccess venueId={event.venue_id} event={event} />}
      <TimesCard event={event} />
      <OperationalDetails event={event} />
      <RunSheetSection event={event} />
      <CrewSection event={event} />
      <PackListSection event={event} />
    </div>
  );
}

function OperationalDetails({ event }: { event: AmoraEvent }) {
  const updateEvent = useUpdateEvent();
  const save = (data: Partial<AmoraEvent>) => updateEvent.mutate({ id: event.id, data });
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-3 flex items-center gap-2">
        <Truck size={14} /> Access & travel
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs text-text-secondary">Access from
          <input type="time" defaultValue={event.access_from ?? ""} onBlur={(e) => save({ access_from: e.target.value || null })}
            className="block w-full mt-1 text-sm px-3 py-2 border border-border rounded-lg bg-surface" />
        </label>
        <label className="text-xs text-text-secondary">Access until
          <input type="time" defaultValue={event.access_until ?? ""} onBlur={(e) => save({ access_until: e.target.value || null })}
            className="block w-full mt-1 text-sm px-3 py-2 border border-border rounded-lg bg-surface" />
        </label>
        <label className="text-xs text-text-secondary">Travel (km)
          <input type="number" min="0" step="any" defaultValue={event.travel_km ?? ""}
            onBlur={(e) => {
              const value = e.target.value === "" ? null : Number(e.target.value);
              if (value === null || (Number.isFinite(value) && value >= 0)) save({ travel_km: value });
            }}
            className="block w-full mt-1 text-sm px-3 py-2 border border-border rounded-lg bg-surface" />
        </label>
        <label className="text-xs text-text-secondary">Travel notes
          <input defaultValue={event.travel_notes ?? ""} onBlur={(e) => save({ travel_notes: e.target.value.trim() || null })}
            className="block w-full mt-1 text-sm px-3 py-2 border border-border rounded-lg bg-surface" />
        </label>
      </div>
    </div>
  );
}

// --- Run Sheet ---

function RunSheetSection({ event }: { event: AmoraEvent }) {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<RunSheetItem | null>(null);
  const { data: items = [] } = useQuery({
    queryKey: ["run-sheet", event.id],
    queryFn: () => runSheetRepo.findByEvent(event.id),
  });

  const addItem = useMutation({
    mutationFn: (data: Omit<RunSheetItem, "id" | "created_at" | "updated_at">) => runSheetRepo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["run-sheet", event.id] }),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RunSheetItem> }) => runSheetRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["run-sheet", event.id] }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => runSheetRepo.hardDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["run-sheet", event.id] }),
  });

  const drag = useDragReorder("run_sheet_items", () => {
    qc.invalidateQueries({ queryKey: ["run-sheet", event.id] });
  });

  const handleAdd = () => {
    addItem.mutate({
      event_id: event.id,
      date: null,
      time: "",
      task: "",
      assigned_contact_id: null,
      notes: null,
      position: items.length,
    });
  };

  const handleGenerate = () => {
    const starters: { time: string; task: string }[] = [];
    if (event.setup_time) starters.push({ time: event.setup_time, task: "Setup begins" });
    if (event.start_time) starters.push({ time: event.start_time, task: "Event starts" });
    if (event.end_time) starters.push({ time: event.end_time, task: "Event ends" });
    if (event.packdown_time) starters.push({ time: event.packdown_time, task: "Pack-down" });
    if (starters.length === 0) return;

    for (let i = 0; i < starters.length; i++) {
      addItem.mutate({
        event_id: event.id,
        date: null,
        time: starters[i].time,
        task: starters[i].task,
        assigned_contact_id: null,
        notes: null,
        position: items.length + i,
      });
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium">Run sheet</h4>
        <div className="flex gap-2">
          {items.length === 0 && (event.setup_time || event.start_time) && (
            <button onClick={handleGenerate} className="text-xs text-brand hover:underline flex items-center gap-1">
              <Wand2 size={12} /> Generate from times
            </button>
          )}
          <button onClick={handleAdd} className="text-xs text-brand hover:underline flex items-center gap-1">
            <Plus size={12} /> Add row
          </button>
        </div>
      </div>

      {items.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-text-secondary border-b border-border">
              <th className="w-6" />
              <th className="text-left py-2 font-medium w-20">Time</th>
              <th className="text-left py-2 font-medium">Task</th>
              <th className="text-left py-2 font-medium w-32">Who / Notes</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} tabIndex={0} aria-label={`${item.task || "Run sheet item"}. Reorder with Alt+Arrow keys`}
                onKeyDown={(e) => {
                  if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
                  e.preventDefault();
                  const target = items[index + (e.key === "ArrowUp" ? -1 : 1)];
                  if (target) void drag.moveItem(item.id, target.id, items);
                }}
                className={`border-b border-border/50 group ${drag.dragId === item.id ? "opacity-50" : ""}`}
                draggable onDragStart={() => drag.onDragStart(item.id)} onDragOver={drag.onDragOver}
                onDrop={() => drag.onDrop(item.id, items)} onDragEnd={drag.onDragEnd}>
                <td className="py-1.5 cursor-grab text-text-secondary/40 hover:text-text-secondary">
                  <GripVertical size={14} />
                </td>
                <td className="py-1.5">
                  <input type="time" value={item.time ?? ""} onChange={(e) => updateItem.mutate({ id: item.id, data: { time: e.target.value } })}
                    className="w-full text-sm bg-transparent outline-none" />
                </td>
                <td className="py-1.5">
                  <input value={item.task ?? ""} onChange={(e) => updateItem.mutate({ id: item.id, data: { task: e.target.value } })}
                    placeholder="What happens..."
                    className="w-full text-sm bg-transparent outline-none" />
                </td>
                <td className="py-1.5">
                  <input value={item.notes ?? ""} onChange={(e) => updateItem.mutate({ id: item.id, data: { notes: e.target.value } })}
                    placeholder="Who / notes"
                    className="w-full text-sm bg-transparent outline-none text-text-secondary" />
                </td>
                <td className="py-1.5">
                  <button type="button" aria-label={`Remove ${item.task || "run sheet item"}`} onClick={() => setDeleteTarget(item)}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger p-1">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-text-secondary text-center py-4">No run sheet items yet.</p>
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove run sheet item?"
        message="Remove this item from the run sheet?"
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (deleteTarget) deleteItem.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// --- Crew ---

function CrewSection({ event }: { event: AmoraEvent }) {
  const { data: links = [] } = useEventContacts(event.id);
  // Filter to crew contacts only
  const crewLinks = links.filter((l) => l.role_on_event?.toLowerCase().includes("crew") || l.role_on_event?.toLowerCase().includes("helper") || l.call_time);

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-3 flex items-center gap-2">
        <Users size={14} /> Crew
      </h4>
      {crewLinks.length > 0 ? (
        <div className="space-y-2">
          {crewLinks.map((link) => (
            <CrewCard key={link.id} link={link} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary text-center py-2">
          No crew assigned. Link crew contacts from the Contacts tab.
        </p>
      )}
    </div>
  );
}

function CrewCard({ link }: { link: EventContact }) {
  const { data: contact } = useContact(link.contact_id);
  if (!contact) return null;

  const rate = contact.crew_rate_cents ? `$${(contact.crew_rate_cents / 100).toFixed(2)}/${contact.crew_rate_unit ?? "hour"}` : null;
  const estCost = contact.crew_rate_cents && link.hours ? `$${((contact.crew_rate_cents * link.hours) / 100).toFixed(2)}` : null;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-bg/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{contact.name}</p>
        <div className="flex gap-3 text-xs text-text-secondary mt-0.5">
          {contact.phone && (
            <span className="flex items-center gap-1"><Phone size={10} /> {contact.phone}</span>
          )}
          {link.call_time && <span>Call: {link.call_time}</span>}
          {link.hours && <span>{link.hours}h</span>}
          {rate && <span>{rate}</span>}
        </div>
      </div>
      {estCost && (
        <span className="text-sm font-medium text-text-secondary">{estCost}</span>
      )}
    </div>
  );
}

// --- Pack List (auto from styling items with status "have") ---

function PackListSection({ event }: { event: AmoraEvent }) {
  const { data: items = [] } = useStylingItems(event.id);
  const packable = items.filter((i) => i.status === "have");
  const packed = packable.filter((i) => i.packed);

  // ponytail: no update mutation here, pack toggle handled inline
  const qc = useQueryClient();
  const togglePacked = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: number }) => {
      const { stylingItemsRepo } = await import("../../data");
      return stylingItemsRepo.update(id, { packed: val });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["styling-items", event.id] });
    },
  });

  if (packable.length === 0) return null;

  // Group by category
  const groups = new Map<string, typeof packable>();
  for (const item of packable) {
    const cat = item.category || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium">
          Pack list
        </h4>
        <span className="text-xs text-text-secondary">
          {packed.length}/{packable.length} packed
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-bg rounded-full overflow-hidden mb-3">
        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${packable.length > 0 ? (packed.length / packable.length) * 100 : 0}%` }} />
      </div>

      {[...groups.entries()].map(([cat, catItems]) => (
        <div key={cat} className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary font-medium mb-1">{cat}</p>
          {catItems.map((item) => (
            <label key={item.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-bg/50 cursor-pointer text-sm">
              <input type="checkbox" checked={!!item.packed}
                onChange={() => togglePacked.mutate({ id: item.id, val: item.packed ? 0 : 1 })}
                className="rounded border-border accent-brand" />
              <span className={item.packed ? "line-through text-text-secondary" : ""}>{item.name}</span>
              <span className="text-xs text-text-secondary ml-auto">×{item.quantity}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

// --- Venue Access (unchanged) ---

function VenueAccess({ venueId, event }: { venueId: string; event: AmoraEvent }) {
  const { data: venue } = useQuery({
    queryKey: ["venue-detail", venueId],
    queryFn: async () => {
      const { venuesRepo } = await import("../../data");
      return venuesRepo.findById(venueId);
    },
  });

  const { data: coordinator } = useContact(venue?.coordinator_contact_id ?? null);

  if (!venue) return null;

  return (
    <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
      <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium flex items-center gap-2">
        <MapPin size={14} /> Venue access
      </h4>
      <div className="text-sm space-y-1">
        <p className="font-medium">{venue.name}</p>
        {venue.address && <p className="text-text-secondary">{venue.address}</p>}
        {event.venue_area && <p>Area: {event.venue_area}</p>}
        {event.indoor_outdoor && <p className="capitalize">{event.indoor_outdoor}</p>}
      </div>

      {(event.access_from || event.access_until) && (
        <div className="text-sm">
          <p className="text-text-secondary text-xs mb-1">Access window</p>
          <p>{event.access_from ?? "—"} — {event.access_until ?? "—"}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        {venue.loading_access && <div><p className="text-xs text-text-secondary">Loading/parking</p><p>{venue.loading_access}</p></div>}
        {venue.stairs_lift && <div><p className="text-xs text-text-secondary">Stairs/lift</p><p>{venue.stairs_lift}</p></div>}
        {venue.power && <div><p className="text-xs text-text-secondary">Power</p><p>{venue.power}</p></div>}
      </div>

      {venue.rules && (
        <div className="bg-need/5 border border-need/20 rounded-lg p-3">
          <p className="text-xs font-medium text-need mb-1">Venue rules</p>
          <p className="text-sm">{venue.rules}</p>
        </div>
      )}

      {coordinator && (
        <div className="text-sm">
          <p className="text-xs text-text-secondary mb-1">Venue coordinator</p>
          <p className="font-medium">{coordinator.name}</p>
          <div className="flex gap-3 text-xs text-text-secondary mt-0.5">
            {coordinator.phone && <span>{coordinator.phone}</span>}
            {coordinator.email && <span>{coordinator.email}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function TimesCard({ event }: { event: AmoraEvent }) {
  const times = [
    { label: "Setup", time: event.setup_time },
    { label: "Start", time: event.start_time },
    { label: "End", time: event.end_time },
    { label: "Pack-down", time: event.packdown_time },
  ].filter((t) => t.time);

  if (times.length === 0) return null;

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-2 flex items-center gap-2">
        <Clock size={14} /> Times
      </h4>
      <div className="flex gap-6">
        {times.map((t) => (
          <div key={t.label} className="text-sm">
            <p className="text-xs text-text-secondary">{t.label}</p>
            <p className="font-medium">{t.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

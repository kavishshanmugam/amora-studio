import { useState } from "react";
import { MapPin, Plus, Search, X, ChevronRight } from "lucide-react";
import { useVenues, useCreateVenue, useUpdateVenue, useDeleteVenue } from "../hooks/use-venues";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import type { Venue } from "../data";
import { ContactLookup } from "../components/shared/ContactLookup";
import { useContact } from "../hooks/use-contacts";

export function VenuesPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: venues = [], isLoading } = useVenues();
  const createVenue = useCreateVenue();
  const updateVenue = useUpdateVenue();
  const deleteVenue = useDeleteVenue();

  const filtered = search
    ? venues.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.address?.toLowerCase().includes(search.toLowerCase())
      )
    : venues;

  const selected = selectedId ? venues.find((v) => v.id === selectedId) : null;

  const handleCreate = async (data: VenueFormData) => {
    await createVenue.mutateAsync(formToVenue(data));
    setShowForm(false);
  };

  const handleUpdate = async (data: VenueFormData) => {
    if (!editingId) return;
    await updateVenue.mutateAsync({ id: editingId, data: formToVenue(data) });
    setEditingId(null);
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const handleDelete = (id: string) => setDeleteId(id);
  const confirmDelete = async () => {
    if (deleteId) {
      await deleteVenue.mutateAsync(deleteId);
      if (selectedId === deleteId) setSelectedId(null);
    }
    setDeleteId(null);
  };

  return (
    <div className="max-w-5xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-3xl font-bold">Venues</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-2 bg-text-primary text-white rounded-full py-2 px-5 text-sm font-medium hover:bg-brand transition-colors"
        >
          <Plus size={16} />
          Add venue
        </button>
      </div>

      <div className="relative max-w-xs mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venues..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand bg-surface"
        />
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin size={48} className="mx-auto text-text-secondary/30 mb-4" />
              <p className="text-text-secondary">
                {search ? "No venues match your search." : "No venues yet."}
              </p>
              {!search && (
                <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-brand hover:underline">
                  Add your first venue
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {filtered.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => setSelectedId(venue.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-bg/50 transition-colors ${
                    selectedId === venue.id ? "bg-highlight/30" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-info/10 text-info flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{venue.name}</p>
                    {venue.address && (
                      <p className="text-xs text-text-secondary truncate">{venue.address}</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-text-secondary/30 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && !showForm && !editingId && (
          <VenueDetail
            venue={selected}
            onEdit={() => setEditingId(selected.id)}
            onDelete={() => handleDelete(selected.id)}
            onClose={() => setSelectedId(null)}
          />
        )}

        {(showForm || editingId) && (
          <div className="w-80 bg-surface rounded-xl border border-border p-5 overflow-y-auto shrink-0">
            <VenueForm
              venue={editingId ? venues.find((v) => v.id === editingId) : undefined}
              onSave={editingId ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingId(null); }}
            />
          </div>
        )}
      </div>
      <ConfirmDialog open={deleteId !== null} title="Delete venue?" message="This venue will be permanently deleted."
        confirmLabel="Delete" danger onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function VenueDetail({ venue, onEdit, onDelete, onClose }: {
  venue: Venue;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { data: coordinator } = useContact(venue.coordinator_contact_id);

  return (
    <div className="w-80 bg-surface rounded-xl border border-border p-5 overflow-y-auto shrink-0">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-full bg-info/10 text-info flex items-center justify-center">
          <MapPin size={20} />
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
          <X size={16} />
        </button>
      </div>
      <h2 className="text-lg font-medium mb-1">{venue.name}</h2>
      {venue.address && <p className="text-sm text-text-secondary mb-3">{venue.address}</p>}

      <div className="space-y-3 text-sm">
        {coordinator && (
          <DetailRow label="Coordinator" value={coordinator.name} />
        )}
        {venue.loading_access && <DetailRow label="Loading access" value={venue.loading_access} />}
        {venue.stairs_lift && <DetailRow label="Stairs / lift" value={venue.stairs_lift} />}
        {venue.power && <DetailRow label="Power" value={venue.power} />}
        {venue.rules && <DetailRow label="Rules" value={venue.rules} />}
        {venue.instagram_handle && <DetailRow label="Instagram" value={`@${venue.instagram_handle}`} />}
        {venue.website && <DetailRow label="Website" value={venue.website} />}
        {venue.notes && (
          <div className="mt-3 p-3 bg-bg rounded-lg text-xs text-text-secondary">{venue.notes}</div>
        )}
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={onEdit} className="flex-1 text-sm py-2 rounded-lg border border-border hover:bg-bg transition-colors">
          Edit
        </button>
        <button onClick={onDelete} className="text-sm py-2 px-4 rounded-lg text-danger hover:bg-danger/5 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}

// --- Form ---

interface VenueFormData {
  name: string;
  address: string;
  instagram_handle: string;
  website: string;
  coordinator_contact_id: string | null;
  coordinator_name: string;
  loading_access: string;
  stairs_lift: string;
  power: string;
  rules: string;
  notes: string;
}

function formToVenue(data: VenueFormData): Omit<Venue, "id" | "created_at" | "updated_at"> {
  return {
    name: data.name,
    address: data.address || null,
    instagram_handle: data.instagram_handle || null,
    website: data.website || null,
    coordinator_contact_id: data.coordinator_contact_id,
    loading_access: data.loading_access || null,
    stairs_lift: data.stairs_lift || null,
    power: data.power || null,
    rules: data.rules || null,
    notes: data.notes || null,
    deleted_at: null,
  };
}

function VenueForm({ venue, onSave, onCancel }: {
  venue?: Venue;
  onSave: (data: VenueFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<VenueFormData>({
    name: venue?.name ?? "",
    address: venue?.address ?? "",
    instagram_handle: venue?.instagram_handle ?? "",
    website: venue?.website ?? "",
    coordinator_contact_id: venue?.coordinator_contact_id ?? null,
    coordinator_name: "",
    loading_access: venue?.loading_access ?? "",
    stairs_lift: venue?.stairs_lift ?? "",
    power: venue?.power ?? "",
    rules: venue?.rules ?? "",
    notes: venue?.notes ?? "",
  });

  const set = (key: keyof VenueFormData, value: string | null) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-medium mb-2">{venue ? "Edit venue" : "New venue"}</h3>
      <Input label="Name *" value={form.name} onChange={(v) => set("name", v)} autoFocus />
      <Input label="Address" value={form.address} onChange={(v) => set("address", v)} />
      <ContactLookup
        label="Venue coordinator"
        value={form.coordinator_contact_id}
        displayName={form.coordinator_name}
        onSelect={(c) => { set("coordinator_contact_id", c.id); set("coordinator_name", c.name); }}
        onClear={() => { set("coordinator_contact_id", null); set("coordinator_name", ""); }}
      />
      <Input label="Loading access" value={form.loading_access} onChange={(v) => set("loading_access", v)} placeholder="Loading dock, parking, distance to room" />
      <Input label="Stairs / lift" value={form.stairs_lift} onChange={(v) => set("stairs_lift", v)} />
      <Input label="Power" value={form.power} onChange={(v) => set("power", v)} placeholder="Power points, location" />
      <TextArea label="Rules" value={form.rules} onChange={(v) => set("rules", v)} placeholder="e.g. no confetti, curfew 11pm" />
      <Input label="Instagram" value={form.instagram_handle} onChange={(v) => set("instagram_handle", v)} placeholder="Without @" />
      <Input label="Website" value={form.website} onChange={(v) => set("website", v)} />
      <TextArea label="Notes" value={form.notes} onChange={(v) => set("notes", v)} />

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 text-sm py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium">
          {venue ? "Save" : "Create"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm py-2 px-4 rounded-lg border border-border hover:bg-bg transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Input({ label, value, onChange, placeholder, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-text-secondary">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
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

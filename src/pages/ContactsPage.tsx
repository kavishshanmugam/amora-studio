import { useEffect, useState, useId } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Plus, Search, Phone, Mail, X, ChevronRight, MapPin, PartyPopper } from "lucide-react";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, useRestoreContact } from "../hooks/use-contacts";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { useToast } from "../components/shared/Toast";
import type { Contact } from "../data";
import { useSetting } from "../hooks/use-settings";
import { parseSettingList } from "../utils/events-core";

const DEFAULT_SUPPLIER_ROLES = ["Florist", "Balloon supplier", "Hire company", "Cake", "Signage", "Helper", "Photographer", "Videographer", "DJ", "Other"];

type Tab = "all" | "client" | "supplier" | "crew";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "client", label: "Clients" },
  { key: "supplier", label: "Suppliers" },
  { key: "crew", label: "Crew" },
];

export function ContactsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("selected"));
  useEffect(() => setSelectedId(searchParams.get("selected")), [searchParams]);

  const filter = tab === "all" ? undefined : tab;
  const { data: contacts = [], isLoading, isError, error, refetch } = useContacts(filter);
  const [actionError, setActionError] = useState<string | null>(null);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const filtered = search
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.business_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  const selected = selectedId ? contacts.find((c) => c.id === selectedId) : null;

  const handleCreate = async (data: ContactFormData) => {
    setActionError(null);
    try {
      await createContact.mutateAsync(formToContact(data));
      setShowForm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not create contact.");
    }
  };

  const handleUpdate = async (data: ContactFormData) => {
    if (!editingId) return;
    setActionError(null);
    try {
      await updateContact.mutateAsync({ id: editingId, data: formToContact(data) });
      setEditingId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update contact.");
    }
  };

  const restoreContact = useRestoreContact();
  const toast = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const handleDelete = (id: string) => setDeleteId(id);
  const confirmDelete = async () => {
    if (deleteId) {
      const did = deleteId;
      await deleteContact.mutateAsync(did);
      if (selectedId === did) setSelectedId(null);
      toast.show("Contact moved to trash", { onUndo: () => restoreContact.mutate(did) });
    }
    setDeleteId(null);
  };

  return (
    <div className="max-w-5xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-3xl font-bold">Contacts</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-2 bg-text-primary text-white rounded-full py-2 px-5 text-sm font-medium hover:bg-brand transition-colors"
        >
          <Plus size={16} />
          Add contact
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 bg-bg rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                tab === t.key
                  ? "bg-surface text-text-primary font-medium shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            aria-label="Search contacts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand bg-surface"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* List */}
        <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading...</div>
          ) : isError ? (
            <div role="alert" className="p-8 text-center">
              <p className="text-danger text-sm">{error instanceof Error ? error.message : "Could not load contacts."}</p>
              <button onClick={() => refetch()} className="mt-3 text-sm text-brand underline">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={48} className="mx-auto text-text-secondary/30 mb-4" />
              <p className="text-text-secondary">
                {search ? "No contacts match your search." : "No contacts yet."}
              </p>
              {!search && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 text-sm text-brand hover:underline"
                >
                  Add your first contact
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {filtered.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedId(contact.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-bg/50 transition-colors ${
                    selectedId === contact.id ? "bg-highlight/30" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-medium shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    {contact.business_name && (
                      <p className="text-xs text-text-secondary truncate">
                        {contact.business_name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {contact.is_client === 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand">
                        Client
                      </span>
                    )}
                    {contact.is_supplier === 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info">
                        Supplier
                      </span>
                    )}
                    {contact.is_crew === 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">
                        Crew
                      </span>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-text-secondary/30 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && !showForm && !editingId && (
          <div className="w-80 bg-surface rounded-xl border border-border p-5 overflow-y-auto shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center text-lg font-medium">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => setSelectedId(null)}
                aria-label="Close contact details"
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>
            <h2 className="text-lg font-medium mb-1">{selected.name}</h2>
            {selected.business_name && (
              <p className="text-sm text-text-secondary mb-3">{selected.business_name}</p>
            )}
            <div className="flex gap-1.5 mb-4">
              {selected.is_client === 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand">Client</span>
              )}
              {selected.is_supplier === 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-info/10 text-info">Supplier</span>
              )}
              {selected.is_crew === 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">Crew</span>
              )}
            </div>
            <div className="space-y-2 text-sm">
              {selected.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-text-secondary" />
                  <span>{selected.phone}</span>
                </div>
              )}
              {selected.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-text-secondary" />
                  <span>{selected.email}</span>
                </div>
              )}
              {selected.role && (
                <div className="text-text-secondary">Role: {selected.role}</div>
              )}
              {selected.instagram_handle && (
                <div className="text-text-secondary">@{selected.instagram_handle}</div>
              )}
              {selected.address && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <MapPin size={14} /> {selected.address}
                </div>
              )}
              {selected.website && (
                <div className="text-text-secondary text-xs truncate">{selected.website}</div>
              )}
              {selected.is_crew === 1 && selected.crew_rate_cents != null && (
                <div className="text-text-secondary">
                  Rate: ${(selected.crew_rate_cents / 100).toFixed(2)}/{selected.crew_rate_unit ?? "hour"}
                </div>
              )}
              {selected.notes && (
                <div className="mt-3 p-3 bg-bg rounded-lg text-xs text-text-secondary">
                  {selected.notes}
                </div>
              )}
            </div>
            <LinkedJobs contactId={selected.id} />
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditingId(selected.id)}
                className="flex-1 text-sm py-2 rounded-lg border border-border hover:bg-bg transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="text-sm py-2 px-4 rounded-lg text-danger hover:bg-danger/5 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Create / Edit form */}
        {(showForm || editingId) && (
          <div className="w-80 bg-surface rounded-xl border border-border p-5 overflow-y-auto shrink-0">
            {actionError && <p role="alert" className="mb-3 text-sm text-danger">{actionError}</p>}
            <ContactForm
              contact={editingId ? contacts.find((c) => c.id === editingId) : undefined}
              onSave={editingId ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingId(null); }}
            />
          </div>
        )}
      </div>
      <ConfirmDialog open={deleteId !== null} title="Delete contact?" message="This contact will be moved to trash."
        confirmLabel="Delete" danger onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

// --- Contact Form ---

interface ContactFormData {
  name: string;
  business_name: string;
  is_client: boolean;
  is_supplier: boolean;
  is_crew: boolean;
  role: string;
  phone: string;
  email: string;
  address: string;
  instagram_handle: string;
  website: string;
  crew_rate_cents: string;
  crew_rate_unit: string;
  notes: string;
}

function formToContact(data: ContactFormData): Omit<Contact, "id" | "created_at" | "updated_at"> {
  return {
    name: data.name,
    business_name: data.business_name || null,
    is_client: data.is_client ? 1 : 0,
    is_supplier: data.is_supplier ? 1 : 0,
    is_crew: data.is_crew ? 1 : 0,
    role: data.role || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    instagram_handle: data.instagram_handle || null,
    website: data.website || null,
    crew_rate_cents: data.crew_rate_cents ? Math.round(parseFloat(data.crew_rate_cents) * 100) : null,
    crew_rate_unit: data.crew_rate_unit || null,
    notes: data.notes || null,
    deleted_at: null,
  };
}

function ContactForm({
  contact,
  onSave,
  onCancel,
}: {
  contact?: Contact;
  onSave: (data: ContactFormData) => void;
  onCancel: () => void;
}) {
  const perId = useId();
  const notesId = useId();
  const rolesId = useId();
  const { data: supplierRolesSetting } = useSetting("supplier_roles");
  const supplierRoles = parseSettingList(supplierRolesSetting, DEFAULT_SUPPLIER_ROLES);
  const [form, setForm] = useState<ContactFormData>({
    name: contact?.name ?? "",
    business_name: contact?.business_name ?? "",
    is_client: contact ? contact.is_client === 1 : false,
    is_supplier: contact?.is_supplier === 1,
    is_crew: contact?.is_crew === 1,
    role: contact?.role ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    address: contact?.address ?? "",
    instagram_handle: contact?.instagram_handle ?? "",
    website: contact?.website ?? "",
    crew_rate_cents: contact?.crew_rate_cents ? String(contact.crew_rate_cents / 100) : "",
    crew_rate_unit: contact?.crew_rate_unit ?? "hour",
    notes: contact?.notes ?? "",
  });

  const set = (key: keyof ContactFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-medium mb-2">
        {contact ? "Edit contact" : "New contact"}
      </h3>

      <Input label="Name *" value={form.name} onChange={(v) => set("name", v)} autoFocus required />
      <Input label="Business name" value={form.business_name} onChange={(v) => set("business_name", v)} />

      <div className="flex gap-3">
        <Checkbox label="Client" checked={form.is_client} onChange={(v) => set("is_client", v)} />
        <Checkbox label="Supplier" checked={form.is_supplier} onChange={(v) => set("is_supplier", v)} />
        <Checkbox label="Crew" checked={form.is_crew} onChange={(v) => set("is_crew", v)} />
      </div>

      <Input label="Role" value={form.role} onChange={(v) => set("role", v)} placeholder="e.g. Florist, Helper" list={rolesId} />
      <datalist id={rolesId}>{supplierRoles.map((role) => <option key={role} value={role} />)}</datalist>
      <Input label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
      <Input label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
      <Input label="Address" value={form.address} onChange={(v) => set("address", v)} />
      <Input label="Instagram" value={form.instagram_handle} onChange={(v) => set("instagram_handle", v)} placeholder="Without @" />
      <Input label="Website" value={form.website} onChange={(v) => set("website", v)} />

      {form.is_crew && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input label="Rate ($)" value={form.crew_rate_cents} onChange={(v) => set("crew_rate_cents", v)} type="number" min="0" step="0.01" />
          </div>
          <div className="w-24">
            <label htmlFor={perId} className="text-xs text-text-secondary">Per</label>
            <select
              id={perId}
              value={form.crew_rate_unit}
              onChange={(e) => set("crew_rate_unit", e.target.value)}
              className="w-full text-sm mt-1 px-2 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface"
            >
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="job">Job</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <label htmlFor={notesId} className="text-xs text-text-secondary">Notes</label>
        <textarea
          id={notesId}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="w-full text-sm mt-1 px-3 py-2 border border-border rounded-lg outline-none focus:border-brand bg-surface resize-none"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 text-sm py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium"
        >
          {contact ? "Save" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm py-2 px-4 rounded-lg border border-border hover:bg-bg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// --- Primitives ---

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
  required,
  min,
  step,
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  required?: boolean;
  min?: string;
  step?: string;
  list?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-xs text-text-secondary">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
        min={min}
        step={step}
        list={list}
        className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface"
      />
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border accent-brand"
      />
      {label}
    </label>
  );
}

function LinkedJobs({ contactId }: { contactId: string }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["contact-jobs", contactId],
    queryFn: async () => {
      const { getDb } = await import("../data");
      const db = await getDb();
      // Events where this contact is the client OR is linked via event_contacts
      const rows = await db.select<{ id: string; name: string; reference: string; start_date: string; status: string }[]>(
        `SELECT DISTINCT e.id, e.name, e.reference, e.start_date, e.status FROM events e
         WHERE e.deleted_at IS NULL AND (
           e.client_id = ?
           OR e.id IN (SELECT event_id FROM event_contacts WHERE contact_id = ?)
         )
         ORDER BY e.start_date DESC LIMIT 20`,
        [contactId, contactId]
      );
      // Aggregates
      const agg = await db.select<{ total_booked: number; total_paid: number }[]>(
        `SELECT
          COALESCE((SELECT COUNT(*) FROM events WHERE client_id = ? AND deleted_at IS NULL AND status IN ('booked','planning','ready','done')), 0) as total_booked,
          COALESCE((SELECT SUM(p.amount_cents) FROM payments p JOIN events e ON p.event_id = e.id WHERE e.client_id = ? AND e.deleted_at IS NULL), 0) as total_paid`,
        [contactId, contactId]
      );
      return { jobs: rows, totalBooked: agg[0]?.total_booked ?? 0, totalPaid: agg[0]?.total_paid ?? 0 };
    },
  });

  if (!data || data.jobs.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-2 flex items-center gap-1">
        <PartyPopper size={12} /> Linked jobs
      </h3>
      {data.totalBooked > 0 && (
        <div className="flex gap-3 mb-2 text-xs text-text-secondary">
          <span>{data.totalBooked} booked</span>
          {data.totalPaid > 0 && <span>${(data.totalPaid / 100).toLocaleString("en-AU", { minimumFractionDigits: 0 })} paid</span>}
        </div>
      )}
      <div className="space-y-1">
        {data.jobs.map((job) => (
          <button key={job.id} onClick={() => navigate(`/events/${job.id}`)}
            className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg text-sm transition-colors">
            <span className="font-medium truncate flex-1">{job.name}</span>
            <span className="text-[10px] text-text-secondary font-mono shrink-0">{job.reference}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

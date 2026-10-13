import { useState } from "react";
import { Users, Plus, Search, Phone, Mail, X, ChevronRight } from "lucide-react";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from "../hooks/use-contacts";
import type { Contact } from "../data";

type Tab = "all" | "client" | "supplier" | "crew";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "client", label: "Clients" },
  { key: "supplier", label: "Suppliers" },
  { key: "crew", label: "Crew" },
];

export function ContactsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filter = tab === "all" ? undefined : tab;
  const { data: contacts = [], isLoading } = useContacts(filter);
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
    await createContact.mutateAsync(formToContact(data));
    setShowForm(false);
  };

  const handleUpdate = async (data: ContactFormData) => {
    if (!editingId) return;
    await updateContact.mutateAsync({ id: editingId, data: formToContact(data) });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact? They'll be moved to trash.")) return;
    await deleteContact.mutateAsync(id);
    if (selectedId === id) setSelectedId(null);
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
              {selected.notes && (
                <div className="mt-3 p-3 bg-bg rounded-lg text-xs text-text-secondary">
                  {selected.notes}
                </div>
              )}
            </div>
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
            <ContactForm
              contact={editingId ? contacts.find((c) => c.id === editingId) : undefined}
              onSave={editingId ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingId(null); }}
            />
          </div>
        )}
      </div>
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
    crew_rate_cents: data.crew_rate_cents ? parseInt(data.crew_rate_cents) * 100 : null,
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
  const [form, setForm] = useState<ContactFormData>({
    name: contact?.name ?? "",
    business_name: contact?.business_name ?? "",
    is_client: (contact?.is_client ?? 1) === 1,
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

      <Input label="Name *" value={form.name} onChange={(v) => set("name", v)} autoFocus />
      <Input label="Business name" value={form.business_name} onChange={(v) => set("business_name", v)} />

      <div className="flex gap-3">
        <Checkbox label="Client" checked={form.is_client} onChange={(v) => set("is_client", v)} />
        <Checkbox label="Supplier" checked={form.is_supplier} onChange={(v) => set("is_supplier", v)} />
        <Checkbox label="Crew" checked={form.is_crew} onChange={(v) => set("is_crew", v)} />
      </div>

      <Input label="Role" value={form.role} onChange={(v) => set("role", v)} placeholder="e.g. Florist, Helper" />
      <Input label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
      <Input label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
      <Input label="Address" value={form.address} onChange={(v) => set("address", v)} />
      <Input label="Instagram" value={form.instagram_handle} onChange={(v) => set("instagram_handle", v)} placeholder="Without @" />
      <Input label="Website" value={form.website} onChange={(v) => set("website", v)} />

      {form.is_crew && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input label="Rate ($)" value={form.crew_rate_cents} onChange={(v) => set("crew_rate_cents", v)} type="number" />
          </div>
          <div className="w-24">
            <label className="text-xs text-text-secondary">Per</label>
            <select
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
        <label className="text-xs text-text-secondary">Notes</label>
        <textarea
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-text-secondary">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
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

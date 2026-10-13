import { useState, useRef, useEffect } from "react";
import { Search, Plus, AlertCircle } from "lucide-react";
import { useSearchContacts, useCreateContact, useCheckDuplicates } from "../../hooks/use-contacts";
import type { Contact } from "../../data";

interface ContactLookupProps {
  label?: string;
  placeholder?: string;
  value: string | null;
  displayName?: string;
  onSelect: (contact: Contact) => void;
  onClear?: () => void;
  filter?: "client" | "supplier" | "crew";
}

/**
 * Reusable contact search with inline create and duplicate detection.
 * Used for client lookup, supplier selection, crew assignment, venue coordinator.
 */
export function ContactLookup({
  label,
  placeholder = "Search by name, phone or email...",
  value,
  displayName,
  onSelect,
  onClear,
}: ContactLookupProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newInstagram, setNewInstagram] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { data: results = [] } = useSearchContacts(query);
  const { data: duplicates = [] } = useCheckDuplicates(
    newPhone || undefined,
    newEmail || undefined,
    newName || undefined
  );
  const createContact = useCreateContact();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const contact = await createContact.mutateAsync({
      name: newName.trim(),
      business_name: null,
      is_client: 1,
      is_supplier: 0,
      is_crew: 0,
      role: null,
      phone: newPhone || null,
      email: newEmail || null,
      address: null,
      instagram_handle: newInstagram || null,
      website: null,
      crew_rate_cents: null,
      crew_rate_unit: null,
      notes: null,
      deleted_at: null,
    });
    onSelect(contact);
    setShowCreate(false);
    setOpen(false);
    setQuery("");
  };

  if (value && displayName) {
    return (
      <div>
        {label && <label className="text-xs text-text-secondary">{label}</label>}
        <div className="flex items-center gap-2 mt-1 px-3 py-1.5 bg-bg rounded-lg border border-border">
          <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm flex-1">{displayName}</span>
          {onClear && (
            <button
              onClick={onClear}
              className="text-xs text-text-secondary hover:text-danger"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      {label && <label className="text-xs text-text-secondary">{label}</label>}
      <div className="relative mt-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg outline-none focus:border-brand bg-surface"
        />
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-10 top-full mt-1 w-full bg-surface rounded-lg border border-border shadow-lg max-h-60 overflow-y-auto">
          {results.map((contact) => (
            <button
              key={contact.id}
              onClick={() => { onSelect(contact); setOpen(false); setQuery(""); }}
              className="w-full text-left px-3 py-2 hover:bg-bg flex items-center gap-2 text-sm"
            >
              <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-medium shrink-0">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate">{contact.name}</p>
                {contact.phone && (
                  <p className="text-xs text-text-secondary">{contact.phone}</p>
                )}
              </div>
            </button>
          ))}
          <button
            onClick={() => { setShowCreate(true); setNewName(query); }}
            className="w-full text-left px-3 py-2 hover:bg-bg flex items-center gap-2 text-sm text-brand border-t border-border"
          >
            <Plus size={14} />
            New contact "{query}"
          </button>
        </div>
      )}

      {showCreate && (
        <div className="absolute z-20 top-full mt-1 w-full bg-surface rounded-lg border border-border shadow-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">New contact</h4>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name *"
            autoFocus
            className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand"
          />
          <input
            type="text"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Phone"
            className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand"
          />
          <input
            type="text"
            value={newInstagram}
            onChange={(e) => setNewInstagram(e.target.value)}
            placeholder="Instagram (without @)"
            className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand"
          />

          {duplicates.length > 0 && (
            <div className="p-3 bg-need/10 border border-need/30 rounded-lg text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-need shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-need">Possible duplicate</p>
                  {duplicates.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { onSelect(d); setShowCreate(false); setOpen(false); setQuery(""); }}
                      className="block mt-1 text-left hover:underline"
                    >
                      {d.name} {d.phone && `(${d.phone})`} — Use existing?
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              className="flex-1 text-sm py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90 font-medium"
            >
              {duplicates.length > 0 ? "Create anyway" : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-sm py-1.5 px-3 rounded-lg border border-border hover:bg-bg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

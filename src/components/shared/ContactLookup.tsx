import { useEffect, useId, useMemo, useRef, useState } from "react";
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

export function ContactLookup({
  label, placeholder = "Search by name, phone or email...", value, displayName,
  onSelect, onClear, filter,
}: ContactLookupProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newInstagram, setNewInstagram] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const listId = useId();
  const createTitleId = useId();

  const { data: allResults = [] } = useSearchContacts(query);
  const results = useMemo(() => allResults.filter((contact) => !filter || contact[`is_${filter}`] === 1), [allResults, filter]);
  const { data: duplicates = [] } = useCheckDuplicates(newPhone || undefined, newEmail || undefined, newName || undefined);
  const createContact = useCreateContact();
  const listOpen = open && !showCreate && query.length >= 2;
  const optionCount = results.length + 1;
  const activeId = activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setShowCreate(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (showCreate) nameRef.current?.focus();
  }, [showCreate]);

  const select = (contact: Contact) => {
    onSelect(contact);
    setOpen(false);
    setShowCreate(false);
    setQuery("");
    setActiveIndex(-1);
  };

  const startCreate = () => {
    setNewName(query);
    setShowCreate(true);
    setOpen(false);
    setActiveIndex(-1);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const contact = await createContact.mutateAsync({
      name: newName.trim(), business_name: null,
      is_client: filter === "supplier" || filter === "crew" ? 0 : 1,
      is_supplier: filter === "supplier" ? 1 : 0,
      is_crew: filter === "crew" ? 1 : 0,
      role: null, phone: newPhone || null, email: newEmail || null, address: null,
      instagram_handle: newInstagram || null, website: null, crew_rate_cents: null,
      crew_rate_unit: null, notes: null, deleted_at: null,
    });
    select(contact);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (query.length < 2 || !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
    if (event.key === "Enter" && activeIndex < 0) return;
    event.preventDefault();
    if (event.key === "ArrowDown") {
      setOpen(true);
      setActiveIndex((current) => (current + 1 + optionCount) % optionCount);
    } else if (event.key === "ArrowUp") {
      setOpen(true);
      setActiveIndex((current) => (current <= 0 ? optionCount - 1 : current - 1));
    } else if (activeIndex < results.length) {
      select(results[activeIndex]);
    } else {
      startCreate();
    }
  };

  if (value && displayName) {
    return (
      <div>
        {label && <span className="text-xs text-text-secondary">{label}</span>}
        <div className="flex items-center gap-2 mt-1 px-3 py-1.5 bg-bg rounded-lg border border-border">
          <div aria-hidden="true" className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm flex-1">{displayName}</span>
          {onClear && <button type="button" onClick={onClear} aria-label={`Clear ${label ?? "contact"}`} className="text-text-secondary hover:text-danger px-1">×</button>}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      {label && <label htmlFor={inputId} className="text-xs text-text-secondary">{label}</label>}
      <div className="relative mt-1">
        <Search size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          ref={searchRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-label={label ? undefined : "Search contacts"}
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-activedescendant={activeId}
          autoComplete="off"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg outline-none focus:border-brand bg-surface"
        />
      </div>

      {listOpen && (
        <div id={listId} role="listbox" aria-label={`${label ?? "Contact"} results`} className="absolute z-10 top-full mt-1 w-full bg-surface rounded-lg border border-border shadow-lg max-h-60 overflow-y-auto">
          {results.map((contact, index) => (
            <button
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              type="button"
              key={contact.id}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(contact)}
              className="w-full text-left px-3 py-2 hover:bg-bg flex items-center gap-2 text-sm"
            >
              <div aria-hidden="true" className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-medium shrink-0">{contact.name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0"><p className="truncate">{contact.name}</p>{contact.phone && <p className="text-xs text-text-secondary">{contact.phone}</p>}</div>
            </button>
          ))}
          <button
            id={`${listId}-option-${results.length}`}
            role="option"
            aria-selected={activeIndex === results.length}
            type="button"
            onMouseEnter={() => setActiveIndex(results.length)}
            onClick={startCreate}
            className="w-full text-left px-3 py-2 hover:bg-bg flex items-center gap-2 text-sm text-brand border-t border-border"
          >
            <Plus size={14} aria-hidden="true" /> New contact "{query}"
          </button>
        </div>
      )}

      {showCreate && (
        <div
          role="dialog"
          aria-labelledby={createTitleId}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            closeCreate();
          }}
          className="absolute z-20 top-full mt-1 w-full bg-surface rounded-lg border border-border shadow-lg p-4 space-y-2"
        >
          <h2 id={createTitleId} className="text-sm font-medium">New contact</h2>
          <label className="sr-only" htmlFor={`${inputId}-name`}>Name</label>
          <input id={`${inputId}-name`} ref={nameRef} type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name *" className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand" />
          <label className="sr-only" htmlFor={`${inputId}-phone`}>Phone</label>
          <input id={`${inputId}-phone`} type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand" />
          <label className="sr-only" htmlFor={`${inputId}-email`}>Email</label>
          <input id={`${inputId}-email`} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand" />
          <label className="sr-only" htmlFor={`${inputId}-instagram`}>Instagram handle</label>
          <input id={`${inputId}-instagram`} type="text" value={newInstagram} onChange={(e) => setNewInstagram(e.target.value)} placeholder="Instagram (without @)" className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand" />

          {duplicates.length > 0 && (
            <div className="p-3 bg-need/10 border border-need/30 rounded-lg text-xs">
              <div className="flex items-start gap-2"><AlertCircle size={14} aria-hidden="true" className="text-need shrink-0 mt-0.5" /><div>
                <p className="font-medium text-need">Possible duplicate</p>
                {duplicates.map((duplicate) => <button type="button" key={duplicate.id} onClick={() => select(duplicate)} className="block mt-1 text-left hover:underline">{duplicate.name} {duplicate.phone && `(${duplicate.phone})`} — Use existing?</button>)}
              </div></div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleCreate} className="flex-1 text-sm py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90 font-medium">{duplicates.length > 0 ? "Create anyway" : "Create"}</button>
            <button type="button" onClick={closeCreate} className="text-sm py-1.5 px-3 rounded-lg border border-border hover:bg-bg">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

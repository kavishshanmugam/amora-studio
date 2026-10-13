import { useState } from "react";
import { Plus, Phone, Mail, Instagram, X, Clock } from "lucide-react";
import { useEventContacts, useLinkContact, useUnlinkContact } from "../../hooks/use-event-contacts";
import { useContact } from "../../hooks/use-contacts";
import { ContactLookup } from "../shared/ContactLookup";
import type { AmoraEvent, EventContact } from "../../data";

export function ContactsTab({ event }: { event: AmoraEvent }) {
  const { data: links = [] } = useEventContacts(event.id);
  const linkContact = useLinkContact();
  const unlinkContact = useUnlinkContact();
  const [showAdd, setShowAdd] = useState(false);

  const handleLink = (contactId: string, role: string) => {
    linkContact.mutate({
      event_id: event.id,
      contact_id: contactId,
      role_on_event: role || null,
      event_notes: null,
      call_time: null,
      hours: null,
    });
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      {/* Client card */}
      {event.client_id && <ContactCard contactId={event.client_id} roleLabel="Client" />}

      {/* Linked contacts */}
      {links.map((link) => (
        <EventContactCard
          key={link.id}
          link={link}
          onUnlink={() => unlinkContact.mutate({ eventId: event.id, contactId: link.contact_id })}
        />
      ))}

      {/* Add contact */}
      {showAdd ? (
        <AddContactForm onAdd={handleLink} onCancel={() => setShowAdd(false)} />
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-brand border border-dashed border-brand/30 rounded-xl hover:bg-brand/5">
          <Plus size={14} /> Add supplier / crew / contact
        </button>
      )}

      {links.length === 0 && !event.client_id && !showAdd && (
        <p className="text-sm text-text-secondary text-center py-4">No contacts linked to this event.</p>
      )}
    </div>
  );
}

function ContactCard({ contactId, roleLabel }: { contactId: string; roleLabel: string }) {
  const { data: contact } = useContact(contactId);
  if (!contact) return null;

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">{roleLabel}</span>
      </div>
      <p className="text-sm font-medium">{contact.name}</p>
      {contact.business_name && <p className="text-xs text-text-secondary">{contact.business_name}</p>}
      <div className="flex gap-3 mt-2 text-xs text-text-secondary">
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-brand">
            <Phone size={12} /> {contact.phone}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-brand">
            <Mail size={12} /> {contact.email}
          </a>
        )}
        {contact.instagram_handle && (
          <span className="flex items-center gap-1">
            <Instagram size={12} /> @{contact.instagram_handle}
          </span>
        )}
      </div>
    </div>
  );
}

function EventContactCard({ link, onUnlink }: {
  link: EventContact; onUnlink: () => void;
}) {
  const { data: contact } = useContact(link.contact_id);

  if (!contact) return null;

  const roleLabel = link.role_on_event || contact.role || (contact.is_supplier ? "Supplier" : contact.is_crew ? "Crew" : "Contact");

  return (
    <div className="bg-surface rounded-xl border border-border p-4 group">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">{roleLabel}</span>
          </div>
          <p className="text-sm font-medium">{contact.name}</p>
          {contact.business_name && <p className="text-xs text-text-secondary">{contact.business_name}</p>}
          <div className="flex gap-3 mt-2 text-xs text-text-secondary">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-brand">
                <Phone size={12} /> {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-brand">
                <Mail size={12} /> {contact.email}
              </a>
            )}
            {contact.instagram_handle && (
              <span className="flex items-center gap-1">
                <Instagram size={12} /> @{contact.instagram_handle}
              </span>
            )}
          </div>
          {link.call_time && (
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
              <Clock size={12} /> Call time: {link.call_time}
            </p>
          )}
          {link.event_notes && <p className="text-xs text-text-secondary mt-1 italic">{link.event_notes}</p>}
        </div>
        <button onClick={onUnlink} className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-danger" title="Unlink">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function AddContactForm({ onAdd, onCancel }: {
  onAdd: (contactId: string, role: string) => void;
  onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [role, setRole] = useState("");

  return (
    <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
      <ContactLookup
        label="Contact"
        value={selectedId}
        displayName={selectedName}
        onSelect={(c) => { setSelectedId(c.id); setSelectedName(c.name); }}
        onClear={() => { setSelectedId(null); setSelectedName(""); }}
      />
      <input
        type="text"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="Role on this event (e.g. Florist, Helper)"
        className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (selectedId) onAdd(selectedId, role); }}
          disabled={!selectedId}
          className="text-sm px-4 py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50"
        >
          Link
        </button>
        <button onClick={onCancel} className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-bg">
          Cancel
        </button>
      </div>
    </div>
  );
}

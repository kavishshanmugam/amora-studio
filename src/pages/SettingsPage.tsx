import { useState, useRef, useId } from "react";
import { Check, Trash2, RotateCcw, AlertTriangle, Hash, Plus, X, Download, Upload, ImageIcon } from "lucide-react";
import { useSettings, useUpdateSetting } from "../hooks/use-settings";
import { useTrash, useRestoreItem, usePermanentDelete } from "../hooks/use-trash";
import type { TrashItem } from "../hooks/use-trash";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDb } from "../data";
import { uid } from "../data/uid";
import {
  BACKUP_TABLES,
  createBackupData,
  parseBackup,
  restoreBackup,
  type BackupData,
} from "../utils/backup-restore";
import { localDateKey } from "../utils/events-core";

const BUSINESS_FIELDS = [
  { key: "business_name", label: "Business name", placeholder: "Amora Events" },
  { key: "business_abn", label: "ABN", placeholder: "Optional — printed on quotes" },
  { key: "business_phone", label: "Phone", placeholder: "" },
  { key: "business_email", label: "Email", placeholder: "" },
  { key: "business_instagram", label: "Instagram handle", placeholder: "Without @" },
  { key: "business_website", label: "Website", placeholder: "" },
  { key: "deposit_percent", label: "Default deposit (%)", placeholder: "30" },
  { key: "quote_validity_days", label: "Quote validity (days)", placeholder: "14" },
  { key: "reference_prefix", label: "Reference prefix", placeholder: "AE" },
  { key: "payment_terms", label: "Payment terms (on quotes)", placeholder: "Payment due within 14 days" },
];

const LIST_FIELDS = [
  {
    key: "event_types",
    label: "Event types",
    defaults: "Wedding,Engagement,Birthday,Baby shower,Bridal shower,Christening/Baptism,Gender reveal,Proposal,Corporate,Other",
  },
  {
    key: "lead_sources",
    label: "Lead sources",
    defaults: "Instagram,Referral,Repeat client,Google,Website,Facebook,Wedding expo,Other",
  },
  {
    key: "expense_categories",
    label: "Expense categories",
    defaults: "Materials,Balloons,Florals,Supplier hire,Crew,Fuel/travel,Other",
  },
  {
    key: "supplier_roles",
    label: "Supplier / crew roles",
    defaults: "Florist,Balloon supplier,Hire company,Cake,Signage,Helper,Photographer,Videographer,DJ,Other",
  },
];

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const [saved, setSaved] = useState<string | null>(null);

  const getValue = (key: string): string => {
    return settings?.find((s) => s.key === key)?.value ?? "";
  };

  const handleSave = async (key: string, value: string) => {
    await updateSetting.mutateAsync({ key, value });
    setSaved(key);
    setTimeout(() => setSaved(null), 1500);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold mb-6">Settings</h1>
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-display text-3xl font-bold">Settings</h1>

      {/* Business settings */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-4">
          Business
        </h2>
        <div className="bg-surface rounded-xl border border-border divide-y divide-border">
          {BUSINESS_FIELDS.map((field) => (
            <SettingRow
              key={field.key}
              label={field.label}
              value={getValue(field.key)}
              placeholder={field.placeholder}
              saved={saved === field.key}
              onSave={(value) => handleSave(field.key, value)}
            />
          ))}
        </div>
      </section>

      {/* Logo upload */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-4">
          Logo
        </h2>
        <LogoUpload
          currentLogo={settings?.find((s) => s.key === "business_logo")?.value ?? null}
          onSave={(dataUrl) => handleSave("business_logo", dataUrl)}
          onRemove={() => handleSave("business_logo", "")}
        />
      </section>

      {/* Editable lists */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-4">
          Lists
        </h2>
        <div className="space-y-4">
          {LIST_FIELDS.map((list) => (
            <EditableList
              key={list.key}
              label={list.label}
              value={getValue(list.key) || list.defaults}
              saved={saved === list.key}
              onSave={(value) => handleSave(list.key, value)}
            />
          ))}
        </div>
      </section>

      {/* Reminder settings */}
      <ReminderSettingsSection getValue={getValue} onSave={handleSave} saved={saved} />

      {/* Hashtag sets */}
      <HashtagSetsSection />

      {/* Backup & Restore */}
      <BackupSection />

      {/* Trash */}
      <TrashSection />

      {/* About */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-4">
          About
        </h2>
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-sm">
            <span className="font-medium">Amora Studio</span>{" "}
            <span className="text-text-secondary">v0.1.0</span>
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Database: 001_initial
          </p>
        </div>
      </section>
    </div>
  );
}

const TYPE_LABELS: Record<TrashItem["type"], string> = {
  event: "Event",
  contact: "Contact",
  venue: "Venue",
  catalogue: "Price list",
  inventory: "Inventory",
};

function TrashSection() {
  const { data: items = [] } = useTrash();
  const restoreItem = useRestoreItem();
  const permanentDelete = usePermanentDelete();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-4">
        <span className="flex items-center gap-2">
          <Trash2 size={14} />
          Trash
          {items.length > 0 && (
            <span className="text-[10px] bg-bg px-1.5 py-0.5 rounded-full">{items.length}</span>
          )}
        </span>
      </h2>
      <div className="bg-surface rounded-xl border border-border">
        {items.length === 0 ? (
          <p className="p-5 text-sm text-text-secondary">Trash is empty.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.name}</p>
                  <p className="text-[10px] text-text-secondary">
                    {TYPE_LABELS[item.type]} &middot; deleted {new Date(item.deleted_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => restoreItem.mutate({ id: item.id, type: item.type })}
                  className="text-xs text-brand hover:underline flex items-center gap-1"
                  title="Restore"
                >
                  <RotateCcw size={12} /> Restore
                </button>
                {confirmId === item.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { permanentDelete.mutate({ id: item.id, type: item.type }); setConfirmId(null); }}
                      className="text-xs text-danger font-medium hover:underline"
                    >
                      Confirm
                    </button>
                    <button onClick={() => setConfirmId(null)} className="text-xs text-text-secondary hover:underline">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(item.id)}
                    className="text-xs text-text-secondary hover:text-danger flex items-center gap-1"
                    title="Delete permanently"
                  >
                    <AlertTriangle size={12} /> Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SettingRow({
  label,
  value,
  placeholder,
  saved,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  saved: boolean;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleBlur = () => {
    if (draft !== value) {
      onSave(draft);
    }
    setEditing(false);
  };

  const fieldId = useId();
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <label htmlFor={fieldId} className="w-44 text-sm text-text-secondary shrink-0">{label}</label>
      <div className="flex-1 relative">
        {editing ? (
          <input
            id={fieldId}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleBlur();
              if (e.key === "Escape") { setDraft(value); setEditing(false); }
            }}
            placeholder={placeholder}
            autoFocus
            className="w-full text-sm px-2 py-1 border border-brand rounded outline-none"
          />
        ) : (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="w-full text-left text-sm px-2 py-1 rounded hover:bg-bg transition-colors"
          >
            {value || <span className="text-text-secondary/50">{placeholder}</span>}
          </button>
        )}
      </div>
      {saved && <Check size={16} className="text-success shrink-0" />}
    </div>
  );
}

function EditableList({
  label,
  value,
  saved,
  onSave,
}: {
  label: string;
  value: string;
  saved: boolean;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const items = value.split(",").filter(Boolean);
  const [draft, setDraft] = useState(items);
  const [newItem, setNewItem] = useState("");

  const save = (updated: string[]) => {
    setDraft(updated);
    onSave(updated.join(","));
  };

  const addItem = () => {
    const trimmed = newItem.trim();
    if (trimmed && !draft.includes(trimmed)) {
      save([...draft, trimmed]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    save(draft.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">{label}</h3>
        <div className="flex items-center gap-2">
          {saved && <Check size={14} className="text-success" />}
          <button
            onClick={() => { setDraft(items); setEditing(!editing); }}
            className="text-xs text-brand hover:underline"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(editing ? draft : items).map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-xs bg-bg px-2.5 py-1 rounded-full"
          >
            {item}
            {editing && (
              <button
                onClick={() => removeItem(i)}
                className="text-text-secondary hover:text-danger ml-0.5"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {editing && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
            placeholder="Add item..."
            className="text-sm px-3 py-1.5 border border-border rounded-lg flex-1 outline-none focus:border-brand"
          />
          <button
            onClick={addItem}
            className="text-sm px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

// --- Reminder Settings ---

const REMINDER_SETTINGS = [
  { key: "remind_event_upcoming", label: "Event coming up", defaultValue: "2w,1w,1d", help: "Before event" },
  { key: "remind_enquiry_followup", label: "Enquiry follow-up", defaultValue: "on", help: "On follow-up date" },
  { key: "remind_quote_no_reply", label: "Quote no reply", defaultValue: "5d", help: "After quote sent" },
  { key: "remind_quote_expiring", label: "Quote expiring", defaultValue: "2d", help: "Before valid-until" },
  { key: "remind_deposit_due", label: "Deposit due", defaultValue: "3d,0d", help: "Before due date" },
  { key: "remind_balance_due", label: "Balance due", defaultValue: "1w,0d", help: "Before due date" },
  { key: "remind_overdue_repeat", label: "Overdue payment repeat", defaultValue: "3d", help: "Repeat interval" },
  { key: "remind_checklist_task", label: "Checklist task due", defaultValue: "0d", help: "Morning of" },
  { key: "remind_final_details", label: "Final details with client", defaultValue: "2w", help: "Before event" },
  { key: "remind_supplier_due_back", label: "Supplier hire due back", defaultValue: "1d,0d", help: "Before due" },
  { key: "remind_bond_refund", label: "Bond refund", defaultValue: "2d", help: "After event" },
  { key: "remind_instagram_post", label: "Post to Instagram", defaultValue: "3d", help: "After event" },
];

function ReminderSettingsSection({
  getValue,
  onSave,
  saved,
}: {
  getValue: (key: string) => string;
  onSave: (key: string, value: string) => void;
  saved: string | null;
}) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-4">
        Reminder settings
      </h2>
      <div className="bg-surface rounded-xl border border-border divide-y divide-border">
        {REMINDER_SETTINGS.map((r) => {
          const val = getValue(r.key) || r.defaultValue;
          return (
            <div key={r.key} className="flex items-center gap-4 px-5 py-3">
              <div className="w-48 shrink-0">
                <p className="text-sm">{r.label}</p>
                <p className="text-[10px] text-text-secondary">{r.help}</p>
              </div>
              <input
                type="text"
                defaultValue={val}
                onBlur={(e) => onSave(r.key, e.target.value)}
                className="flex-1 text-sm px-2 py-1 border border-border rounded outline-none focus:border-brand bg-transparent"
              />
              {saved === r.key && <Check size={14} className="text-success shrink-0" />}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-text-secondary mt-2">
        Use: 0d = day of, 1d = 1 day, 1w = 1 week, 2w = 2 weeks. Comma-separate for multiple. "off" to disable.
      </p>
    </section>
  );
}

// --- Hashtag Sets ---

function HashtagSetsSection() {
  const qc = useQueryClient();
  const { data: sets = [] } = useQuery({
    queryKey: ["hashtag-sets"],
    queryFn: async () => {
      const db = await getDb();
      return db.select<{ id: string; name: string; tags: string }[]>(
        "SELECT * FROM hashtag_sets ORDER BY name"
      );
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");

  const addSet = useMutation({
    mutationFn: async () => {
      const db = await getDb();
      const id = uid();
      const now = new Date().toISOString();
      await db.execute(
        "INSERT INTO hashtag_sets (id, name, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [id, name.trim(), tags.trim(), now, now]
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hashtag-sets"] });
      setName("");
      setTags("");
      setShowAdd(false);
    },
  });

  const deleteSet = useMutation({
    mutationFn: async (id: string) => {
      const db = await getDb();
      await db.execute("DELETE FROM hashtag_sets WHERE id = ?", [id]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hashtag-sets"] }),
  });

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-4">
        <span className="flex items-center gap-2">
          <Hash size={14} /> Hashtag sets
        </span>
      </h2>
      <div className="bg-surface rounded-xl border border-border">
        {sets.length === 0 && !showAdd ? (
          <p className="p-5 text-sm text-text-secondary">
            No hashtag sets. Create one for quick insertion in Instagram posts.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {sets.map((set) => (
              <div key={set.id} className="flex items-start gap-3 px-5 py-3 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{set.name}</p>
                  <p className="text-xs text-text-secondary mt-0.5 break-all">{set.tags}</p>
                </div>
                <button
                  onClick={() => deleteSet.mutate(set.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="p-5 border-t border-border space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Set name (e.g. Wedding)"
              className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand"
              autoFocus
            />
            <textarea
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="#wedding #melbournewedding #bridetobe..."
              rows={2}
              className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => addSet.mutate()}
                disabled={!name.trim() || !tags.trim()}
                className="text-sm px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50"
              >
                Save
              </button>
              <button onClick={() => setShowAdd(false)} className="text-sm text-text-secondary hover:underline">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-t border-border">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-brand hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Add hashtag set
          </button>
        </div>
      </div>
    </section>
  );
}

// --- Backup & Restore ---

function BackupSection() {
  const [status, setStatus] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<{ name: string; data: BackupData } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleBackup = async () => {
    try {
      setStatus("Creating backup...");
      const db = await getDb();
      const data = await createBackupData(db);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `amora-backup-${localDateKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Backup downloaded!");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus("Backup failed: " + String(err));
    }
  };

  const handleCsvExport = async () => {
    try {
      setStatus("Exporting CSV...");
      const db = await getDb();
      const events = await db.select<Record<string, unknown>[]>(
        `SELECT e.reference, e.name, e.status, e.event_type, e.start_date, e.end_date,
          e.start_time, e.end_time, e.guest_count, e.table_count, e.lead_source,
          e.enquiry_date, e.quote_sent_date, e.contract_signed_date,
          c.name as client_name, c.phone as client_phone, c.email as client_email,
          v.name as venue_name
         FROM events e
         LEFT JOIN contacts c ON e.client_id = c.id
         LEFT JOIN venues v ON e.venue_id = v.id
         WHERE e.deleted_at IS NULL
         ORDER BY e.start_date DESC`
      );
      if (events.length === 0) { setStatus("No events to export."); return; }
      const headers = Object.keys(events[0]);
      const csvRows = [
        headers.join(","),
        ...events.map((row) =>
          headers.map((h) => {
            const val = String(row[h] ?? "");
            return val.includes(",") || val.includes('"') || val.includes("\n")
              ? `"${val.replace(/"/g, '""')}"` : val;
          }).join(",")
        ),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `amora-events-${localDateKey()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("CSV exported!");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus("CSV export failed: " + String(err));
    }
  };

  const handleRestoreFile = async (file: File | undefined) => {
    setSelectedBackup(null);
    if (!file) return;
    try {
      setStatus("Validating backup...");
      const data = parseBackup(await file.text());
      setSelectedBackup({ name: file.name, data });
      setStatus(null);
    } catch (err) {
      setStatus("Restore failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    try {
      setBusy(true);
      setStatus("Restoring...");
      const db = await getDb();
      await restoreBackup(db, selectedBackup.data);
      await queryClient.invalidateQueries();
      setSelectedBackup(null);
      setStatus("Restore complete! Refresh to see changes.");
    } catch (err) {
      setStatus("Restore failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-4">
        Backup & Restore
      </h2>
      <div className="bg-surface rounded-xl border border-border p-5 space-y-3">
        <p className="text-sm text-text-secondary">
          Export all your data as a JSON backup, or restore from a previous backup.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 text-sm bg-text-primary text-white px-4 py-2 rounded-lg hover:bg-brand transition-colors"
          >
            <Download size={14} /> Export backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-lg hover:bg-bg transition-colors disabled:opacity-50"
          >
            <Upload size={14} /> Restore from backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            aria-label="Choose backup file"
            className="hidden"
            onChange={(event) => void handleRestoreFile(event.target.files?.[0])}
          />
          <button
            onClick={handleCsvExport}
            className="flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-lg hover:bg-bg transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
        {selectedBackup && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 space-y-2">
            <p className="text-xs text-danger">
              This will replace data in {BACKUP_TABLES.filter((table) => Object.prototype.hasOwnProperty.call(selectedBackup.data, table)).length} tables from {selectedBackup.name}.
              This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void handleRestore()}
                disabled={busy}
                className="text-xs px-3 py-1.5 bg-danger text-white rounded-lg disabled:opacity-50"
              >
                {busy ? "Restoring..." : "Confirm restore"}
              </button>
              <button
                onClick={() => setSelectedBackup(null)}
                disabled={busy}
                className="text-xs px-3 py-1.5 text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {status && (
          <p role="status" className="text-xs text-brand">{status}</p>
        )}
      </div>
    </section>
  );
}

function LogoUpload({ currentLogo, onSave, onRemove }: {
  currentLogo: string | null;
  onSave: (dataUrl: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      alert("Logo must be under 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onSave(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center gap-4">
        {currentLogo ? (
          <img src={currentLogo} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-border" />
        ) : (
          <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center">
            <ImageIcon size={24} className="text-text-secondary/30" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm text-text-secondary mb-2">
            {currentLogo ? "Logo uploaded" : "Upload your business logo for quotes and day sheets."}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-bg transition-colors">
              {currentLogo ? "Change" : "Upload"}
            </button>
            {currentLogo && (
              <button type="button" onClick={onRemove}
                className="text-xs px-3 py-1.5 text-danger hover:bg-danger/5 rounded-lg transition-colors">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleFile} className="hidden" />
    </div>
  );
}

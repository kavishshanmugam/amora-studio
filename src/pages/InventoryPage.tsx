import { useState, useId } from "react";
import { Package, Plus, Search, X, ChevronRight, CalendarDays, AlertTriangle } from "lucide-react";
import { useInventoryItems, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem, useRestoreInventoryItem } from "../hooks/use-inventory";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { useToast } from "../components/shared/Toast";
import { useQuery } from "@tanstack/react-query";
import { getDb } from "../data";
import type { InventoryItem } from "../data";
import { format } from "date-fns";
import { localDateKey } from "../utils/events-core";

const CONDITIONS = ["good", "needs_repair", "retired"] as const;
const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  good: { label: "Good", color: "text-success bg-success/10" },
  needs_repair: { label: "Needs repair", color: "text-need bg-need/10" },
  retired: { label: "Retired", color: "text-text-secondary bg-bg" },
};

export function InventoryPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useInventoryItems();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();

  const filtered = search
    ? items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.category?.toLowerCase().includes(search.toLowerCase()) ||
        i.storage_location?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const selected = selectedId ? items.find((i) => i.id === selectedId) : null;

  const handleCreate = async (data: InvFormData) => {
    await createItem.mutateAsync(formToInventory(data));
    setShowForm(false);
  };

  const handleUpdate = async (data: InvFormData) => {
    if (!editingId) return;
    await updateItem.mutateAsync({ id: editingId, data: inventoryFormToPatch(data) });
    setEditingId(null);
  };

  const restoreItem = useRestoreInventoryItem();
  const toast = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const handleDelete = (id: string) => setDeleteId(id);
  const confirmDelete = async () => {
    if (deleteId) {
      const did = deleteId;
      await deleteItem.mutateAsync(did);
      if (selectedId === did) setSelectedId(null);
      toast.show("Item deleted", { onUndo: () => restoreItem.mutate(did) });
    }
    setDeleteId(null);
  };

  return (
    <div className="max-w-5xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-3xl font-bold">Inventory</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-2 bg-text-primary text-white rounded-full py-2 px-5 text-sm font-medium hover:bg-brand transition-colors"
        >
          <Plus size={16} />
          Add item
        </button>
      </div>

      <div className="relative max-w-xs mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inventory..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand bg-surface"
        />
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Package size={48} className="mx-auto text-text-secondary/30 mb-4" />
              <p className="text-text-secondary">
                {search ? "No items match." : "No hire stock items yet."}
              </p>
              {!search && (
                <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-brand hover:underline">
                  Add your first item
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-bg/50 transition-colors ${
                    selectedId === item.id ? "bg-highlight/30" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-bg flex items-center justify-center shrink-0">
                    <Package size={16} className="text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.category && (
                        <span className="text-xs text-text-secondary">{item.category}</span>
                      )}
                      <span className="text-xs text-text-secondary">×{item.quantity_owned}</span>
                    </div>
                  </div>
                  <ConditionBadge condition={item.condition} />
                  <span className="text-sm font-mono text-text-secondary">
                    ${(item.hire_price_cents / 100).toFixed(2)}
                  </span>
                  <ChevronRight size={14} className="text-text-secondary/30 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && !showForm && !editingId && (
          <div className="w-80 bg-surface rounded-xl border border-border p-5 overflow-y-auto shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-bg flex items-center justify-center">
                <Package size={20} className="text-text-secondary" />
              </div>
              <button onClick={() => setSelectedId(null)} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <h2 className="text-lg font-medium mb-1">{selected.name}</h2>
            <ConditionBadge condition={selected.condition} />

            <div className="space-y-3 text-sm mt-4">
              {selected.category && <DetailRow label="Category" value={selected.category} />}
              <DetailRow label="Quantity owned" value={String(selected.quantity_owned)} />
              <DetailRow label="Hire price" value={`$${(selected.hire_price_cents / 100).toFixed(2)}`} />
              {selected.replacement_cost_cents != null && (
                <DetailRow label="Replacement cost" value={`$${(selected.replacement_cost_cents / 100).toFixed(2)}`} />
              )}
              {selected.storage_location && <DetailRow label="Storage" value={selected.storage_location} />}
              {selected.notes && (
                <div className="mt-3 p-3 bg-bg rounded-lg text-xs text-text-secondary">{selected.notes}</div>
              )}
            </div>

            <UpcomingJobs itemId={selected.id} />
            <DamageHistory itemId={selected.id} />

            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditingId(selected.id)} className="flex-1 text-sm py-2 rounded-lg border border-border hover:bg-bg transition-colors">
                Edit
              </button>
              <button onClick={() => handleDelete(selected.id)} className="text-sm py-2 px-4 rounded-lg text-danger hover:bg-danger/5 transition-colors">
                Delete
              </button>
            </div>
          </div>
        )}

        {(showForm || editingId) && (
          <div className="w-80 bg-surface rounded-xl border border-border p-5 overflow-y-auto shrink-0">
            <InvForm
              item={editingId ? items.find((i) => i.id === editingId) : undefined}
              onSave={editingId ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingId(null); }}
            />
          </div>
        )}
      </div>
      <ConfirmDialog open={deleteId !== null} title="Move item to trash?" message="This inventory item will be moved to trash. You can undo this action."
        confirmLabel="Delete" danger onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function ConditionBadge({ condition }: { condition: string }) {
  const info = CONDITION_LABELS[condition] ?? CONDITION_LABELS.good;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${info.color}`}>
      {info.label}
    </span>
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

export interface InvFormData {
  name: string;
  category: string;
  quantity_owned: string;
  hire_price: string;
  replacement_cost: string;
  storage_location: string;
  condition: string;
  notes: string;
}

export function inventoryFormToPatch(data: InvFormData): Partial<InventoryItem> {
  return {
    name: data.name.trim(),
    category: data.category || null,
    quantity_owned: parseInt(data.quantity_owned || "0"),
    hire_price_cents: Math.round(parseFloat(data.hire_price || "0") * 100),
    replacement_cost_cents: data.replacement_cost ? Math.round(parseFloat(data.replacement_cost) * 100) : null,
    storage_location: data.storage_location || null,
    condition: data.condition || "good",
    notes: data.notes || null,
  };
}

function formToInventory(data: InvFormData): Omit<InventoryItem, "id" | "created_at" | "updated_at"> {
  return {
    ...inventoryFormToPatch(data) as Omit<InventoryItem, "id" | "created_at" | "updated_at">,
    photo: null,
    deleted_at: null,
  };
}

type InvErrorKey = "name" | "quantity_owned" | "hire_price" | "replacement_cost";

export function validateInventoryForm(data: InvFormData): Partial<Record<InvErrorKey, string>> {
  const errors: Partial<Record<InvErrorKey, string>> = {};
  const quantity = Number(data.quantity_owned);
  const hirePrice = Number(data.hire_price);
  const replacementCost = Number(data.replacement_cost);
  if (!data.name.trim()) errors.name = "Enter an item name.";
  if (data.quantity_owned.trim() === "" || !Number.isInteger(quantity) || quantity < 0) {
    errors.quantity_owned = "Enter a whole quantity of 0 or more.";
  }
  if (data.hire_price.trim() === "" || !Number.isFinite(hirePrice) || hirePrice < 0) {
    errors.hire_price = "Enter a hire price of 0 or more.";
  }
  if (data.replacement_cost.trim() !== "" && (!Number.isFinite(replacementCost) || replacementCost < 0)) {
    errors.replacement_cost = "Enter a replacement cost of 0 or more, or leave it blank.";
  }
  return errors;
}

function InvForm({ item, onSave, onCancel }: {
  item?: InventoryItem;
  onSave: (data: InvFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<InvFormData>({
    name: item?.name ?? "",
    category: item?.category ?? "",
    quantity_owned: item ? String(item.quantity_owned) : "1",
    hire_price: item ? (item.hire_price_cents / 100).toFixed(2) : "",
    replacement_cost: item?.replacement_cost_cents ? (item.replacement_cost_cents / 100).toFixed(2) : "",
    storage_location: item?.storage_location ?? "",
    condition: item?.condition ?? "good",
    notes: item?.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<InvErrorKey, string>>>({});

  const set = (key: keyof InvFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateInventoryForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <h3 className="text-sm font-medium mb-2">{item ? "Edit item" : "New item"}</h3>

      <Field label="Name *" value={form.name} onChange={(v) => set("name", v)} autoFocus required error={errors.name} />
      <Field label="Category" value={form.category} onChange={(v) => set("category", v)} placeholder="e.g. Arches, Plinths" />

      <div className="flex gap-2">
        <Field label="Qty owned" value={form.quantity_owned} onChange={(v) => set("quantity_owned", v)} type="number" min="0" step="1" error={errors.quantity_owned} />
        <Field label="Hire price ($)" value={form.hire_price} onChange={(v) => set("hire_price", v)} type="number" min="0" error={errors.hire_price} />
      </div>

      <Field label="Replacement cost ($)" value={form.replacement_cost} onChange={(v) => set("replacement_cost", v)} type="number" min="0" error={errors.replacement_cost} />
      <Field label="Storage location" value={form.storage_location} onChange={(v) => set("storage_location", v)} placeholder="e.g. Garage shelf B" />

      <ConditionSelect value={form.condition} onChange={(v) => set("condition", v)} />

      <NotesArea value={form.notes} onChange={(v) => set("notes", v)} />

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 text-sm py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium">
          {item ? "Save" : "Create"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm py-2 px-4 rounded-lg border border-border hover:bg-bg transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", autoFocus, required, min, step, error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean; required?: boolean; min?: string; step?: string; error?: string;
}) {
  const id = useId();
  return (
    <div className="flex-1">
      <label htmlFor={id} className="text-xs text-text-secondary">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoFocus={autoFocus} required={required} min={min} step={step ?? (type === "number" ? "0.01" : undefined)}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
      {error && <p id={`${id}-error`} className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

function ConditionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-xs text-text-secondary">Condition</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
        {CONDITIONS.map((c) => (
          <option key={c} value={c}>{CONDITION_LABELS[c].label}</option>
        ))}
      </select>
    </div>
  );
}

function NotesArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-xs text-text-secondary">Notes</label>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className="w-full text-sm mt-1 px-3 py-2 border border-border rounded-lg outline-none focus:border-brand bg-surface resize-none" />
    </div>
  );
}

function UpcomingJobs({ itemId }: { itemId: string }) {
  const { data: jobs = [] } = useQuery({
    queryKey: ["inventory-jobs", itemId],
    queryFn: async () => {
      const db = await getDb();
      return db.select<{ event_id: string; event_name: string; start_date: string; quantity: number; status: string }[]>(
        `SELECT e.id as event_id, e.name as event_name, e.start_date, SUM(si.quantity) as quantity, e.status
         FROM styling_items si
         JOIN events e ON si.event_id = e.id
         WHERE si.inventory_item_id = ?
           AND e.deleted_at IS NULL
           AND e.status NOT IN ('cancelled', 'lost')
         GROUP BY e.id
         ORDER BY e.start_date DESC
         LIMIT 10`,
        [itemId],
      );
    },
  });

  if (jobs.length === 0) return null;

  const today = localDateKey();
  const upcoming = jobs.filter((j) => j.start_date >= today);
  const past = jobs.filter((j) => j.start_date < today);

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium flex items-center gap-1 mb-2">
        <CalendarDays size={12} /> Booked jobs ({jobs.length})
      </h4>
      <div className="space-y-1.5">
        {upcoming.map((j) => (
          <div key={j.event_id} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
            <span className="flex-1 truncate">{j.event_name}</span>
            <span className="text-text-secondary">×{j.quantity}</span>
            <span className="text-text-secondary">{formatShort(j.start_date)}</span>
          </div>
        ))}
        {past.length > 0 && upcoming.length > 0 && (
          <div className="text-[10px] text-text-secondary/60 uppercase tracking-wider pt-1">Past</div>
        )}
        {past.slice(0, 5).map((j) => (
          <div key={j.event_id} className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-border shrink-0" />
            <span className="flex-1 truncate">{j.event_name}</span>
            <span>×{j.quantity}</span>
            <span>{formatShort(j.start_date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DamageHistory({ itemId }: { itemId: string }) {
  const { data: damages = [] } = useQuery({
    queryKey: ["inventory-damage", itemId],
    queryFn: async () => {
      const db = await getDb();
      return db.select<{ event_name: string; start_date: string; damaged_qty: number; missing_qty: number; damage_note: string | null }[]>(
        `SELECT e.name as event_name, e.start_date, si.damaged_qty, si.missing_qty, si.damage_note
         FROM styling_items si
         JOIN events e ON si.event_id = e.id
         WHERE si.inventory_item_id = ?
           AND (si.damaged_qty > 0 OR si.missing_qty > 0)
         ORDER BY e.start_date DESC`,
        [itemId],
      );
    },
  });

  if (damages.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium flex items-center gap-1 mb-2">
        <AlertTriangle size={12} /> Damage / loss history
      </h4>
      <div className="space-y-2">
        {damages.map((d, i) => (
          <div key={i} className="text-xs bg-danger/5 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{d.event_name}</span>
              <span className="text-text-secondary">{formatShort(d.start_date)}</span>
            </div>
            <div className="flex gap-3 mt-0.5 text-text-secondary">
              {d.damaged_qty > 0 && <span className="text-danger">{d.damaged_qty} damaged</span>}
              {d.missing_qty > 0 && <span className="text-danger">{d.missing_qty} missing</span>}
            </div>
            {d.damage_note && <p className="text-text-secondary mt-0.5">{d.damage_note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatShort(d: string) {
  try { return format(new Date(d + "T00:00:00"), "d MMM yy"); } catch { return d; }
}

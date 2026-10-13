import { useState } from "react";
import { Package, Plus, Search, X, ChevronRight } from "lucide-react";
import { useInventoryItems, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from "../hooks/use-inventory";
import type { InventoryItem } from "../data";

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
    await updateItem.mutateAsync({ id: editingId, data: formToInventory(data) });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await deleteItem.mutateAsync(id);
    if (selectedId === id) setSelectedId(null);
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

interface InvFormData {
  name: string;
  category: string;
  quantity_owned: string;
  hire_price: string;
  replacement_cost: string;
  storage_location: string;
  condition: string;
  notes: string;
}

function formToInventory(data: InvFormData): Omit<InventoryItem, "id" | "created_at" | "updated_at"> {
  return {
    name: data.name,
    category: data.category || null,
    quantity_owned: parseInt(data.quantity_owned || "0"),
    hire_price_cents: Math.round(parseFloat(data.hire_price || "0") * 100),
    replacement_cost_cents: data.replacement_cost ? Math.round(parseFloat(data.replacement_cost) * 100) : null,
    storage_location: data.storage_location || null,
    condition: data.condition || "good",
    notes: data.notes || null,
    photo: null,
    deleted_at: null,
  };
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

  const set = (key: keyof InvFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-medium mb-2">{item ? "Edit item" : "New item"}</h3>

      <Field label="Name *" value={form.name} onChange={(v) => set("name", v)} autoFocus />
      <Field label="Category" value={form.category} onChange={(v) => set("category", v)} placeholder="e.g. Arches, Plinths" />

      <div className="flex gap-2">
        <Field label="Qty owned" value={form.quantity_owned} onChange={(v) => set("quantity_owned", v)} type="number" />
        <Field label="Hire price ($)" value={form.hire_price} onChange={(v) => set("hire_price", v)} type="number" />
      </div>

      <Field label="Replacement cost ($)" value={form.replacement_cost} onChange={(v) => set("replacement_cost", v)} type="number" />
      <Field label="Storage location" value={form.storage_location} onChange={(v) => set("storage_location", v)} placeholder="e.g. Garage shelf B" />

      <div>
        <label className="text-xs text-text-secondary">Condition</label>
        <select value={form.condition} onChange={(e) => set("condition", e.target.value)}
          className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{CONDITION_LABELS[c].label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-text-secondary">Notes</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
          className="w-full text-sm mt-1 px-3 py-2 border border-border rounded-lg outline-none focus:border-brand bg-surface resize-none" />
      </div>

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

function Field({ label, value, onChange, placeholder, type = "text", autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean;
}) {
  return (
    <div className="flex-1">
      <label className="text-xs text-text-secondary">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoFocus={autoFocus} step={type === "number" ? "0.01" : undefined}
        className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
    </div>
  );
}

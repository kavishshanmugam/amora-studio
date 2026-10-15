import { useState, useId } from "react";
import { DollarSign, Plus, Search, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useCatalogueItems, useCreateCatalogueItem, useUpdateCatalogueItem, useDeleteCatalogueItem, useRestoreCatalogueItem, usePackageItems, useAddPackageItem, useRemovePackageItem } from "../hooks/use-catalogue";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { useToast } from "../components/shared/Toast";
import type { CatalogueItem } from "../data";

const CATEGORIES = [
  "All",
  "Balloons",
  "Backdrops & arches",
  "Table styling",
  "Florals",
  "Signage",
  "Lighting",
  "Furniture hire",
  "Fees",
];

const UNITS = ["each", "metre", "table", "hour", "km", "package"];

export async function deleteCatalogueItemWithUndo(
  id: string,
  deleteItem: (id: string) => Promise<unknown>,
  showToast: (message: string, onUndo: () => void) => void,
  restoreItem: (id: string) => Promise<unknown>,
): Promise<void> {
  await deleteItem(id);
  showToast("Item deleted", () => { void restoreItem(id); });
}

export function PriceListPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activity, setActivity] = useState<"active" | "inactive" | "all">("active");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: items = [], isLoading } = useCatalogueItems(true);
  const createItem = useCreateCatalogueItem();
  const updateItem = useUpdateCatalogueItem();
  const deleteItem = useDeleteCatalogueItem();
  const restoreItem = useRestoreCatalogueItem();
  const toast = useToast();

  const filtered = items.filter((item) => {
    if (activity === "active" && !item.active) return false;
    if (activity === "inactive" && item.active) return false;
    if (category !== "All" && item.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by category
  const grouped = new Map<string, CatalogueItem[]>();
  for (const item of filtered) {
    const cat = item.category || "Other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  const handleCreate = async (data: ItemFormData) => {
    await createItem.mutateAsync(formToCatalogue(data));
    setShowForm(false);
  };

  const handleUpdate = async (data: ItemFormData) => {
    if (!editingId) return;
    await updateItem.mutateAsync({ id: editingId, data: catalogueFormToPatch(data) });
    setEditingId(null);
  };

  const toggleActive = async (item: CatalogueItem) => {
    await updateItem.mutateAsync({ id: item.id, data: { active: item.active ? 0 : 1 } });
  };

  return (
    <div className="max-w-5xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-3xl font-bold">Price list</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-2 bg-text-primary text-white rounded-full py-2 px-5 text-sm font-medium hover:bg-brand transition-colors"
        >
          <Plus size={16} />
          Add item
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 bg-bg rounded-lg p-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                category === cat
                  ? "bg-surface text-text-primary font-medium shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-bg rounded-lg p-1" aria-label="Activity filter">
          {(["active", "inactive", "all"] as const).map((value) => (
            <button key={value} onClick={() => setActivity(value)}
              className={`px-3 py-1.5 text-sm rounded-md capitalize ${activity === value ? "bg-surface font-medium shadow-sm" : "text-text-secondary"}`}>
              {value}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand bg-surface"
          />
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign size={48} className="mx-auto text-text-secondary/30 mb-4" />
              <p className="text-text-secondary">
                {search || category !== "All" ? "No items match." : "No price list items yet."}
              </p>
              {!search && category === "All" && (
                <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-brand hover:underline">
                  Add your first item
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-bg sticky top-0">
                  <tr className="text-left text-xs text-text-secondary uppercase tracking-wider">
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5">Unit</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-center">Active</th>
                    <th className="px-4 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...grouped.entries()].map(([cat, catItems]) => (
                    <CategoryGroup
                      key={cat}
                      category={cat}
                      items={catItems}
                      showCategory={category === "All"}
                      onEdit={(id) => setEditingId(id)}
                      onToggle={toggleActive}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(showForm || editingId) && (
          <div className="w-80 bg-surface rounded-xl border border-border p-5 overflow-y-auto shrink-0">
            <ItemForm
              item={editingId ? items.find((i) => i.id === editingId) : undefined}
              onSave={editingId ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingId(null); }}
              onDelete={editingId ? () => setShowDeleteConfirm(true) : undefined}
            />
          </div>
        )}
      </div>
      <ConfirmDialog open={showDeleteConfirm} title="Move item to trash?" message="This price list item will be moved to trash. You can undo this action."
        confirmLabel="Delete" danger onConfirm={async () => {
          if (editingId) {
            const did = editingId;
            await deleteCatalogueItemWithUndo(
              did,
              (id) => deleteItem.mutateAsync(id),
              (message, onUndo) => toast.show(message, { onUndo }),
              (id) => restoreItem.mutateAsync(id),
            );
          }
          setEditingId(null); setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)} />
    </div>
  );
}

function CategoryGroup({ category, items, showCategory, onEdit, onToggle }: {
  category: string;
  items: CatalogueItem[];
  showCategory: boolean;
  onEdit: (id: string) => void;
  onToggle: (item: CatalogueItem) => void;
}) {
  return (
    <>
      {showCategory && (
        <tr>
          <td colSpan={5} className="px-4 pt-4 pb-1 text-xs uppercase tracking-wider text-text-secondary font-medium">
            {category}
          </td>
        </tr>
      )}
      {items.map((item) => (
        <tr key={item.id} className="border-b border-border hover:bg-bg/50 transition-colors">
          <td className="px-4 py-2.5">
            <p className="font-medium">{item.name}</p>
            {item.description && (
              <p className="text-xs text-text-secondary mt-0.5 truncate max-w-xs">{item.description}</p>
            )}
          </td>
          <td className="px-4 py-2.5 text-text-secondary">{item.unit}</td>
          <td className="px-4 py-2.5 text-right font-mono">
            ${(item.price_cents / 100).toFixed(2)}
          </td>
          <td className="px-4 py-2.5 text-center">
            <button onClick={() => onToggle(item)} className="text-text-secondary hover:text-brand"
              aria-label={`${item.active ? "Deactivate" : "Reactivate"} ${item.name}`}>
              {item.active ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} />}
            </button>
          </td>
          <td className="px-4 py-2.5">
            <button onClick={() => onEdit(item.id)} className="text-xs text-brand hover:underline">
              Edit
            </button>
          </td>
        </tr>
      ))}
    </>
  );
}

// --- Form ---

export interface ItemFormData {
  name: string;
  category: string;
  description: string;
  unit: string;
  price: string;
  is_package: boolean;
}

export function catalogueFormToPatch(data: ItemFormData): Partial<CatalogueItem> {
  return {
    name: data.name.trim(),
    category: data.category || null,
    description: data.description || null,
    unit: data.unit || null,
    price_cents: Math.round(parseFloat(data.price || "0") * 100),
    is_package: data.is_package ? 1 : 0,
  };
}

function formToCatalogue(data: ItemFormData): Omit<CatalogueItem, "id" | "created_at" | "updated_at"> {
  return {
    ...catalogueFormToPatch(data) as Omit<CatalogueItem, "id" | "created_at" | "updated_at">,
    inventory_item_id: null,
    active: 1,
    position: 0,
    deleted_at: null,
  };
}

export function validateCatalogueForm(data: ItemFormData): Partial<Record<"name" | "price", string>> {
  const errors: Partial<Record<"name" | "price", string>> = {};
  const price = Number(data.price);
  if (!data.name.trim()) errors.name = "Enter an item name.";
  if (data.price.trim() === "" || !Number.isFinite(price) || price < 0) {
    errors.price = "Enter a price of 0 or more.";
  }
  return errors;
}

function ItemForm({ item, onSave, onCancel, onDelete }: {
  item?: CatalogueItem;
  onSave: (data: ItemFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<ItemFormData>({
    name: item?.name ?? "",
    category: item?.category ?? "",
    description: item?.description ?? "",
    unit: item?.unit ?? "each",
    price: item ? (item.price_cents / 100).toFixed(2) : "",
    is_package: item?.is_package === 1,
  });
  const [errors, setErrors] = useState<Partial<Record<"name" | "price", string>>>({});

  const set = (key: keyof ItemFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateCatalogueForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <h3 className="text-sm font-medium mb-2">{item ? "Edit item" : "New item"}</h3>

      <PLField label="Name *" value={form.name} onChange={(v) => set("name", v)} autoFocus required error={errors.name} />

      <PLSelect label="Category" value={form.category} onChange={(v) => set("category", v)}
        options={CATEGORIES.filter((c) => c !== "All")} />

      <PLTextArea label="Description" value={form.description} onChange={(v) => set("description", v)} placeholder="Shown on the quote" />

      <div className="flex gap-2">
        <PLField label="Price ($)" value={form.price} onChange={(v) => set("price", v)} type="number" min="0" error={errors.price} />
        <PLSelect label="Unit" value={form.unit} onChange={(v) => set("unit", v)} options={UNITS} className="w-28" />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.is_package} onChange={(e) => set("is_package", e.target.checked)}
          className="rounded border-border accent-brand" />
        This is a package
      </label>

      {form.is_package && item && <PackageComposition packageId={item.id} />}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 text-sm py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium">
          {item ? "Save" : "Create"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm py-2 px-4 rounded-lg border border-border hover:bg-bg transition-colors">
          Cancel
        </button>
      </div>
      {onDelete && (
        <button type="button" onClick={onDelete} className="w-full text-sm py-2 text-danger hover:bg-danger/5 rounded-lg transition-colors">
          Delete item
        </button>
      )}
    </form>
  );
}

function PackageComposition({ packageId }: { packageId: string }) {
  const { data: packageItems = [] } = usePackageItems(packageId);
  const { data: allItems = [] } = useCatalogueItems();
  const addItem = useAddPackageItem();
  const removeItem = useRemovePackageItem();
  const [showPicker, setShowPicker] = useState(false);

  const availableItems = allItems.filter(
    (ci) => ci.id !== packageId && !ci.is_package && !packageItems.some((pi) => pi.catalogue_item_id === ci.id),
  );

  const totalCents = packageItems.reduce((s, pi) => s + pi.price_cents * pi.quantity, 0);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-text-secondary font-medium">Package items</span>
        <button type="button" onClick={() => setShowPicker(!showPicker)}
          className="text-xs text-brand hover:underline flex items-center gap-1">
          <Plus size={12} /> Add item
        </button>
      </div>

      {packageItems.length > 0 ? (
        <div className="space-y-1">
          {packageItems.map((pi) => (
            <div key={pi.id} className="flex items-center gap-2 text-sm group">
              <span className="flex-1 truncate">{pi.name}</span>
              <span className="text-text-secondary text-xs">x{pi.quantity}</span>
              <span className="text-text-secondary text-xs w-16 text-right">${(pi.price_cents * pi.quantity / 100).toFixed(2)}</span>
              <button type="button" onClick={() => removeItem.mutate(pi.id)}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger p-0.5">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="text-xs text-text-secondary text-right pt-1 border-t border-border/50">
            Items total: ${(totalCents / 100).toFixed(2)}
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-secondary">No items in this package yet.</p>
      )}

      {showPicker && (
        <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
          {availableItems.length > 0 ? availableItems.map((ci) => (
            <button key={ci.id} type="button"
              onClick={() => { addItem.mutate({ packageId, catalogueItemId: ci.id, quantity: 1 }); setShowPicker(false); }}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-bg flex justify-between">
              <span>{ci.name}</span>
              <span className="text-text-secondary">${(ci.price_cents / 100).toFixed(2)}</span>
            </button>
          )) : (
            <p className="text-xs text-text-secondary px-3 py-2">No items available to add.</p>
          )}
        </div>
      )}
    </div>
  );
}

function PLField({ label, value, onChange, placeholder, type = "text", autoFocus, required, min, error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean; required?: boolean; min?: string; error?: string;
}) {
  const id = useId();
  return (
    <div className="flex-1">
      <label htmlFor={id} className="text-xs text-text-secondary">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoFocus={autoFocus} required={required} min={min} aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined} step={type === "number" ? "0.01" : undefined}
        className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
      {error && <p id={`${id}-error`} className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

function PLSelect({ label, value, onChange, options, className }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; className?: string;
}) {
  const id = useId();
  return (
    <div className={className ?? "flex-1"}>
      <label htmlFor={id} className="text-xs text-text-secondary">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function PLTextArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-xs text-text-secondary">{label}</label>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
        className="w-full text-sm mt-1 px-3 py-2 border border-border rounded-lg outline-none focus:border-brand bg-surface resize-none" />
    </div>
  );
}

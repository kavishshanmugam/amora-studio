import { useState } from "react";
import { DollarSign, Plus, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { useCatalogueItems, useCreateCatalogueItem, useUpdateCatalogueItem, useDeleteCatalogueItem } from "../hooks/use-catalogue";
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

export function PriceListPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useCatalogueItems();
  const createItem = useCreateCatalogueItem();
  const updateItem = useUpdateCatalogueItem();
  const deleteItem = useDeleteCatalogueItem();

  const filtered = items.filter((item) => {
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
    await updateItem.mutateAsync({ id: editingId, data: formToCatalogue(data) });
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
              onDelete={editingId ? () => { deleteItem.mutate(editingId); setEditingId(null); } : undefined}
            />
          </div>
        )}
      </div>
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
            <button onClick={() => onToggle(item)} className="text-text-secondary hover:text-brand">
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

interface ItemFormData {
  name: string;
  category: string;
  description: string;
  unit: string;
  price: string;
  is_package: boolean;
}

function formToCatalogue(data: ItemFormData): Omit<CatalogueItem, "id" | "created_at" | "updated_at"> {
  return {
    name: data.name,
    category: data.category || null,
    description: data.description || null,
    unit: data.unit || null,
    price_cents: Math.round(parseFloat(data.price || "0") * 100),
    inventory_item_id: null,
    is_package: data.is_package ? 1 : 0,
    active: 1,
    position: 0,
    deleted_at: null,
  };
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

  const set = (key: keyof ItemFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-medium mb-2">{item ? "Edit item" : "New item"}</h3>

      <div>
        <label className="text-xs text-text-secondary">Name *</label>
        <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus
          className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
      </div>

      <div>
        <label className="text-xs text-text-secondary">Category</label>
        <select value={form.category} onChange={(e) => set("category", e.target.value)}
          className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
          <option value="">Select...</option>
          {CATEGORIES.filter((c) => c !== "All").map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-text-secondary">Description</label>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
          className="w-full text-sm mt-1 px-3 py-2 border border-border rounded-lg outline-none focus:border-brand bg-surface resize-none"
          placeholder="Shown on the quote" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-text-secondary">Price ($)</label>
          <input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)}
            className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
        </div>
        <div className="w-28">
          <label className="text-xs text-text-secondary">Unit</label>
          <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
            className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.is_package} onChange={(e) => set("is_package", e.target.checked)}
          className="rounded border-border accent-brand" />
        This is a package
      </label>

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

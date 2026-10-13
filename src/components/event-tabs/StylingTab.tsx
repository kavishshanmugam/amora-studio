import { useState } from "react";
import { Plus, Trash2, Package, ShoppingBag, Store, Wrench, ClipboardCheck } from "lucide-react";
import { useStylingItems, useCreateStylingItem, useUpdateStylingItem, useDeleteStylingItem } from "../../hooks/use-styling-items";
import type { AmoraEvent, StylingItem } from "../../data";

const STATUS_PILLS: Record<string, { label: string; color: string }> = {
  need: { label: "Need", color: "bg-need/10 text-need" },
  ordered: { label: "Ordered", color: "bg-info/10 text-info" },
  have: { label: "Have", color: "bg-success/10 text-success" },
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  own_stock: <Package size={12} />,
  buy: <ShoppingBag size={12} />,
  supplier_hire: <Store size={12} />,
  diy: <Wrench size={12} />,
};

const SOURCE_LABELS: Record<string, string> = {
  own_stock: "Own stock",
  buy: "Buy",
  supplier_hire: "Supplier hire",
  diy: "DIY / make",
};

type Filter = "all" | "need" | "ordered" | "have";

export function StylingTab({ event }: { event: AmoraEvent }) {
  const { data: items = [] } = useStylingItems(event.id);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const createItem = useCreateStylingItem();
  const updateItem = useUpdateStylingItem();
  const deleteItem = useDeleteStylingItem();

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  const counts = { need: 0, ordered: 0, have: 0 };
  for (const i of items) {
    if (i.status in counts) counts[i.status as keyof typeof counts]++;
  }

  // Group by category
  const groups = new Map<string, StylingItem[]>();
  for (const item of filtered) {
    const cat = item.category || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  const handleAdd = (data: Partial<StylingItem>) => {
    createItem.mutate({
      event_id: event.id,
      name: data.name!,
      category: data.category || null,
      quantity: data.quantity || 1,
      source: data.source || "buy",
      inventory_item_id: null,
      supplier_contact_id: null,
      supplier_text: data.supplier_text || null,
      status: data.source === "own_stock" ? "have" : "need",
      due_back_date: null,
      cost_cents: data.cost_cents || null,
      packed: 0,
      returned_qty: null,
      damaged_qty: null,
      missing_qty: null,
      damage_note: null,
      notes: data.notes || null,
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {(["all", "need", "ordered", "have"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === f ? "bg-brand text-white" : "bg-bg text-text-secondary hover:text-text-primary"
            }`}>
            {f === "all" ? `All (${items.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f as keyof typeof counts]})`}
          </button>
        ))}
        <button onClick={() => setShowForm(true)} className="ml-auto text-xs text-brand hover:underline flex items-center gap-1">
          <Plus size={12} /> Add item
        </button>
      </div>

      {/* Items grouped by category */}
      {[...groups.entries()].map(([cat, catItems]) => (
        <div key={cat}>
          <h4 className="text-[10px] uppercase tracking-wider text-text-secondary font-medium mb-2">{cat}</h4>
          <div className="space-y-1">
            {catItems.map((item) => (
              <div key={item.id} className="group bg-surface rounded-lg border border-border p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <input defaultValue={item.name} onBlur={(e) => { if (e.target.value !== item.name) updateItem.mutate({ id: item.id, data: { name: e.target.value } }); }}
                      className="text-sm font-medium bg-transparent outline-none truncate border-b border-transparent hover:border-border focus:border-brand" />
                    <span className="text-xs text-text-secondary shrink-0">×</span>
                    <input type="number" defaultValue={item.quantity} onBlur={(e) => { const v = parseInt(e.target.value) || 1; if (v !== item.quantity) updateItem.mutate({ id: item.id, data: { quantity: v } }); }}
                      className="w-8 text-xs text-text-secondary bg-transparent outline-none border-b border-transparent hover:border-border focus:border-brand" />
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_PILLS[item.status]?.color ?? "bg-bg text-text-secondary"}`}>
                      {STATUS_PILLS[item.status]?.label ?? item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">{SOURCE_ICONS[item.source]} {SOURCE_LABELS[item.source] ?? item.source}</span>
                    {item.supplier_text && <span>{item.supplier_text}</span>}
                    <input defaultValue={item.cost_cents ? (item.cost_cents / 100).toFixed(2) : ""} onBlur={(e) => { const v = Math.round(parseFloat(e.target.value || "0") * 100); updateItem.mutate({ id: item.id, data: { cost_cents: v || null } }); }}
                      placeholder="$0.00" className="w-14 bg-transparent outline-none border-b border-transparent hover:border-border focus:border-brand" />
                    <input defaultValue={item.notes ?? ""} onBlur={(e) => { if (e.target.value !== (item.notes ?? "")) updateItem.mutate({ id: item.id, data: { notes: e.target.value || null } }); }}
                      placeholder="notes" className="flex-1 italic bg-transparent outline-none truncate border-b border-transparent hover:border-border focus:border-brand" />
                  </div>
                </div>
                {/* Status toggle */}
                <div className="flex gap-1">
                  {(["need", "ordered", "have"] as const).map((s) => (
                    <button key={s} onClick={() => updateItem.mutate({ id: item.id, data: { status: s } })}
                      className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                        item.status === s ? STATUS_PILLS[s].color : "bg-bg/50 text-text-secondary/50 hover:text-text-secondary"
                      }`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <button onClick={() => { if (confirm("Remove this styling item?")) deleteItem.mutate(item.id); }}
                  className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger p-1">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && !showForm && (
        <p className="text-sm text-text-secondary text-center py-8">No styling items yet.</p>
      )}

      {/* Pack-down check — shown for done/wrap-up events */}
      {["done", "wrap_up", "closed"].includes(event.status) && items.length > 0 && (
        <PackDownCheck items={items} onUpdate={(id, data) => updateItem.mutate({ id, data })} />
      )}

      {/* Add form */}
      {showForm && <AddStylingForm onAdd={handleAdd} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function AddStylingForm({ onAdd, onClose }: {
  onAdd: (data: Partial<StylingItem>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [source, setSource] = useState("buy");
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      category: category || null,
      quantity: parseInt(quantity) || 1,
      source,
      supplier_text: supplier || null,
      cost_cents: cost ? Math.round(parseFloat(cost) * 100) : null,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-4 space-y-3">
      <h4 className="text-sm font-medium">Add styling item</h4>
      <div className="flex gap-2">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name *"
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category"
          className="w-32 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand" />
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1"
          className="w-16 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand text-right" />
      </div>
      <div className="flex gap-2">
        <select value={source} onChange={(e) => setSource(e.target.value)}
          className="text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand">
          <option value="buy">Buy</option>
          <option value="own_stock">Own stock</option>
          <option value="supplier_hire">Supplier hire</option>
          <option value="diy">DIY / make</option>
        </select>
        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name"
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand" />
        <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost ($)" step="0.01"
          className="w-24 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand" />
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes"
        className="w-full text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand" />
      <div className="flex gap-2">
        <button type="submit" className="text-sm px-4 py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90">Add</button>
        <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-bg">Cancel</button>
      </div>
    </form>
  );
}

function PackDownCheck({ items, onUpdate }: {
  items: StylingItem[];
  onUpdate: (id: string, data: Partial<StylingItem>) => void;
}) {
  const [open, setOpen] = useState(false);
  const hireItems = items.filter((i) => i.source === "supplier_hire" || i.source === "own_stock");
  if (hireItems.length === 0) return null;

  const allChecked = hireItems.every((i) => i.returned_qty != null);

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-bg/50 transition-colors">
        <ClipboardCheck size={16} className={allChecked ? "text-success" : "text-need"} />
        <span className="text-sm font-medium">Pack-down check</span>
        <span className="text-xs text-text-secondary ml-auto">
          {allChecked ? "All checked" : `${hireItems.filter((i) => i.returned_qty != null).length}/${hireItems.length} checked`}
        </span>
      </button>
      {open && (
        <div className="border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-text-secondary border-b border-border">
                <th className="text-left px-4 py-2 font-medium">Item</th>
                <th className="text-center px-2 py-2 font-medium w-12">Qty</th>
                <th className="text-center px-2 py-2 font-medium w-20">Returned</th>
                <th className="text-center px-2 py-2 font-medium w-20">Damaged</th>
                <th className="text-center px-2 py-2 font-medium w-20">Missing</th>
                <th className="text-left px-2 py-2 font-medium">Damage note</th>
              </tr>
            </thead>
            <tbody>
              {hireItems.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="px-4 py-2 font-medium">{item.name}</td>
                  <td className="text-center px-2 py-2 text-text-secondary">{item.quantity}</td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" max={item.quantity}
                      defaultValue={item.returned_qty ?? ""}
                      onBlur={(e) => onUpdate(item.id, { returned_qty: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full text-center text-sm bg-transparent outline-none border-b border-border focus:border-brand" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" max={item.quantity}
                      defaultValue={item.damaged_qty ?? ""}
                      onBlur={(e) => onUpdate(item.id, { damaged_qty: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full text-center text-sm bg-transparent outline-none border-b border-border focus:border-brand" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" max={item.quantity}
                      defaultValue={item.missing_qty ?? ""}
                      onBlur={(e) => onUpdate(item.id, { missing_qty: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full text-center text-sm bg-transparent outline-none border-b border-border focus:border-brand" />
                  </td>
                  <td className="px-2 py-2">
                    <input defaultValue={item.damage_note ?? ""}
                      onBlur={(e) => onUpdate(item.id, { damage_note: e.target.value || null })}
                      placeholder="—"
                      className="w-full text-sm bg-transparent outline-none border-b border-transparent hover:border-border focus:border-brand" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

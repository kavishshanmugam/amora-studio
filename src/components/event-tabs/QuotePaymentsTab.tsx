import { useState } from "react";
import { Plus, Trash2, Search, Banknote, Send } from "lucide-react";
import { useQuoteLines, useQuoteSubtotal, useCreateQuoteLine, useUpdateQuoteLine, useDeleteQuoteLine } from "../../hooks/use-quote-lines";
import { usePayments, usePaymentTotal, useCreatePayment, useDeletePayment } from "../../hooks/use-payments";
import { useExpenses, useCreateExpense, useDeleteExpense } from "../../hooks/use-expenses";
import { useCatalogueItems } from "../../hooks/use-catalogue";
import { useUpdateEvent } from "../../hooks/use-events";
import type { AmoraEvent, QuoteLine, Payment, Expense, CatalogueItem } from "../../data";
import { format } from "date-fns";

const fmtCents = (c: number) => `$${(c / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;

// Payment status per PRD §7.9
function paymentStatus(event: AmoraEvent, price: number, paid: number): { label: string; color: string } {
  if (price <= 0) return { label: "No price set", color: "bg-bg text-text-secondary border border-border" };
  if (paid >= price) return { label: "Paid in full", color: "bg-success/10 text-success" };
  const depositAmt = event.deposit_cents ?? 0;
  const now = new Date().toISOString().slice(0, 10);
  if ((event.deposit_due_date && event.deposit_due_date <= now && paid < depositAmt) ||
      (event.balance_due_date && event.balance_due_date <= now && paid < price)) {
    return { label: "Overdue", color: "bg-danger/10 text-danger" };
  }
  if (depositAmt > 0 && paid >= depositAmt) return { label: "Deposit paid", color: "bg-info/10 text-info" };
  if (paid > 0) return { label: "Part paid", color: "bg-info/10 text-info border border-info/30" };
  if (depositAmt > 0) return { label: "Awaiting deposit", color: "bg-need/10 text-need" };
  return { label: "Unpaid", color: "bg-need/10 text-need border border-need/30" };
}

export function QuotePaymentsTab({ event }: { event: AmoraEvent }) {
  const { data: lines = [] } = useQuoteLines(event.id);
  const { data: subtotal = 0 } = useQuoteSubtotal(event.id);
  const { data: payments = [] } = usePayments(event.id);
  const { data: paidTotal = 0 } = usePaymentTotal(event.id);
  const { data: expenses = [] } = useExpenses(event.id);
  const updateEvent = useUpdateEvent();

  const price = event.price_override_cents ?? (subtotal - event.quote_discount_cents);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const profit = price - expenseTotal;
  const owing = price - paidTotal;
  const status = paymentStatus(event, price, paidTotal);

  const handleMarkQuoteSent = () => {
    const today = new Date().toISOString().slice(0, 10);
    updateEvent.mutate({ id: event.id, data: { quote_sent_date: today, status: "quote_sent" } });
  };

  const handleTogglePriceOverride = () => {
    if (event.price_override_cents != null) {
      updateEvent.mutate({ id: event.id, data: { price_override_cents: null } });
    } else {
      const input = prompt("Flat price ($):");
      if (input === null) return;
      const cents = Math.round(parseFloat(input) * 100);
      if (isNaN(cents)) return;
      updateEvent.mutate({ id: event.id, data: { price_override_cents: cents } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment status pill + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${status.color}`}>{status.label}</span>
        {price > 0 && <span className="text-sm text-text-secondary">Total: {fmtCents(price)}</span>}
        {event.quote_sent_date && <span className="text-xs text-text-secondary">Quote sent {event.quote_sent_date}</span>}
        {!event.quote_sent_date && lines.length > 0 && (
          <button onClick={handleMarkQuoteSent} className="flex items-center gap-1 text-xs px-3 py-1 bg-brand text-white rounded-full hover:opacity-90">
            <Send size={12} /> Mark quote sent
          </button>
        )}
        <button onClick={handleTogglePriceOverride} className="text-xs px-3 py-1 border border-border rounded-full hover:bg-bg">
          {event.price_override_cents != null ? `Flat price: ${fmtCents(event.price_override_cents)} ✕` : "Set flat price"}
        </button>
      </div>

      {/* Quote builder */}
      <QuoteBuilder eventId={event.id} lines={lines} subtotal={subtotal} discount={event.quote_discount_cents} />

      {/* Payment summary + recording */}
      <PaymentSection eventId={event.id} event={event} payments={payments} price={price} paidTotal={paidTotal} owing={owing} />

      {/* Bond */}
      {(event.bond_cents != null && event.bond_cents > 0) && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-2">Bond</h3>
          <div className="flex gap-4 text-sm">
            <span>Amount: {fmtCents(event.bond_cents)}</span>
            {event.bond_received_date && <span className="text-success">Received {event.bond_received_date}</span>}
            {event.bond_returned_date && <span className="text-info">Returned {event.bond_returned_date}</span>}
          </div>
          {event.bond_notes && <p className="text-xs text-text-secondary mt-1">{event.bond_notes}</p>}
        </div>
      )}

      {/* Expenses */}
      <ExpenseSection eventId={event.id} expenses={expenses} />

      {/* Profit summary */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-3">Profit summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Price</span><span>{fmtCents(price)}</span></div>
          <div className="flex justify-between"><span>Expenses</span><span className="text-danger">−{fmtCents(expenseTotal)}</span></div>
          <div className="border-t border-border pt-1 flex justify-between font-medium">
            <span>Profit</span>
            <span className={profit >= 0 ? "text-success" : "text-danger"}>
              {fmtCents(profit)} {price > 0 && `(${Math.round((profit / price) * 100)}%)`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Quote Builder ---

function QuoteBuilder({ eventId, lines, subtotal, discount }: {
  eventId: string; lines: QuoteLine[]; subtotal: number; discount: number;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const createLine = useCreateQuoteLine();
  const updateLine = useUpdateQuoteLine();
  const deleteLine = useDeleteQuoteLine();

  const handleAddFromCatalogue = (item: CatalogueItem) => {
    createLine.mutate({
      event_id: eventId,
      catalogue_item_id: item.id,
      description: item.name,
      quantity: 1,
      unit: item.unit,
      unit_price_cents: item.price_cents,
      line_discount_cents: 0,
      position: lines.length,
    });
    setShowPicker(false);
  };

  const handleAddCustom = (desc: string, qty: number, unit: string, priceCents: number) => {
    createLine.mutate({
      event_id: eventId,
      catalogue_item_id: null,
      description: desc,
      quantity: qty,
      unit: unit,
      unit_price_cents: priceCents,
      line_discount_cents: 0,
      position: lines.length,
    });
    setShowCustom(false);
  };

  const total = subtotal - discount;

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium">Quote</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowPicker(true)} className="text-xs text-brand hover:underline flex items-center gap-1">
            <Plus size={12} /> From price list
          </button>
          <button onClick={() => setShowCustom(true)} className="text-xs text-brand hover:underline flex items-center gap-1">
            <Plus size={12} /> Custom line
          </button>
        </div>
      </div>

      {/* Lines table */}
      {lines.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-text-secondary border-b border-border">
              <th className="text-left py-2 font-medium">Description</th>
              <th className="text-right py-2 font-medium w-16">Qty</th>
              <th className="text-right py-2 font-medium w-16">Unit</th>
              <th className="text-right py-2 font-medium w-24">Price</th>
              <th className="text-right py-2 font-medium w-20">Disc.</th>
              <th className="text-right py-2 font-medium w-24">Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const lineTotal = line.quantity * line.unit_price_cents - line.line_discount_cents;
              return (
                <tr key={line.id} className="border-b border-border/50 group">
                  <td className="py-2">
                    <input value={line.description ?? ""} onChange={(e) => updateLine.mutate({ id: line.id, data: { description: e.target.value } })}
                      className="w-full bg-transparent outline-none" />
                  </td>
                  <td className="py-2 text-right">
                    <input type="number" value={line.quantity} onChange={(e) => updateLine.mutate({ id: line.id, data: { quantity: parseInt(e.target.value) || 1 } })}
                      className="w-12 text-right bg-transparent outline-none" />
                  </td>
                  <td className="py-2 text-right text-text-secondary">{line.unit}</td>
                  <td className="py-2 text-right">
                    <input type="number" value={(line.unit_price_cents / 100).toFixed(2)}
                      onChange={(e) => updateLine.mutate({ id: line.id, data: { unit_price_cents: Math.round(parseFloat(e.target.value || "0") * 100) } })}
                      className="w-20 text-right bg-transparent outline-none" step="0.01" />
                  </td>
                  <td className="py-2 text-right">
                    <input type="number" value={(line.line_discount_cents / 100).toFixed(2)}
                      onChange={(e) => updateLine.mutate({ id: line.id, data: { line_discount_cents: Math.round(parseFloat(e.target.value || "0") * 100) } })}
                      className="w-16 text-right bg-transparent outline-none text-text-secondary" step="0.01" />
                  </td>
                  <td className="py-2 text-right font-medium">{fmtCents(lineTotal)}</td>
                  <td className="py-2">
                    <button onClick={() => deleteLine.mutate(line.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger p-1">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-text-secondary py-4 text-center">No quote lines yet. Add from the price list or create a custom line.</p>
      )}

      {/* Totals */}
      {lines.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm text-right">
          <div className="flex justify-end gap-8">
            <span className="text-text-secondary">Subtotal</span>
            <span>{fmtCents(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-end gap-8">
              <span className="text-text-secondary">Discount</span>
              <span className="text-danger">−{fmtCents(discount)}</span>
            </div>
          )}
          <div className="flex justify-end gap-8 font-medium text-base">
            <span>Total</span>
            <span>{fmtCents(total)}</span>
          </div>
        </div>
      )}

      {/* Catalogue picker modal */}
      {showPicker && <CataloguePicker onSelect={handleAddFromCatalogue} onClose={() => setShowPicker(false)} />}

      {/* Custom line form */}
      {showCustom && <CustomLineForm onAdd={handleAddCustom} onClose={() => setShowCustom(false)} />}
    </div>
  );
}

function CataloguePicker({ onSelect, onClose }: { onSelect: (item: CatalogueItem) => void; onClose: () => void }) {
  const { data: items = [] } = useCatalogueItems();
  const [search, setSearch] = useState("");

  const active = items.filter((i) => i.active);
  const filtered = search
    ? active.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()))
    : active;

  // Group by category
  const groups = new Map<string, CatalogueItem[]>();
  for (const item of filtered) {
    const cat = item.category || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-border shadow-xl w-[420px] max-h-[500px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search price list..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {[...groups.entries()].map(([cat, catItems]) => (
            <div key={cat}>
              <p className="text-[10px] uppercase tracking-wider text-text-secondary font-medium px-2 py-1 mt-2">{cat}</p>
              {catItems.map((item) => (
                <button key={item.id} onClick={() => onSelect(item)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-bg flex justify-between">
                  <span>{item.name}</span>
                  <span className="text-text-secondary">{fmtCents(item.price_cents)}/{item.unit}</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-text-secondary text-center py-4">No items found.</p>}
        </div>
      </div>
    </div>
  );
}

function CustomLineForm({ onAdd, onClose }: {
  onAdd: (desc: string, qty: number, unit: string, priceCents: number) => void;
  onClose: () => void;
}) {
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("each");
  const [price, setPrice] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !price) return;
    onAdd(desc.trim(), parseInt(qty) || 1, unit, Math.round(parseFloat(price) * 100));
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-bg rounded-lg space-y-2">
      <div className="flex gap-2">
        <input autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description"
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" min="1"
          className="w-16 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface text-right" />
      </div>
      <div className="flex gap-2">
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit"
          className="w-24 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price ($)" step="0.01"
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
        <button type="submit" className="text-sm px-4 py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90">Add</button>
        <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-bg">Cancel</button>
      </div>
    </form>
  );
}

// --- Payment Section ---

function PaymentSection({ eventId, event, payments, price, paidTotal, owing }: {
  eventId: string; event: AmoraEvent; payments: Payment[]; price: number; paidTotal: number; owing: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const handleAdd = (date: string, amount: number, type: string, method: string, note: string) => {
    createPayment.mutate({
      event_id: eventId,
      date,
      amount_cents: amount,
      type: type || null,
      method: method || null,
      note: note || null,
    });
    setShowForm(false);
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium">Payments</h3>
        <button onClick={() => setShowForm(true)} className="text-xs text-brand hover:underline flex items-center gap-1">
          <Plus size={12} /> Record payment
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <p className="text-text-secondary text-xs">Price</p>
          <p className="font-medium">{price > 0 ? fmtCents(price) : "—"}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">Paid</p>
          <p className="font-medium text-success">{paidTotal > 0 ? fmtCents(paidTotal) : "—"}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">Owing</p>
          <p className={`font-medium ${owing > 0 ? "text-danger" : ""}`}>{owing > 0 ? fmtCents(owing) : "—"}</p>
        </div>
      </div>

      {/* Deposit/balance info */}
      {event.deposit_cents != null && event.deposit_cents > 0 && (
        <div className="text-xs text-text-secondary mb-3 flex gap-4">
          <span>Deposit: {fmtCents(event.deposit_cents)}{event.deposit_due_date ? ` due ${event.deposit_due_date}` : ""}</span>
          {event.balance_due_date && <span>Balance due: {event.balance_due_date}</span>}
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-text-secondary border-b border-border">
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Type</th>
              <th className="text-left py-2 font-medium">Method</th>
              <th className="text-right py-2 font-medium">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border/50 group">
                <td className="py-2">{p.date ? formatDate(p.date) : "—"}</td>
                <td className="py-2 text-text-secondary">{p.type || "—"}</td>
                <td className="py-2 text-text-secondary">{p.method || "—"}</td>
                <td className="py-2 text-right font-medium">{fmtCents(p.amount_cents)}</td>
                <td className="py-2">
                  <button onClick={() => deletePayment.mutate(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger p-1">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-text-secondary text-center py-2">No payments recorded.</p>
      )}

      {/* Add payment form */}
      {showForm && <PaymentForm onAdd={handleAdd} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function PaymentForm({ onAdd, onClose }: {
  onAdd: (date: string, amount: number, type: string, method: string, note: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("payment");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    onAdd(date, Math.round(parseFloat(amount) * 100), type, method, note);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-bg rounded-lg space-y-2">
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
        <input autoFocus type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ($)" step="0.01"
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
          <option value="deposit">Deposit</option>
          <option value="payment">Payment</option>
          <option value="final">Final payment</option>
          <option value="refund">Refund</option>
        </select>
      </div>
      <div className="flex gap-2">
        <select value={method} onChange={(e) => setMethod(e.target.value)}
          className="text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
          <option value="">Method...</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="other">Other</option>
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
        <button type="submit" className="text-sm px-4 py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90">Save</button>
        <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-bg">Cancel</button>
      </div>
    </form>
  );
}

// --- Expenses Section ---

function ExpenseSection({ eventId, expenses }: { eventId: string; expenses: Expense[] }) {
  const [showForm, setShowForm] = useState(false);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const handleAdd = (date: string, desc: string, category: string, amountCents: number) => {
    createExpense.mutate({
      event_id: eventId,
      date,
      description: desc,
      category: category || null,
      amount_cents: amountCents,
      supplier_contact_id: null,
      receipt_file: null,
    });
    setShowForm(false);
  };

  const total = expenses.reduce((s, e) => s + e.amount_cents, 0);

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium flex items-center gap-2">
          <Banknote size={14} /> Expenses
          {total > 0 && <span className="text-[10px] bg-bg px-1.5 py-0.5 rounded-full">{fmtCents(total)}</span>}
        </h3>
        <button onClick={() => setShowForm(true)} className="text-xs text-brand hover:underline flex items-center gap-1">
          <Plus size={12} /> Add expense
        </button>
      </div>

      {expenses.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-text-secondary border-b border-border">
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Description</th>
              <th className="text-left py-2 font-medium">Category</th>
              <th className="text-right py-2 font-medium">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} className="border-b border-border/50 group">
                <td className="py-2">{exp.date ? formatDate(exp.date) : "—"}</td>
                <td className="py-2">{exp.description || "—"}</td>
                <td className="py-2 text-text-secondary">{exp.category || "—"}</td>
                <td className="py-2 text-right font-medium">{fmtCents(exp.amount_cents)}</td>
                <td className="py-2">
                  <button onClick={() => deleteExpense.mutate(exp.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger p-1">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-text-secondary text-center py-2">No expenses recorded.</p>
      )}

      {showForm && <ExpenseForm onAdd={handleAdd} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function ExpenseForm({ onAdd, onClose }: {
  onAdd: (date: string, desc: string, category: string, amountCents: number) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !amount) return;
    onAdd(date, desc.trim(), category, Math.round(parseFloat(amount) * 100));
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-bg rounded-lg space-y-2">
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
        <input autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description"
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
      </div>
      <div className="flex gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
          <option value="">Category...</option>
          <option value="Materials">Materials</option>
          <option value="Balloons">Balloons</option>
          <option value="Florals">Florals</option>
          <option value="Supplier hire">Supplier hire</option>
          <option value="Crew">Crew</option>
          <option value="Fuel/travel">Fuel/travel</option>
          <option value="Other">Other</option>
        </select>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ($)" step="0.01"
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
        <button type="submit" className="text-sm px-4 py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90">Add</button>
        <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-bg">Cancel</button>
      </div>
    </form>
  );
}

function formatDate(d: string) {
  try { return format(new Date(d + "T00:00:00"), "d MMM yyyy"); } catch { return d; }
}

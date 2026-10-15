import { useState } from "react";
import { ClipboardList, Plus, X, GripVertical, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checklistTemplatesRepo } from "../data";
import { getDb } from "../data";
import { uid } from "../data/uid";
import { permanentlyDeleteTemplate } from "../data/permanent-delete";
import type { ChecklistTemplate } from "../data";

export function confirmTemplateDeletion(
  templateName: string,
  confirm: (message: string) => boolean = window.confirm,
): boolean {
  return confirm(`Delete “${templateName}” and all of its tasks? This cannot be undone.`);
}

function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => checklistTemplatesRepo.findAll(),
  });
}

function useTemplateItems(templateId: string | null) {
  return useQuery({
    queryKey: ["template-items", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const db = await getDb();
      return db.select<{ id: string; text: string; days_before_event: number | null; position: number }[]>(
        "SELECT * FROM checklist_template_items WHERE template_id = ? ORDER BY position",
        [templateId]
      );
    },
    enabled: !!templateId,
  });
}

export function TemplatesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { data: templates = [], isLoading } = useTemplates();
  const qc = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async (data: { name: string; event_type: string; is_wrap_up: boolean }) => {
      return checklistTemplatesRepo.create({
        name: data.name,
        event_type: data.event_type || null,
        is_wrap_up: data.is_wrap_up ? 1 : 0,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => permanentlyDeleteTemplate(await getDb(), id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      if (selectedId) setSelectedId(null);
    },
  });

  const selected = selectedId ? templates.find((t) => t.id === selectedId) : null;

  return (
    <div className="max-w-5xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-3xl font-bold">Templates</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-text-primary text-white rounded-full py-2 px-5 text-sm font-medium hover:bg-brand transition-colors"
        >
          <Plus size={16} />
          New template
        </button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Template list */}
        <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList size={48} className="mx-auto text-text-secondary/30 mb-4" />
              <p className="text-text-secondary">No checklist templates yet.</p>
              <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-brand hover:underline">
                Create your first template
              </button>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-bg/50 transition-colors ${
                    selectedId === t.id ? "bg-highlight/30" : ""
                  }`}
                >
                  <ClipboardList size={16} className="text-text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <div className="flex gap-2 mt-0.5">
                      {t.event_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg text-text-secondary">
                          {t.event_type}
                        </span>
                      )}
                      {t.is_wrap_up === 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-need/10 text-need">
                          Wrap-up
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Template detail */}
        {selected && !showForm && (
          <TemplateDetail
            template={selected}
            onClose={() => setSelectedId(null)}
            onDelete={() => {
              if (confirmTemplateDeletion(selected.name)) deleteTemplate.mutate(selected.id);
            }}
          />
        )}

        {/* Create form */}
        {showForm && (
          <div className="w-80 bg-surface rounded-xl border border-border p-5 shrink-0">
            <NewTemplateForm
              onSave={async (data) => {
                await createTemplate.mutateAsync(data);
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateDetail({ template, onClose, onDelete }: {
  template: ChecklistTemplate;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { data: items = [] } = useTemplateItems(template.id);
  const [newText, setNewText] = useState("");
  const [newDays, setNewDays] = useState("");
  const qc = useQueryClient();

  const addItem = async () => {
    if (!newText.trim()) return;
    const db = await getDb();
    const pos = items.length;
    await db.execute(
      "INSERT INTO checklist_template_items (id, template_id, text, days_before_event, position) VALUES (?, ?, ?, ?, ?)",
      [uid(), template.id, newText.trim(), newDays ? parseInt(newDays) : null, pos]
    );
    setNewText("");
    setNewDays("");
    qc.invalidateQueries({ queryKey: ["template-items", template.id] });
  };

  const removeItem = async (itemId: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM checklist_template_items WHERE id = ?", [itemId]);
    qc.invalidateQueries({ queryKey: ["template-items", template.id] });
  };

  return (
    <div className="w-96 bg-surface rounded-xl border border-border p-5 overflow-y-auto shrink-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">{template.name}</h3>
          <div className="flex gap-2 mt-1">
            {template.event_type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-bg text-text-secondary">{template.event_type}</span>
            )}
            {template.is_wrap_up === 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-need/10 text-need">Wrap-up</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
          <X size={16} />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg group">
            <GripVertical size={12} className="text-text-secondary/30 shrink-0" />
            <span className="text-sm flex-1">{item.text}</span>
            {item.days_before_event != null && (
              <span className="text-[10px] text-text-secondary bg-bg px-1.5 py-0.5 rounded shrink-0">
                {item.days_before_event}d before
              </span>
            )}
            <button
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger transition-opacity"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-text-secondary py-2">No tasks yet. Add one below.</p>
        )}
      </div>

      {/* Add item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
          placeholder="Add task..."
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand"
        />
        <input
          type="number"
          value={newDays}
          onChange={(e) => setNewDays(e.target.value)}
          placeholder="Days"
          className="w-16 text-sm px-2 py-1.5 border border-border rounded-lg outline-none focus:border-brand text-center"
        />
        <button onClick={addItem} className="text-sm px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand/90">
          Add
        </button>
      </div>

      <button
        onClick={onDelete}
        className="w-full mt-4 text-sm py-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
      >
        Delete template
      </button>
    </div>
  );
}

function NewTemplateForm({ onSave, onCancel }: {
  onSave: (data: { name: string; event_type: string; is_wrap_up: boolean }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("");
  const [isWrapUp, setIsWrapUp] = useState(false);

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ name, event_type: eventType, is_wrap_up: isWrapUp }); }}
      className="space-y-3">
      <h3 className="text-sm font-medium">New template</h3>
      <div>
        <label className="text-xs text-text-secondary">Name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
          className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface" />
      </div>
      <div>
        <label className="text-xs text-text-secondary">Event type (optional)</label>
        <select value={eventType} onChange={(e) => setEventType(e.target.value)}
          className="w-full text-sm mt-1 px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface">
          <option value="">Any type</option>
          <option value="Wedding">Wedding</option>
          <option value="Birthday">Birthday</option>
          <option value="Baby shower">Baby shower</option>
          <option value="Corporate">Corporate</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={isWrapUp} onChange={(e) => setIsWrapUp(e.target.checked)}
          className="rounded border-border accent-brand" />
        This is a wrap-up template
      </label>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 text-sm py-2 bg-brand text-white rounded-lg hover:bg-brand/90 font-medium">
          Create
        </button>
        <button type="button" onClick={onCancel} className="text-sm py-2 px-4 rounded-lg border border-border hover:bg-bg">
          Cancel
        </button>
      </div>
    </form>
  );
}

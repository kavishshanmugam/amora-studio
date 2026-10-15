import { useState, useRef } from "react";
import { Circle, CheckCircle2, Trash2, Calendar, ClipboardList, Save, GripVertical } from "lucide-react";
import { useChecklistItems, useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem } from "../../hooks/use-checklist";
import type { AmoraEvent, ChecklistItem } from "../../data";
import { getDb } from "../../data";
import { uid } from "../../data/uid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ConfirmDialog, PromptDialog } from "../shared/ConfirmDialog";
import { useDragReorder } from "../../hooks/use-drag-reorder";
import { localDateKey } from "../../utils/events-core";

export function ChecklistTab({ event }: { event: AmoraEvent }) {
  const { data: items = [] } = useChecklistItems(event.id);

  const planning = items.filter((i) => i.section === "planning");
  const wrapUp = items.filter((i) => i.section === "wrap_up");
  const showWrapUp = event.status === "done" || event.status === "wrap_up" || wrapUp.length > 0;

  const total = items.length;
  const done = items.filter((i) => i.is_done).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-medium">{done} of {total} done</h3>
        {total > 0 && (
          <div className="flex-1 max-w-xs h-1.5 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
          </div>
        )}
      </div>

      <ChecklistSection title="Planning" section="planning" eventId={event.id} eventType={event.event_type} items={planning} />

      {showWrapUp && (
        <ChecklistSection title="Wrap-up" section="wrap_up" eventId={event.id} eventType={event.event_type} items={wrapUp} />
      )}
    </div>
  );
}

function ChecklistSection({ title, section, eventId, eventType, items }: {
  title: string; section: string; eventId: string; eventType: string | null; items: ChecklistItem[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [newTask, setNewTask] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChecklistItem | null>(null);
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const qc = useQueryClient();
  const drag = useDragReorder<ChecklistItem>("checklist_items", () => {
    qc.invalidateQueries({ queryKey: ["checklist", eventId] });
  }, (source, target) => source.is_done === target.is_done);

  // Templates for this section
  const isWrapUp = section === "wrap_up";
  const { data: templates = [] } = useQuery({
    queryKey: ["templates-for-section", isWrapUp, eventType],
    queryFn: async () => {
      const db = await getDb();
      return db.select<{ id: string; name: string }[]>(
        "SELECT id, name FROM checklist_templates WHERE is_wrap_up = ? AND (event_type IS NULL OR event_type = ?) ORDER BY name",
        [isWrapUp ? 1 : 0, eventType]
      );
    },
  });

  const applyTemplate = async (templateId: string) => {
    const db = await getDb();
    const tasks = await db.select<{ text: string; days_before_event: number | null; position: number }[]>(
      "SELECT text, days_before_event, position FROM checklist_template_items WHERE template_id = ? ORDER BY position",
      [templateId]
    );
    // Get event start_date for computing due dates
    const eventRows = await db.select<{ start_date: string }[]>(
      "SELECT start_date FROM events WHERE id = ?", [eventId]
    );
    const eventDate = eventRows[0]?.start_date;

    const existingTexts = new Set(items.map((i) => i.text.toLowerCase()));
    let pos = items.length;
    for (const task of tasks) {
      if (existingTexts.has(task.text.toLowerCase())) continue;
      let dueDate: string | null = null;
      if (task.days_before_event != null && eventDate) {
        const d = new Date(eventDate + "T00:00:00");
        d.setDate(d.getDate() - task.days_before_event);
        dueDate = localDateKey(d);
      }
      createItem.mutate({
        event_id: eventId,
        text: task.text,
        is_done: 0,
        due_date: dueDate,
        completed_at: null,
        section,
        position: pos++,
      });
    }
    setShowTemplates(false);
  };

  const doSaveTemplate = async (name: string) => {
    const db = await getDb();
    const tplId = uid();
    const now = new Date().toISOString();
    await db.execute(
      "INSERT INTO checklist_templates (id, name, event_type, is_wrap_up, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [tplId, name.trim(), eventType, isWrapUp ? 1 : 0, now, now]
    );
    for (const item of items) {
      await db.execute(
        "INSERT INTO checklist_template_items (id, template_id, text, days_before_event, position, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?)",
        [uid(), tplId, item.text, item.position, now, now]
      );
    }
    qc.invalidateQueries({ queryKey: ["templates"] });
    qc.invalidateQueries({ queryKey: ["templates-for-section"] });
  };

  // Sort: unchecked first, then checked
  const sorted = [...items].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done - b.is_done;
    return a.position - b.position;
  });

  const handleAdd = () => {
    const text = newTask.trim();
    if (!text) return;
    createItem.mutate({
      event_id: eventId,
      text,
      is_done: 0,
      due_date: null,
      completed_at: null,
      section,
      position: items.length,
    });
    setNewTask("");
    inputRef.current?.focus();
  };

  const toggleDone = (item: ChecklistItem) => {
    updateItem.mutate({
      id: item.id,
      data: {
        is_done: item.is_done ? 0 : 1,
        completed_at: item.is_done ? null : new Date().toISOString(),
      },
    });
  };

  const sectionDone = items.filter((i) => i.is_done).length;

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider text-text-secondary font-medium">
          {title} <span className="text-[10px] ml-1">{sectionDone}/{items.length}</span>
        </h4>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs text-brand hover:underline flex items-center gap-1"
            >
              <ClipboardList size={12} /> Apply template
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                {templates.length > 0 ? templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className="w-full text-left text-xs px-3 py-1.5 hover:bg-bg"
                  >
                    {t.name}
                  </button>
                )) : (
                  <p className="text-xs text-text-secondary px-3 py-2">No templates yet.</p>
                )}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={() => setShowSavePrompt(true)}
              className="text-xs text-text-secondary hover:text-brand flex items-center gap-1"
            >
              <Save size={12} /> Save as template
            </button>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-1">
        {sorted.map((item, index) => {
          const overdue = item.due_date && !item.is_done && item.due_date < localDateKey();
          return (
            <div key={item.id} tabIndex={0} aria-label={`${item.text}. Reorder with Alt+Arrow keys`}
              onKeyDown={(e) => {
                if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
                e.preventDefault();
                const target = sorted[index + (e.key === "ArrowUp" ? -1 : 1)];
                if (target) void drag.moveItem(item.id, target.id, sorted);
              }}
              className={`group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-highlight/30 ${drag.dragId === item.id ? "opacity-50" : ""}`}
              draggable onDragStart={() => drag.onDragStart(item.id)} onDragOver={drag.onDragOver}
              onDrop={() => drag.onDrop(item.id, sorted)} onDragEnd={drag.onDragEnd}>
              <span className="cursor-grab text-text-secondary/30 hover:text-text-secondary shrink-0">
                <GripVertical size={14} />
              </span>
              <button onClick={() => toggleDone(item)} className="shrink-0">
                {item.is_done
                  ? <CheckCircle2 size={18} className="text-brand" />
                  : <Circle size={18} className="text-text-secondary/40 hover:text-brand" />}
              </button>
              <span className={`flex-1 text-sm ${item.is_done ? "line-through text-text-secondary" : ""}`}>
                {item.text}
              </span>
              {item.due_date && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${overdue ? "bg-danger/10 text-danger" : "bg-bg text-text-secondary"}`}>
                  <Calendar size={10} /> {formatShortDate(item.due_date)}
                </span>
              )}
              <button type="button" aria-label={`Remove ${item.text}`} onClick={() => setDeleteTarget(item)}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger p-1">
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add task input */}
      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Add a task..."
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded-lg outline-none focus:border-brand bg-surface"
        />
      </div>

      <PromptDialog open={showSavePrompt} title="Save as template" placeholder="Template name"
        onSubmit={(name) => { doSaveTemplate(name); setShowSavePrompt(false); }}
        onCancel={() => setShowSavePrompt(false)} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove checklist item?"
        message={deleteTarget ? `Remove “${deleteTarget.text}” from this event?` : undefined}
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (deleteTarget) deleteItem.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function formatShortDate(d: string) {
  try { return format(new Date(d + "T00:00:00"), "d MMM"); } catch { return d; }
}

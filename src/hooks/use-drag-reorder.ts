import { useCallback, useState, type DragEvent } from "react";
import { getDb } from "../data";

const REORDER_TABLES = ["checklist_items", "quote_lines", "run_sheet_items"] as const;
export type ReorderTable = (typeof REORDER_TABLES)[number];

type ReorderItem = { id: string };
type ReorderGuard<T extends ReorderItem> = (source: T, target: T) => boolean;

export function reorderUpdateSql(table: ReorderTable): string {
  if (!(REORDER_TABLES as readonly string[]).includes(table)) {
    throw new Error(`Unsupported reorder table: ${table}`);
  }
  return `UPDATE ${table} SET position = ?, updated_at = datetime('now') WHERE id = ?`;
}

export function reorderItemIds<T extends ReorderItem>(
  id: string,
  targetId: string,
  items: T[],
  canMove: ReorderGuard<T> = () => true,
): string[] | null {
  if (id === targetId) return null;
  const fromIndex = items.findIndex((item) => item.id === id);
  const toIndex = items.findIndex((item) => item.id === targetId);
  if (fromIndex === -1 || toIndex === -1 || !canMove(items[fromIndex], items[toIndex])) return null;

  const reordered = items.map((item) => item.id);
  reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, id);
  return reordered;
}

/** Drag and keyboard reordering for approved tables with a `position` column. */
export function useDragReorder<T extends ReorderItem = ReorderItem>(
  table: ReorderTable,
  onReordered: () => void,
  canMove?: ReorderGuard<T>,
) {
  const [dragId, setDragId] = useState<string | null>(null);

  const onDragStart = useCallback((id: string) => {
    setDragId(id);
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const moveItem = useCallback(
    async (id: string, targetId: string, items: T[]) => {
      const reordered = reorderItemIds(id, targetId, items, canMove);
      if (!reordered) return;

      const db = await getDb();
      await db.execute("BEGIN TRANSACTION");
      try {
        const updateSql = reorderUpdateSql(table);
        for (let position = 0; position < reordered.length; position++) {
          await db.execute(updateSql, [position, reordered[position]]);
        }
        await db.execute("COMMIT");
      } catch (error) {
        await db.execute("ROLLBACK");
        throw error;
      }
      onReordered();
    },
    [table, onReordered, canMove],
  );

  const onDrop = useCallback(
    async (targetId: string, items: T[]) => {
      if (dragId) await moveItem(dragId, targetId, items);
      setDragId(null);
    },
    [dragId, moveItem],
  );

  const onDragEnd = useCallback(() => {
    setDragId(null);
  }, []);

  return { dragId, onDragStart, onDragOver, onDrop, onDragEnd, moveItem };
}

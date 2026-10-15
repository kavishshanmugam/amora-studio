export type PermanentlyDeletableType =
  | "event"
  | "contact"
  | "venue"
  | "catalogue"
  | "inventory";

export interface SqlExecutor {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

type CleanupStatement = readonly [sql: string, params: unknown[]];

const EVENT_CHILD_TABLES = [
  "quote_lines",
  "payments",
  "expenses",
  "styling_items",
  "checklist_items",
  "run_sheet_items",
  "event_contacts",
  "images",
  "vision_links",
  "instagram_posts",
  "activity_log",
  "reminders",
] as const;

function cleanupStatements(type: PermanentlyDeletableType, id: string): CleanupStatement[] {
  switch (type) {
    case "event":
      return [
        ...EVENT_CHILD_TABLES.map<CleanupStatement>(
          (table) => [`DELETE FROM ${table} WHERE event_id = ?`, [id]],
        ),
        ["DELETE FROM events WHERE id = ?", [id]],
      ];
    case "contact":
      return [
        ["UPDATE venues SET coordinator_contact_id = NULL WHERE coordinator_contact_id = ?", [id]],
        ["UPDATE events SET client_id = NULL WHERE client_id = ?", [id]],
        ["DELETE FROM event_contacts WHERE contact_id = ?", [id]],
        ["UPDATE styling_items SET supplier_contact_id = NULL WHERE supplier_contact_id = ?", [id]],
        ["UPDATE expenses SET supplier_contact_id = NULL WHERE supplier_contact_id = ?", [id]],
        ["UPDATE run_sheet_items SET assigned_contact_id = NULL WHERE assigned_contact_id = ?", [id]],
        ["DELETE FROM contacts WHERE id = ?", [id]],
      ];
    case "venue":
      return [
        ["UPDATE events SET venue_id = NULL WHERE venue_id = ?", [id]],
        ["DELETE FROM venues WHERE id = ?", [id]],
      ];
    case "catalogue":
      return [
        ["UPDATE quote_lines SET catalogue_item_id = NULL WHERE catalogue_item_id = ?", [id]],
        [
          `UPDATE catalogue_items
           SET price_cents = (
             SELECT COALESCE(SUM(ci.price_cents * component.quantity), 0)
             FROM catalogue_package_items component
             JOIN catalogue_items ci ON ci.id = component.catalogue_item_id
             WHERE component.package_id = catalogue_items.id
               AND component.catalogue_item_id <> ?
           ), updated_at = datetime('now')
           WHERE id IN (
             SELECT package_id FROM catalogue_package_items WHERE catalogue_item_id = ?
           )`,
          [id, id],
        ],
        ["DELETE FROM catalogue_package_items WHERE package_id = ? OR catalogue_item_id = ?", [id, id]],
        ["DELETE FROM catalogue_items WHERE id = ?", [id]],
      ];
    case "inventory":
      return [
        ["UPDATE catalogue_items SET inventory_item_id = NULL WHERE inventory_item_id = ?", [id]],
        ["UPDATE styling_items SET inventory_item_id = NULL WHERE inventory_item_id = ?", [id]],
        ["DELETE FROM inventory_items WHERE id = ?", [id]],
      ];
  }
}

async function inTransaction(db: SqlExecutor, statements: CleanupStatement[]): Promise<void> {
  await db.execute("BEGIN TRANSACTION");
  try {
    for (const [sql, params] of statements) await db.execute(sql, params);
    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

export async function permanentlyDelete(
  db: SqlExecutor,
  type: PermanentlyDeletableType,
  id: string,
): Promise<void> {
  await inTransaction(db, cleanupStatements(type, id));
}

export async function permanentlyDeleteTemplate(db: SqlExecutor, id: string): Promise<void> {
  await inTransaction(db, [
    ["DELETE FROM checklist_template_items WHERE template_id = ?", [id]],
    ["DELETE FROM checklist_templates WHERE id = ?", [id]],
  ]);
}

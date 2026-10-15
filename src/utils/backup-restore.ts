export const BACKUP_TABLES = [
  "contacts",
  "venues",
  "inventory_items",
  "catalogue_items",
  "catalogue_package_items",
  "events",
  "event_contacts",
  "quote_lines",
  "styling_items",
  "expenses",
  "payments",
  "run_sheet_items",
  "checklist_items",
  "images",
  "vision_links",
  "instagram_posts",
  "activity_log",
  "reminders",
  "checklist_templates",
  "checklist_template_items",
  "hashtag_sets",
  "notification_settings",
  "settings",
] as const;

const TABLE_SET = new Set<string>(BACKUP_TABLES);
const IDENTIFIER = /^[a-z][a-z0-9_]*$/;

export type BackupData = Record<(typeof BACKUP_TABLES)[number], Record<string, unknown>[]>;

export function parseBackup(text: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }

  if (!isPlainObject(parsed)) invalid("the root value must be an object");

  for (const [table, rows] of Object.entries(parsed)) {
    if (!TABLE_SET.has(table)) invalid(`unknown table \"${table}\"`);
    if (!Array.isArray(rows)) invalid(`table \"${table}\" must contain an array`);

    for (const row of rows) {
      if (!isPlainObject(row)) invalid(`table \"${table}\" contains a non-object row`);
      const entries = Object.entries(row);
      if (entries.length === 0) invalid(`table \"${table}\" contains an empty row`);
      for (const [column, value] of entries) {
        if (!IDENTIFIER.test(column)) invalid(`unsafe column name \"${column}\"`);
        if (!isSqlScalar(value)) invalid(`column \"${table}.${column}\" contains a non-scalar value`);
      }
    }
  }

  assertCompleteBackup(parsed);

  return parsed as BackupData;
}

function assertCompleteBackup(data: Record<string, unknown>): void {
  for (const table of BACKUP_TABLES) {
    if (!Object.prototype.hasOwnProperty.call(data, table)) invalid(`missing table \"${table}\"`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSqlScalar(value: unknown): boolean {
  return value === null || typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
}

function invalid(message: string): never {
  throw new Error(`Invalid backup: ${message}.`);
}

export interface BackupDatabase {
  select(sql: string, bindValues?: unknown[]): Promise<Record<string, unknown>[]>;
  execute(sql: string, bindValues?: unknown[]): Promise<unknown>;
}

export async function createBackupData(db: BackupDatabase): Promise<BackupData> {
  const data = {} as BackupData;
  for (const table of BACKUP_TABLES) {
    try {
      data[table] = await db.select(`SELECT * FROM ${table}`);
    } catch (error) {
      throw new Error(`Could not back up table \"${table}\": ${errorMessage(error)}`);
    }
  }
  return data;
}

export async function restoreBackup(db: BackupDatabase, data: BackupData): Promise<void> {
  assertCompleteBackup(data);

  await db.execute("BEGIN IMMEDIATE TRANSACTION");
  try {
    for (const table of [...BACKUP_TABLES].reverse()) {
      await db.execute(`DELETE FROM ${table}`);
    }

    for (const table of BACKUP_TABLES) {
      for (const row of data[table] ?? []) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => "?").join(", ");
        await db.execute(
          `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
          columns.map((column) => row[column]),
        );
      }
    }
    await db.execute("COMMIT");
  } catch (error) {
    try {
      await db.execute("ROLLBACK");
    } catch (rollbackError) {
      throw new Error(
        `Restore failed (${errorMessage(error)}) and rollback also failed (${errorMessage(rollbackError)}).`,
      );
    }
    throw error;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

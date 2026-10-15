import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load("sqlite:amora-studio.db");
  return db;
}

/** Run all pending migrations in order. */
export async function runMigrations(): Promise<void> {
  const db = await getDb();

  // Create migrations tracking table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get already-applied migrations
  const applied = await db.select<{ name: string }[]>(
    "SELECT name FROM _migrations ORDER BY id"
  );
  const appliedSet = new Set(applied.map((r) => r.name));

  // Import all migrations in order
  const migrations = await getMigrations();

  for (const m of migrations) {
    if (appliedSet.has(m.name)) continue;
    console.log(`[db] Applying migration: ${m.name}`);
    await db.execute("BEGIN IMMEDIATE TRANSACTION");
    try {
      // SQLite supports transactional ALTER TABLE, so schema changes and their
      // tracking row either both commit or both roll back.
      for (const stmt of m.statements) {
        await db.execute(stmt);
      }
      await db.execute("INSERT INTO _migrations (name) VALUES (?)", [m.name]);
      await db.execute("COMMIT");
    } catch (error) {
      await db.execute("ROLLBACK");
      throw error;
    }
  }
}

interface Migration {
  name: string;
  statements: string[];
}

async function getMigrations(): Promise<Migration[]> {
  // Import migrations eagerly — Vite handles the bundling
  const m001 = await import("./migrations/001_initial");
  const m002 = await import("./migrations/002_styling_position");
  const m003 = await import("./migrations/003_reminder_event_type_unique");
  return [m001.default, m002.default, m003.default];
}

/** Initialize the database: run migrations, seed dev data, purge old trash. */
export async function initDatabase(): Promise<void> {
  await runMigrations();
  // Seed dev data (only inserts if events table is empty)
  const { seedDevData } = await import("./seed");
  await seedDevData();
  // Auto-purge: permanently delete events trashed more than 30 days ago
  await purgeOldTrash();
  // Materialize notification rules after the database is current and seeded.
  const { remindersRepo } = await import("./repositories/reminders");
  await remindersRepo.generateFromRules();
}

async function purgeOldTrash(): Promise<void> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const trashed = await db.select<{ id: string }[]>(
    "SELECT id FROM events WHERE deleted_at IS NOT NULL AND deleted_at < ?",
    [cutoff]
  );
  if (trashed.length === 0) return;
  const { permanentlyDelete } = await import("./permanent-delete");
  for (const event of trashed) await permanentlyDelete(db, "event", event.id);
  console.log(`[db] Purged ${trashed.length} trashed event(s) older than 30 days.`);
}

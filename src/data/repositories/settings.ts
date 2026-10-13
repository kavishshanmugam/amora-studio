import type { Setting } from "../types";
import { getDb } from "../db";

class SettingsRepository {
  async get(key: string): Promise<string | null> {
    const db = await getDb();
    const rows = await db.select<Setting[]>(
      "SELECT * FROM settings WHERE key = ?",
      [key]
    );
    return rows[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value]
    );
  }

  async getAll(): Promise<Setting[]> {
    const db = await getDb();
    return db.select<Setting[]>("SELECT * FROM settings ORDER BY key");
  }

  async remove(key: string): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM settings WHERE key = ?", [key]);
  }
}

export const settingsRepo = new SettingsRepository();

import { getDb } from "../db";
import { uid } from "../uid";

/**
 * Generic CRUD repository for a SQLite table with soft-delete support.
 * All entities have id (TEXT PK), created_at, updated_at.
 */
export class BaseRepository<T extends { id: string }> {
  constructor(
    protected table: string,
    protected hasSoftDelete = false
  ) {}

  async findAll(includeDeleted = false): Promise<T[]> {
    const db = await getDb();
    const where =
      this.hasSoftDelete && !includeDeleted
        ? `WHERE deleted_at IS NULL`
        : "";
    return db.select<T[]>(`SELECT * FROM ${this.table} ${where} ORDER BY created_at DESC`);
  }

  async findById(id: string): Promise<T | null> {
    const db = await getDb();
    const rows = await db.select<T[]>(
      `SELECT * FROM ${this.table} WHERE id = ?`,
      [id]
    );
    return rows[0] ?? null;
  }

  async create(data: Omit<T, "id" | "created_at" | "updated_at">): Promise<T> {
    const db = await getDb();
    const id = uid();
    const now = new Date().toISOString();

    const record = { ...data, id, created_at: now, updated_at: now } as unknown as T;
    const keys = Object.keys(record);
    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map((k) => (record as Record<string, unknown>)[k]);

    await db.execute(
      `INSERT INTO ${this.table} (${keys.join(", ")}) VALUES (${placeholders})`,
      values as unknown[]
    );

    return record;
  }

  async update(
    id: string,
    data: Partial<Omit<T, "id" | "created_at" | "updated_at">>
  ): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    const fields = { ...data, updated_at: now } as Record<string, unknown>;
    const keys = Object.keys(fields);
    const sets = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => fields[k]);

    await db.execute(
      `UPDATE ${this.table} SET ${sets} WHERE id = ?`,
      [...values, id] as unknown[]
    );
  }

  async softDelete(id: string): Promise<void> {
    if (!this.hasSoftDelete) throw new Error(`${this.table} does not support soft delete`);
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      `UPDATE ${this.table} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    );
  }

  async restore(id: string): Promise<void> {
    if (!this.hasSoftDelete) throw new Error(`${this.table} does not support restore`);
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      `UPDATE ${this.table} SET deleted_at = NULL, updated_at = ? WHERE id = ?`,
      [now, id]
    );
  }

  async findDeleted(): Promise<T[]> {
    if (!this.hasSoftDelete) return [];
    const db = await getDb();
    return db.select<T[]>(
      `SELECT * FROM ${this.table} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
    );
  }

  async hardDelete(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
  }
}

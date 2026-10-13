import type { Contact } from "../types";
import { BaseRepository } from "./base";
import { getDb } from "../db";

class ContactsRepository extends BaseRepository<Contact> {
  constructor() {
    super("contacts", true);
  }

  async findClients(): Promise<Contact[]> {
    const db = await getDb();
    return db.select<Contact[]>(
      "SELECT * FROM contacts WHERE is_client = 1 AND deleted_at IS NULL ORDER BY name"
    );
  }

  async findSuppliers(): Promise<Contact[]> {
    const db = await getDb();
    return db.select<Contact[]>(
      "SELECT * FROM contacts WHERE is_supplier = 1 AND deleted_at IS NULL ORDER BY name"
    );
  }

  async findCrew(): Promise<Contact[]> {
    const db = await getDb();
    return db.select<Contact[]>(
      "SELECT * FROM contacts WHERE is_crew = 1 AND deleted_at IS NULL ORDER BY name"
    );
  }

  async search(query: string): Promise<Contact[]> {
    const db = await getDb();
    const q = `%${query}%`;
    return db.select<Contact[]>(
      `SELECT * FROM contacts
       WHERE deleted_at IS NULL
         AND (name LIKE ? OR business_name LIKE ? OR email LIKE ? OR phone LIKE ?)
       ORDER BY name`,
      [q, q, q, q]
    );
  }

  async findDuplicates(phone?: string, email?: string, name?: string): Promise<Contact[]> {
    const db = await getDb();
    const conditions: string[] = [];
    const params: string[] = [];

    if (phone) {
      conditions.push("phone = ?");
      params.push(phone);
    }
    if (email) {
      conditions.push("LOWER(email) = LOWER(?)");
      params.push(email);
    }
    if (name) {
      conditions.push("LOWER(name) = LOWER(?)");
      params.push(name);
    }

    if (conditions.length === 0) return [];

    return db.select<Contact[]>(
      `SELECT * FROM contacts
       WHERE deleted_at IS NULL AND (${conditions.join(" OR ")})`,
      params
    );
  }
}

export const contactsRepo = new ContactsRepository();

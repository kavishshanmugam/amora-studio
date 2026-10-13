import { getDb } from "../db";
import { BaseRepository } from "./base";

export interface ImageRecord {
  id: string;
  event_id: string;
  kind: "moodboard" | "photo";
  file_name: string;
  caption: string | null;
  source_url: string | null;
  is_favourite: number;
  width: number | null;
  height: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

class ImagesRepository extends BaseRepository<ImageRecord> {
  constructor() {
    super("images", false);
  }

  async findByEvent(eventId: string, kind?: "moodboard" | "photo"): Promise<ImageRecord[]> {
    const db = await getDb();
    if (kind) {
      return db.select<ImageRecord[]>(
        "SELECT * FROM images WHERE event_id = ? AND kind = ? ORDER BY position",
        [eventId, kind]
      );
    }
    return db.select<ImageRecord[]>(
      "SELECT * FROM images WHERE event_id = ? ORDER BY position",
      [eventId]
    );
  }
}

export const imagesRepo = new ImagesRepository();

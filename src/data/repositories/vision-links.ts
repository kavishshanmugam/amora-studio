import { getDb } from "../db";
import { BaseRepository } from "./base";

export interface VisionLink {
  id: string;
  event_id: string;
  url: string;
  title: string | null;
  note: string | null;
  kind: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

class VisionLinksRepository extends BaseRepository<VisionLink> {
  constructor() {
    super("vision_links", false);
  }

  async findByEvent(eventId: string): Promise<VisionLink[]> {
    const db = await getDb();
    return db.select<VisionLink[]>(
      "SELECT * FROM vision_links WHERE event_id = ? ORDER BY position",
      [eventId]
    );
  }
}

export const visionLinksRepo = new VisionLinksRepository();

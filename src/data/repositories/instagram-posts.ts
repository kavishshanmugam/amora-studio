import { getDb } from "../db";
import { BaseRepository } from "./base";

export interface InstagramPost {
  id: string;
  event_id: string;
  status: "not_started" | "draft" | "posted";
  caption: string | null;
  hashtags: string | null;
  image_ids: string | null; // JSON array of image IDs
  posted_date: string | null;
  post_url: string | null;
  created_at: string;
  updated_at: string;
}

class InstagramPostsRepository extends BaseRepository<InstagramPost> {
  constructor() {
    super("instagram_posts", false);
  }

  async findByEvent(eventId: string): Promise<InstagramPost | null> {
    const db = await getDb();
    const rows = await db.select<InstagramPost[]>(
      "SELECT * FROM instagram_posts WHERE event_id = ? ORDER BY created_at DESC LIMIT 1",
      [eventId]
    );
    return rows[0] ?? null;
  }
}

export const instagramPostsRepo = new InstagramPostsRepository();

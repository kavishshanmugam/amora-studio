import type { Venue } from "../types";
import { BaseRepository } from "./base";

class VenuesRepository extends BaseRepository<Venue> {
  constructor() {
    super("venues", true);
  }
}

export const venuesRepo = new VenuesRepository();

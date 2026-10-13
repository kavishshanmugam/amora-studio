import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsRepo, contactsRepo, venuesRepo, catalogueRepo, inventoryRepo } from "../data";
import type { AmoraEvent, Contact, Venue, CatalogueItem, InventoryItem } from "../data";

export type TrashItem = {
  id: string;
  name: string;
  type: "event" | "contact" | "venue" | "catalogue" | "inventory";
  deleted_at: string;
};

async function fetchAllDeleted(): Promise<TrashItem[]> {
  const [events, contacts, venues, catalogue, inventory] = await Promise.all([
    eventsRepo.findDeleted() as Promise<AmoraEvent[]>,
    contactsRepo.findDeleted() as Promise<Contact[]>,
    venuesRepo.findDeleted() as Promise<Venue[]>,
    catalogueRepo.findDeleted() as Promise<CatalogueItem[]>,
    inventoryRepo.findDeleted() as Promise<InventoryItem[]>,
  ]);

  const items: TrashItem[] = [
    ...events.map((e) => ({ id: e.id, name: `${e.name} (${e.reference})`, type: "event" as const, deleted_at: e.deleted_at! })),
    ...contacts.map((c) => ({ id: c.id, name: c.name, type: "contact" as const, deleted_at: c.deleted_at! })),
    ...venues.map((v) => ({ id: v.id, name: v.name, type: "venue" as const, deleted_at: v.deleted_at! })),
    ...catalogue.map((c) => ({ id: c.id, name: c.name, type: "catalogue" as const, deleted_at: c.deleted_at! })),
    ...inventory.map((i) => ({ id: i.id, name: i.name, type: "inventory" as const, deleted_at: i.deleted_at! })),
  ];

  return items.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
}

function getRepo(type: TrashItem["type"]) {
  const repos = { event: eventsRepo, contact: contactsRepo, venue: venuesRepo, catalogue: catalogueRepo, inventory: inventoryRepo };
  return repos[type];
}

export function useTrash() {
  return useQuery({
    queryKey: ["trash"],
    queryFn: fetchAllDeleted,
  });
}

export function useRestoreItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: TrashItem["type"] }) =>
      getRepo(type).restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["venues"] });
      qc.invalidateQueries({ queryKey: ["catalogue"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function usePermanentDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: TrashItem["type"] }) =>
      getRepo(type).hardDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trash"] }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventContactsRepo } from "../data";
import type { EventContact } from "../data";

export function useEventContacts(eventId: string | null) {
  return useQuery({
    queryKey: ["event-contacts", eventId],
    queryFn: () => (eventId ? eventContactsRepo.findByEvent(eventId) : []),
    enabled: !!eventId,
  });
}

export function useLinkContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<EventContact, "id" | "created_at" | "updated_at">) =>
      eventContactsRepo.create(data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["event-contacts", vars.event_id] }),
  });
}

export function useUpdateEventContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventContact> }) =>
      eventContactsRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event-contacts"] }),
  });
}

export function useUnlinkContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, contactId }: { eventId: string; contactId: string }) =>
      eventContactsRepo.unlink(eventId, contactId),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["event-contacts", vars.eventId] }),
  });
}

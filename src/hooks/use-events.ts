import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsRepo } from "../data";
import type { AmoraEvent, EventStatus } from "../data";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: () => eventsRepo.findAll(),
  });
}

export function useEventsByStatus(status: EventStatus) {
  return useQuery({
    queryKey: ["events", "status", status],
    queryFn: () => eventsRepo.findByStatus(status),
  });
}

export function useUpcomingEvents(days = 30) {
  return useQuery({
    queryKey: ["events", "upcoming", days],
    queryFn: () => eventsRepo.findUpcoming(days),
  });
}

export function useEvent(id: string | null) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => (id ? eventsRepo.findById(id) : null),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<AmoraEvent, "id" | "created_at" | "updated_at">) => {
      return eventsRepo.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AmoraEvent> }) =>
      eventsRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsRepo.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useRestoreEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsRepo.restore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useNextReference() {
  return useQuery({
    queryKey: ["events", "next-reference"],
    queryFn: () => eventsRepo.nextReference(),
  });
}

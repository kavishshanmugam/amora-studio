import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { imagesRepo } from "../data";
import type { ImageRecord } from "../data";

export function useImages(eventId: string, kind?: "moodboard" | "photo") {
  return useQuery({
    queryKey: ["images", eventId, kind],
    queryFn: () => imagesRepo.findByEvent(eventId, kind),
  });
}

export function useCreateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ImageRecord, "id" | "created_at" | "updated_at">) =>
      imagesRepo.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["images", vars.event_id] });
    },
  });
}

export function useUpdateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; eventId: string; data: Partial<ImageRecord> }) =>
      imagesRepo.update(vars.id, vars.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["images", vars.eventId] });
    },
  });
}

export function useDeleteImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; eventId: string }) =>
      imagesRepo.hardDelete(vars.id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["images", vars.eventId] });
    },
  });
}

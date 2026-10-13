import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { visionLinksRepo } from "../data";
import type { VisionLink } from "../data";

export function useVisionLinks(eventId: string) {
  return useQuery({
    queryKey: ["vision-links", eventId],
    queryFn: () => visionLinksRepo.findByEvent(eventId),
  });
}

export function useCreateVisionLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<VisionLink, "id" | "created_at" | "updated_at">) =>
      visionLinksRepo.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["vision-links", vars.event_id] });
    },
  });
}

export function useDeleteVisionLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; eventId: string }) =>
      visionLinksRepo.hardDelete(vars.id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["vision-links", vars.eventId] });
    },
  });
}

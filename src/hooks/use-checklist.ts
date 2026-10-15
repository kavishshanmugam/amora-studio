import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checklistItemsRepo } from "../data";
import type { ChecklistItem } from "../data";

export function useChecklistItems(eventId: string | null, section?: string) {
  return useQuery({
    queryKey: ["checklist", eventId, section],
    queryFn: () => (eventId ? checklistItemsRepo.findByEvent(eventId, section) : []),
    enabled: !!eventId,
  });
}

export function useCreateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ChecklistItem, "id" | "created_at" | "updated_at">) =>
      checklistItemsRepo.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["checklist", vars.event_id] });
      qc.invalidateQueries({ queryKey: ["tab-counts", vars.event_id] });
    },
  });
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChecklistItem> }) =>
      checklistItemsRepo.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist"] });
      qc.invalidateQueries({ queryKey: ["tab-counts"] });
    },
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checklistItemsRepo.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist"] });
      qc.invalidateQueries({ queryKey: ["tab-counts"] });
    },
  });
}

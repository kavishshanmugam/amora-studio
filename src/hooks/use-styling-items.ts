import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stylingItemsRepo } from "../data";
import type { StylingItem } from "../data";

export function useStylingItems(eventId: string | null) {
  return useQuery({
    queryKey: ["styling-items", eventId],
    queryFn: () => (eventId ? stylingItemsRepo.findByEvent(eventId) : []),
    enabled: !!eventId,
  });
}

export function useCreateStylingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<StylingItem, "id" | "created_at" | "updated_at">) =>
      stylingItemsRepo.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["styling-items", vars.event_id] });
      qc.invalidateQueries({ queryKey: ["tab-counts", vars.event_id] });
    },
  });
}

export function useUpdateStylingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StylingItem> }) =>
      stylingItemsRepo.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["styling-items"] });
      qc.invalidateQueries({ queryKey: ["tab-counts"] });
    },
  });
}

export function useDeleteStylingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stylingItemsRepo.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["styling-items"] });
      qc.invalidateQueries({ queryKey: ["tab-counts"] });
    },
  });
}

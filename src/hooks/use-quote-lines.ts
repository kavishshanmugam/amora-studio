import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quoteLinesRepo } from "../data";
import type { QuoteLine } from "../data";

export function useQuoteLines(eventId: string | null) {
  return useQuery({
    queryKey: ["quote-lines", eventId],
    queryFn: () => (eventId ? quoteLinesRepo.findByEvent(eventId) : []),
    enabled: !!eventId,
  });
}

export function useQuoteSubtotal(eventId: string | null) {
  return useQuery({
    queryKey: ["quote-total", eventId],
    queryFn: () => (eventId ? quoteLinesRepo.subtotalForEvent(eventId) : 0),
    enabled: !!eventId,
  });
}

export function useCreateQuoteLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<QuoteLine, "id" | "created_at" | "updated_at">) =>
      quoteLinesRepo.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quote-lines", vars.event_id] });
      qc.invalidateQueries({ queryKey: ["quote-total", vars.event_id] });
    },
  });
}

export function useUpdateQuoteLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuoteLine> }) =>
      quoteLinesRepo.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-lines"] });
      qc.invalidateQueries({ queryKey: ["quote-total"] });
    },
  });
}

export function useDeleteQuoteLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quoteLinesRepo.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-lines"] });
      qc.invalidateQueries({ queryKey: ["quote-total"] });
    },
  });
}

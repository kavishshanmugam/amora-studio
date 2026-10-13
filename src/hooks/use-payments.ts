import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsRepo } from "../data";
import type { Payment } from "../data";

export function usePayments(eventId: string | null) {
  return useQuery({
    queryKey: ["payments", eventId],
    queryFn: () => (eventId ? paymentsRepo.findByEvent(eventId) : []),
    enabled: !!eventId,
  });
}

export function usePaymentTotal(eventId: string | null) {
  return useQuery({
    queryKey: ["paid-total", eventId],
    queryFn: () => (eventId ? paymentsRepo.totalForEvent(eventId) : 0),
    enabled: !!eventId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Payment, "id" | "created_at" | "updated_at">) =>
      paymentsRepo.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payments", vars.event_id] });
      qc.invalidateQueries({ queryKey: ["paid-total", vars.event_id] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Payment> }) =>
      paymentsRepo.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["paid-total"] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsRepo.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["paid-total"] });
    },
  });
}

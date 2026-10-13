import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesRepo } from "../data";
import type { Expense } from "../data";

export function useExpenses(eventId: string | null) {
  return useQuery({
    queryKey: ["expenses", eventId],
    queryFn: () => (eventId ? expensesRepo.findByEvent(eventId) : []),
    enabled: !!eventId,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Expense, "id" | "created_at" | "updated_at">) =>
      expensesRepo.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["expenses", vars.event_id] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) =>
      expensesRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesRepo.hardDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

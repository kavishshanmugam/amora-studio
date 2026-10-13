import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryRepo } from "../data";
import type { InventoryItem } from "../data";

export function useInventoryItems() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryRepo.findAll(),
  });
}

export function useInventoryItem(id: string | null) {
  return useQuery({
    queryKey: ["inventory", id],
    queryFn: () => (id ? inventoryRepo.findById(id) : null),
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<InventoryItem, "id" | "created_at" | "updated_at">) =>
      inventoryRepo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) =>
      inventoryRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryRepo.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

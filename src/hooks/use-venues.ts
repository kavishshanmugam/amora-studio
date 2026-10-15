import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { venuesRepo } from "../data";
import type { Venue } from "../data";

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: () => venuesRepo.findAll(),
  });
}

export function useVenue(id: string | null) {
  return useQuery({
    queryKey: ["venues", id],
    queryFn: () => (id ? venuesRepo.findById(id) : null),
    enabled: !!id,
  });
}

export function useCreateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Venue, "id" | "created_at" | "updated_at">) =>
      venuesRepo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["venues"] }),
  });
}

export function useUpdateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Venue> }) =>
      venuesRepo.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["venues"] });
      qc.invalidateQueries({ queryKey: ["venue-detail", vars.id] });
    },
  });
}

export function useDeleteVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => venuesRepo.softDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["venues"] }),
  });
}

export function useRestoreVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => venuesRepo.restore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["venues"] }),
  });
}

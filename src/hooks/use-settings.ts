import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsRepo } from "../data";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsRepo.getAll(),
  });
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: ["settings", key],
    queryFn: () => settingsRepo.get(key),
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      settingsRepo.set(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

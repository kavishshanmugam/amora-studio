import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activityLogRepo } from "../data";

export function useActivityLog(eventId: string | null) {
  return useQuery({
    queryKey: ["activity-log", eventId],
    queryFn: () => (eventId ? activityLogRepo.findByEvent(eventId) : []),
    enabled: !!eventId,
  });
}

export function useLogActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, type, summary }: { eventId: string; type: string; summary: string }) =>
      activityLogRepo.log(eventId, type, summary),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity-log"] }),
  });
}

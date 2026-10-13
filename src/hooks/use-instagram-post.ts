import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { instagramPostsRepo } from "../data";
import type { InstagramPost } from "../data";

export function useInstagramPost(eventId: string) {
  return useQuery({
    queryKey: ["instagram-post", eventId],
    queryFn: () => instagramPostsRepo.findByEvent(eventId),
  });
}

export function useCreateInstagramPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<InstagramPost, "id" | "created_at" | "updated_at">) =>
      instagramPostsRepo.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["instagram-post", vars.event_id] });
    },
  });
}

export function useUpdateInstagramPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; eventId: string; data: Partial<InstagramPost> }) =>
      instagramPostsRepo.update(vars.id, vars.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["instagram-post", vars.eventId] });
    },
  });
}

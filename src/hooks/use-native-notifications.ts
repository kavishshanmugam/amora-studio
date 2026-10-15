import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { remindersRepo } from "../data";
import { deliverDueReminders } from "../services/reminders";

/** Reconciles reminder rules and delivers due native notifications every minute. */
export function useNativeNotifications() {
  const qc = useQueryClient();
  const { data: pending = [] } = useQuery({
    queryKey: ["reminders", "pending-native"],
    queryFn: async () => {
      await remindersRepo.generateFromRules();
      return remindersRepo.findPending();
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    let cancelled = false;
    if (pending.length === 0) return () => { cancelled = true; };

    void (async () => {
      try {
        if (!("__TAURI_INTERNALS__" in window)) return;
        const { isPermissionGranted, requestPermission, sendNotification } =
          await import("@tauri-apps/plugin-notification");

        const delivered = await deliverDueReminders({
          pending,
          now: new Date().toISOString(),
          isCancelled: () => cancelled,
          requestPermission: async () => {
            if (await isPermissionGranted()) return true;
            return (await requestPermission()) === "granted";
          },
          claim: (id, firedAt) => remindersRepo.claimForDelivery(id, firedAt),
          release: (id, firedAt) => remindersRepo.releaseDeliveryClaim(id, firedAt),
          notify: sendNotification,
        });
        if (delivered > 0 && !cancelled) {
          await qc.invalidateQueries({ queryKey: ["reminders"] });
        }
      } catch {
        // Native notifications are unavailable in web development mode.
      }
    })();

    return () => { cancelled = true; };
  }, [pending, qc]);
}

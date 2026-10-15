import { describe, expect, it } from "vitest";
import { deliverDueReminders } from "./reminders";

const reminder = {
  id: "reminder-1",
  type: "follow_up",
  event_id: "event-1",
  related_id: null,
  scheduled_for: "2026-05-01T00:00:00.000Z",
  title: "Follow up",
  body: "Call the client",
  fired_at: null,
  read_at: null,
  dismissed_at: null,
  created_at: "2026-04-01T00:00:00.000Z",
};

describe("native reminder delivery", () => {
  it("claims a due reminder so concurrent effects cannot notify twice", async () => {
    let claimed = false;
    const notifications: string[] = [];
    const claim = async () => {
      if (claimed) return false;
      claimed = true;
      return true;
    };

    await Promise.all([
      deliverDueReminders({
        pending: [reminder],
        now: "2026-05-02T00:00:00.000Z",
        isCancelled: () => false,
        requestPermission: async () => true,
        claim,
        release: async () => undefined,
        notify: ({ title }) => { notifications.push(title); },
      }),
      deliverDueReminders({
        pending: [reminder],
        now: "2026-05-02T00:00:00.000Z",
        isCancelled: () => false,
        requestPermission: async () => true,
        claim,
        release: async () => undefined,
        notify: ({ title }) => { notifications.push(title); },
      }),
    ]);

    expect(notifications).toEqual(["Follow up"]);
  });

  it("stops after an effect is cancelled while permission is pending", async () => {
    let cancelled = false;
    let grantPermission: ((granted: boolean) => void) | undefined;
    const permission = new Promise<boolean>((resolve) => {
      grantPermission = resolve;
    });
    const notifications: string[] = [];

    const delivery = deliverDueReminders({
      pending: [reminder],
      now: "2026-05-02T00:00:00.000Z",
      isCancelled: () => cancelled,
      requestPermission: () => permission,
      claim: async () => true,
      release: async () => undefined,
      notify: ({ title }) => { notifications.push(title); },
    });
    cancelled = true;
    grantPermission?.(true);
    await delivery;

    expect(notifications).toEqual([]);
  });
});

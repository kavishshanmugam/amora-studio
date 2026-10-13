import { useQuery } from "@tanstack/react-query";

export interface StockClash {
  inventory_item_id: string;
  inventory_name: string;
  quantity_owned: number;
  total_allocated: number;
  clashing_events: { event_id: string; event_name: string; start_date: string; quantity: number }[];
}

export function useStockClashes(eventId: string | null, startDate: string | null, endDate: string | null) {
  return useQuery({
    queryKey: ["stock-clashes", eventId, startDate, endDate],
    queryFn: async () => {
      if (!eventId || !startDate) return [];
      const { getDb } = await import("../data");
      const db = await getDb();

      // Find all inventory items used in this event
      const myItems = await db.select<{ inventory_item_id: string; quantity: number }[]>(
        `SELECT inventory_item_id, SUM(quantity) as quantity FROM styling_items
         WHERE event_id = ? AND inventory_item_id IS NOT NULL
         GROUP BY inventory_item_id`,
        [eventId]
      );

      if (myItems.length === 0) return [];

      const clashes: StockClash[] = [];
      const dateEnd = endDate || startDate;

      for (const myItem of myItems) {
        // Find other events using the same inventory item with overlapping dates
        const overlapping = await db.select<{ event_id: string; event_name: string; start_date: string; quantity: number }[]>(
          `SELECT e.id as event_id, e.name as event_name, e.start_date, SUM(si.quantity) as quantity
           FROM styling_items si
           JOIN events e ON si.event_id = e.id
           WHERE si.inventory_item_id = ?
             AND e.id != ?
             AND e.deleted_at IS NULL
             AND e.status NOT IN ('lost', 'cancelled', 'done')
             AND e.start_date <= ?
             AND COALESCE(e.end_date, e.start_date) >= ?
           GROUP BY e.id`,
          [myItem.inventory_item_id, eventId, dateEnd, startDate]
        );

        if (overlapping.length === 0) continue;

        // Get inventory details
        const inv = await db.select<{ name: string; quantity_owned: number }[]>(
          `SELECT name, quantity_owned FROM inventory_items WHERE id = ?`,
          [myItem.inventory_item_id]
        );
        if (inv.length === 0) continue;

        const totalAllocated = myItem.quantity + overlapping.reduce((s, o) => s + o.quantity, 0);

        if (totalAllocated > inv[0].quantity_owned) {
          clashes.push({
            inventory_item_id: myItem.inventory_item_id,
            inventory_name: inv[0].name,
            quantity_owned: inv[0].quantity_owned,
            total_allocated: totalAllocated,
            clashing_events: overlapping,
          });
        }
      }

      return clashes;
    },
    enabled: !!eventId && !!startDate,
  });
}

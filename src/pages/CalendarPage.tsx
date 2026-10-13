import { useState } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  subMonths, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEvents } from "../hooks/use-events";
import { useContact } from "../hooks/use-contacts";
import type { AmoraEvent } from "../data";

const STATUS_COLORS: Record<string, string> = {
  enquiry: "#3B6FB6",
  quote_sent: "#F2A33A",
  booked: "#3E8E5E",
  planning: "#7A1F2B",
  ready: "#3E8E5E",
  done: "#999",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: events = [] } = useEvents();

  // Build calendar grid (Monday-first)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  // Events by date
  const eventsByDate = new Map<string, AmoraEvent[]>();
  for (const e of events) {
    if (e.deleted_at) continue;
    if (["lost", "cancelled"].includes(e.status)) continue;
    const key = e.start_date;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(e);
  }

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedEvents = eventsByDate.get(selectedKey) ?? [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-3xl font-bold">Bookings calendar</h1>
        <button className="flex items-center gap-2 bg-text-primary text-white rounded-full py-2 px-5 text-sm font-medium hover:bg-brand transition-colors">
          <Plus size={16} />
          New enquiry
        </button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 bg-surface rounded-xl border border-border p-4 flex flex-col">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">{format(currentMonth, "MMMM yyyy")}</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 rounded hover:bg-bg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
                className="px-3 py-1 text-sm rounded hover:bg-bg transition-colors">
                Today
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 rounded hover:bg-bg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs text-text-secondary font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex-1 grid grid-rows-[repeat(auto-fill,1fr)]">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-t border-border">
                {week.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDate.get(key) ?? [];
                  const inMonth = isSameMonth(day, currentMonth);
                  const selected = isSameDay(day, selectedDate);
                  const today = isToday(day);

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(day)}
                      className={`p-1 min-h-[60px] text-left transition-colors relative ${
                        !inMonth ? "text-text-secondary/30" :
                        selected ? "bg-highlight/40" : "hover:bg-bg/50"
                      }`}
                    >
                      <span className={`text-xs inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        today ? "bg-text-primary text-white" :
                        selected ? "bg-brand text-white" : ""
                      }`}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => {
                          const isTentative = ["enquiry", "quote_sent"].includes(e.status);
                          return (
                            <div
                              key={e.id}
                              className="text-[9px] px-1 py-0.5 rounded truncate text-white"
                              style={{
                                backgroundColor: isTentative ? "transparent" : (STATUS_COLORS[e.status] ?? "#7A1F2B"),
                                border: isTentative ? `1px solid ${STATUS_COLORS[e.status] ?? "#7A1F2B"}` : "none",
                                color: isTentative ? (STATUS_COLORS[e.status] ?? "#7A1F2B") : "white",
                              }}
                            >
                              {e.name}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-text-secondary">
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Day panel */}
        <div className="w-72 bg-surface rounded-xl border border-border p-4 overflow-y-auto shrink-0">
          <h3 className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-3">
            {format(selectedDate, "EEEE d MMMM")}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-text-secondary">No events on this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((e) => (
                <DayPanelEvent key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayPanelEvent({ event }: { event: AmoraEvent }) {
  const { data: client } = useContact(event.client_id);

  return (
    <div className="p-3 rounded-lg border border-border">
      <div className="flex items-start gap-2">
        <div className="w-1 h-full rounded-full shrink-0 mt-1" style={{ backgroundColor: event.colour || "#7A1F2B" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{event.name}</p>
          {client && <p className="text-xs text-text-secondary">{client.name}</p>}
          <div className="text-xs text-text-secondary mt-1 space-y-0.5">
            {event.start_time && <p>Event {event.start_time}{event.end_time ? `–${event.end_time}` : ""}</p>}
            {event.setup_time && <p>Setup {event.setup_time}</p>}
            {event.event_type && <p>{event.event_type}</p>}
          </div>
          <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
            STATUS_COLORS[event.status] ? `text-white` : "bg-bg text-text-secondary"
          }`} style={{ backgroundColor: STATUS_COLORS[event.status] ?? "#eee" }}>
            {event.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>
    </div>
  );
}

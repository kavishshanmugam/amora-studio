import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  CalendarDays,
  PartyPopper,
  Users,
  MapPin,
  Package,
  DollarSign,
  ClipboardList,
  Bell,
  Settings,
  Plus,
  Search,
} from "lucide-react";

const workNav = [
  { to: "/", label: "Today", icon: Sun },
  { to: "/events", label: "Events", icon: PartyPopper },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

const libraryNav = [
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/venues", label: "Venues", icon: MapPin },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/price-list", label: "Price list", icon: DollarSign },
  { to: "/templates", label: "Templates", icon: ClipboardList },
];

const otherNav = [
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

function NavItem({
  to,
  label,
  icon: Icon,
  badge,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-white text-brand font-medium shadow-sm"
            : "text-text-secondary hover:bg-white/60 hover:text-text-primary"
        }`
      }
    >
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-danger text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["reminders", "unread-count"],
    queryFn: async () => {
      const { getDb } = await import("../../data");
      const db = await getDb();
      const rows = await db.select<{ c: number }[]>(
        "SELECT COUNT(*) as c FROM reminders WHERE fired_at IS NOT NULL AND read_at IS NULL AND dismissed_at IS NULL"
      );
      return rows[0]?.c ?? 0;
    },
    refetchInterval: 60_000, // check every minute
  });

  return (
    <aside className="w-60 bg-sidebar border-r border-border flex flex-col h-full shrink-0">
      {/* Brand */}
      <div className="px-5 pt-5 pb-2 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-10 h-10 shrink-0">
          <path d="M42 88 Q30 75 40 62 Q42 70 48 72 Q38 78 42 88Z" fill="#E8A0B5" opacity="0.5"/>
          <path d="M38 100 Q22 92 28 78 Q32 86 38 86 Q28 94 38 100Z" fill="#7A1F2B" opacity="0.3"/>
          <path d="M40 112 Q26 108 30 94 Q34 100 40 100 Q30 106 40 112Z" fill="#E8A0B5" opacity="0.4"/>
          <path d="M158 88 Q170 75 160 62 Q158 70 152 72 Q162 78 158 88Z" fill="#E8A0B5" opacity="0.5"/>
          <path d="M162 100 Q178 92 172 78 Q168 86 162 86 Q172 94 162 100Z" fill="#7A1F2B" opacity="0.3"/>
          <path d="M160 112 Q174 108 170 94 Q166 100 160 100 Q170 106 160 112Z" fill="#E8A0B5" opacity="0.4"/>
          <text x="100" y="98" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="38" fontStyle="italic" fill="#7A1F2B">Amora</text>
          <line x1="52" y1="108" x2="148" y2="108" stroke="#E8A0B5" strokeWidth="0.5"/>
          <text x="100" y="126" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="13" letterSpacing="8" fill="#7A1F2B">EVENTS</text>
          <path d="M100 60 L101.5 65 L106 66 L102 69 L103 74 L100 71 L97 74 L98 69 L94 66 L98.5 65Z" fill="#E8A0B5" opacity="0.6"/>
        </svg>
        <div>
          <h1 className="font-display text-lg font-bold text-brand leading-tight">
            Amora Studio
          </h1>
          <p className="text-xs text-text-secondary">Amora Events</p>
        </div>
      </div>

      {/* New enquiry button */}
      <div className="px-3 py-2">
        <button
          onClick={() => navigate("/events?new=1")}
          className="w-full flex items-center justify-center gap-2 bg-text-primary text-white rounded-full py-2 px-4 text-sm font-medium hover:bg-brand transition-colors"
        >
          <Plus size={16} />
          New enquiry
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-1">
        <SearchBar />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        <div>
          <p className="px-3 mb-1 text-[11px] uppercase tracking-wider text-text-secondary font-medium">
            Work
          </p>
          <div className="space-y-0.5">
            {workNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 mb-1 text-[11px] uppercase tracking-wider text-text-secondary font-medium">
            Library
          </p>
          <div className="space-y-0.5">
            {libraryNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </div>

        <div>
          <div className="space-y-0.5">
            {otherNav.map((item) => (
              <NavItem key={item.to} {...item} badge={item.to === "/notifications" ? unreadCount : undefined} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border">
        <p className="px-3 text-[10px] text-text-secondary">
          <kbd className="bg-bg px-1 rounded text-[9px]">Ctrl+K</kbd> to search
        </p>
      </div>
    </aside>
  );
}

// --- Global Search ---

interface SearchResult {
  type: "event" | "contact" | "venue";
  id: string;
  title: string;
  subtitle: string;
  route: string;
}

function SearchBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const search = async () => {
      const { getDb } = await import("../../data");
      const db = await getDb();
      const q = `%${query}%`;
      const [events, contacts, venues] = await Promise.all([
        db.select<{ id: string; name: string; reference: string; status: string }[]>(
          "SELECT id, name, reference, status FROM events WHERE deleted_at IS NULL AND (name LIKE ? OR reference LIKE ?) LIMIT 5",
          [q, q]
        ),
        db.select<{ id: string; name: string; role: string | null }[]>(
          "SELECT id, name, role FROM contacts WHERE deleted_at IS NULL AND name LIKE ? LIMIT 5",
          [q]
        ),
        db.select<{ id: string; name: string; address: string | null }[]>(
          "SELECT id, name, address FROM venues WHERE deleted_at IS NULL AND name LIKE ? LIMIT 5",
          [q]
        ),
      ]);
      const r: SearchResult[] = [
        ...events.map((e) => ({ type: "event" as const, id: e.id, title: e.name, subtitle: `${e.reference} · ${e.status}`, route: `/events/${e.id}` })),
        ...contacts.map((c) => ({ type: "contact" as const, id: c.id, title: c.name, subtitle: c.role ?? "Contact", route: `/contacts` })),
        ...venues.map((v) => ({ type: "venue" as const, id: v.id, title: v.name, subtitle: v.address ?? "Venue", route: `/venues` })),
      ];
      setResults(r);
      setSelectedIdx(0);
    };
    search();
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    navigate(r.route);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[selectedIdx]) { handleSelect(results[selectedIdx]); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary bg-white/60 rounded-lg border border-border hover:border-brand/50 transition-colors"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] bg-bg px-1 rounded">Ctrl+K</kbd>
      </button>
    );
  }

  const typeIcon = { event: PartyPopper, contact: Users, venue: MapPin };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => { setOpen(false); setQuery(""); }} />

      {/* Search panel */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[480px] bg-surface rounded-xl border border-border shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search size={16} className="text-text-secondary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search events, contacts, venues..."
            className="flex-1 text-sm outline-none bg-transparent"
            autoFocus
          />
          <kbd className="text-[10px] text-text-secondary bg-bg px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {results.length > 0 && (
          <div className="max-h-72 overflow-y-auto py-1">
            {results.map((r, i) => {
              const Icon = typeIcon[r.type];
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selectedIdx ? "bg-highlight/40" : "hover:bg-bg/50"
                  }`}
                >
                  <Icon size={16} className="text-text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-[10px] text-text-secondary truncate">{r.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-text-secondary capitalize">{r.type}</span>
                </button>
              );
            })}
          </div>
        )}

        {query && results.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-6">No results found.</p>
        )}
      </div>
    </>
  );
}

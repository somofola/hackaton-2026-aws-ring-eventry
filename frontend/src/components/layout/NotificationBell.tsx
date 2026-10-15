import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Shield, CreditCard, Users, Calendar, Clock, Info, Tag, Mail, CheckCheck } from "lucide-react";
import api from "@/services/api";

const COUNT_KEY = "eventry_notif_unread";
function readCount(): number {
  try { return Number(sessionStorage.getItem(COUNT_KEY) ?? -1); } catch { return -1; }
}
function writeCount(n: number) {
  try { sessionStorage.setItem(COUNT_KEY, String(n)); } catch {}
}

const TYPE_META: Record<string, { icon: any; color: string }> = {
  alerts:        { icon: Shield,     color: "text-red-500 bg-red-50" },
  billing:       { icon: CreditCard, color: "text-blue-500 bg-blue-50" },
  card_activity: { icon: Users,      color: "text-purple-500 bg-purple-50" },
  events:        { icon: Calendar,   color: "text-green-500 bg-green-50" },
  reminders:     { icon: Clock,      color: "text-orange-500 bg-orange-50" },
  informational: { icon: Info,       color: "text-blue-400 bg-blue-50" },
  promotions:    { icon: Tag,        color: "text-yellow-500 bg-yellow-50" },
  marketing:     { icon: Mail,       color: "text-violet-500 bg-violet-50" },
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

interface Props {
  basePath: string
  bellClassName?: string
}

export default function NotificationBell({ basePath, bellClassName }: Props) {
  const [open, setOpen]       = useState(false);
  const [items, setItems]     = useState<any[]>([]);
  const [unread, setUnread]   = useState<number>(() => { const c = readCount(); return c >= 0 ? c : 0; });
  const [loading, setLoading] = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);
  const openRef               = useRef(false);   // shadow ref so callbacks see current value
  const navigate              = useNavigate();

  // Keep shadow ref in sync
  openRef.current = open;

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchCount = () =>
    api.get("/notifications/unread-count")
      .then((r) => {
        const n = r.data.count ?? 0;
        writeCount(n);
        setUnread(n);
        return n;
      })
      .catch(() => {});

  const fetchItems = () =>
    api.get("/notifications?status=unread&per_page=5")
      .then((r) => { setItems(r.data.data ?? []); })
      .catch(() => {});

  // ── Polling: unread count every 5 min ─────────────────────────────────────

  useEffect(() => {
    if (readCount() < 0) fetchCount();
    const id = setInterval(fetchCount, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ── Push event: refresh count + items if dropdown is open ─────────────────

  useEffect(() => {
    const handler = () => {
      fetchCount();
      if (openRef.current) fetchItems();
    };
    window.addEventListener("pme:push", handler);
    return () => window.removeEventListener("pme:push", handler);
  }, []);

  // ── Sync count from Notifications page (eventry:notif-count) ──────────────

  useEffect(() => {
    const handler = (e: Event) => {
      const n = (e as CustomEvent).detail?.count ?? 0;
      writeCount(n);
      setUnread(n);
    };
    window.addEventListener("eventry:notif-count", handler);
    return () => window.removeEventListener("eventry:notif-count", handler);
  }, []);

  // ── Close on outside click ─────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Open dropdown ──────────────────────────────────────────────────────────

  const openDropdown = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    await fetchItems();
    setLoading(false);
    // Sync count while we're here
    fetchCount();
  };

  // ── Mark one read (optimistic) ─────────────────────────────────────────────

  const handleClick = async (notif: any) => {
    // Optimistic: remove from list and decrement count immediately
    setItems((prev) => prev.filter((n) => n.id !== notif.id));
    const next = Math.max(0, unread - 1);
    setUnread(next);
    writeCount(next);
    setOpen(false);
    try { await api.patch(`/notifications/${notif.id}/read`); } catch {}
    navigate(`${basePath}/notifications`);
  };

  // ── Mark all read ──────────────────────────────────────────────────────────

  const markAll = async () => {
    try { await api.patch("/notifications/read-all"); } catch {}
    writeCount(0);
    setUnread(0);
    setItems([]);
    setOpen(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const typeMeta = (typeName?: string) =>
    TYPE_META[typeName ?? ""] ?? { icon: Bell, color: "text-gray-500 bg-gray-100" };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={openDropdown}
        className={bellClassName || "relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No unread notifications
              </div>
            ) : (
              items.map((notif) => {
                const meta = typeMeta(notif.notification_type?.name);
                const Icon = meta.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {notif.notification_type?.label && (
                          <span className="text-[11px] text-gray-400">{notif.notification_type.label}</span>
                        )}
                        <span className="text-[11px] text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400">{timeAgo(notif.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" />
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100">
            <button
              onClick={() => { setOpen(false); navigate(`${basePath}/notifications`); }}
              className="w-full py-2.5 text-center text-sm text-primary font-medium hover:bg-gray-50 transition-colors"
            >
              See all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

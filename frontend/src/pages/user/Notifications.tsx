import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import UserLayout from "@/components/layout/UserLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import TeamLayout from "@/components/layout/TeamLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Bell, Search, Shield, CreditCard, Users, Calendar,
  Clock, Info, Tag, Mail, CheckCheck, Loader2,
} from "lucide-react";
import api from "@/services/api";
import ListPagination from "@/components/ui/list-pagination";

const TYPE_META: Record<string, { icon: any; color: string; bg: string }> = {
  alerts:        { icon: Shield,     color: "text-red-600",    bg: "bg-red-50 border-red-100" },
  billing:       { icon: CreditCard, color: "text-blue-600",   bg: "bg-blue-50 border-blue-100" },
  card_activity: { icon: Users,      color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
  events:        { icon: Calendar,   color: "text-green-600",  bg: "bg-green-50 border-green-100" },
  reminders:     { icon: Clock,      color: "text-orange-600", bg: "bg-orange-50 border-orange-100" },
  informational: { icon: Info,       color: "text-blue-500",   bg: "bg-sky-50 border-sky-100" },
  promotions:    { icon: Tag,        color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-100" },
  marketing:     { icon: Mail,       color: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
};

const STATUS_FILTERS = [
  { value: "all",    label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read",   label: "Read" },
];

const PAGE_SIZE = 15;

const formatDate = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function Notifications() {
  const path = useLocation().pathname;
  const Layout = path.startsWith("/admin") ? AdminLayout
               : path.startsWith("/team")  ? TeamLayout
               : UserLayout;
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [total, setTotal]                 = useState(0);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [currentPage, setCurrentPage]     = useState(1);
  const [lastPage, setLastPage]           = useState(1);
  const [loading, setLoading]             = useState(true);

  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter]   = useState("unread");

  const [selected, setSelected]           = useState<any | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setCurrentPage(1); }, [statusFilter]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        per_page: String(PAGE_SIZE),
        page: String(currentPage),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      const res = await api.get(`/notifications?${params}`);
      setNotifications(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
      setLastPage(res.data.last_page ?? 1);
      setUnreadCount(res.data.unread_count ?? 0);
    } catch {}
    setLoading(false);
  }, [currentPage, debouncedSearch, statusFilter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const dispatchCount = (n: number) =>
    window.dispatchEvent(new CustomEvent("eventry:notif-count", { detail: { count: n } }));

  const markRead = async (notif: any) => {
    if (notif.status === "read") return;
    try {
      await api.patch(`/notifications/${notif.id}/read`);
      if (statusFilter === "unread") {
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setNotifications((prev) =>
          prev.map((n) => n.id === notif.id ? { ...n, status: "read", read_at: new Date().toISOString() } : n)
        );
      }
      setUnreadCount((c) => {
        const next = Math.max(0, c - 1);
        dispatchCount(next);
        return next;
      });
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      if (statusFilter === "unread") {
        setNotifications([]);
        setTotal(0);
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
      }
      setUnreadCount(0);
      dispatchCount(0);
    } catch {}
  };

  const openNotif = (notif: any) => {
    markRead(notif);
    setSelected(notif);
  };

  const typeMeta = (name?: string) =>
    TYPE_META[name ?? ""] ?? { icon: Bell, color: "text-gray-500", bg: "bg-gray-50 border-gray-100" };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search notifications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-sm text-gray-500">
            {total === 0 ? "No notifications found" : `${total} notification${total !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-gray-400">
              <Bell className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm mt-1">
                {debouncedSearch ? `No results for "${debouncedSearch}"` : "Nothing here yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const meta = typeMeta(notif.notification_type?.name);
              const Icon = meta.icon;
              const isUnread = notif.status !== "read";
              return (
                <button
                  key={notif.id}
                  onClick={() => openNotif(notif)}
                  className={`w-full text-left rounded-xl border p-4 flex items-start gap-4 transition-all hover:shadow-sm ${
                    isUnread ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"
                  }`}
                >
                  {/* Type icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${isUnread ? "font-medium text-gray-900" : "text-gray-600"}`}>
                        {notif.message}
                      </p>
                      {isUnread && (
                        <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      {notif.notification_type?.label && (
                        <Badge variant="secondary" className="text-[11px] py-0">
                          {notif.notification_type.label}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[11px] py-0 capitalize">
                        {notif.channel}
                      </Badge>
                      <span className="text-[11px] text-gray-400">{timeAgo(notif.created_at)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {lastPage > 1 && (
          <ListPagination
            currentPage={currentPage}
            totalPages={lastPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Detail dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const meta = typeMeta(selected.notification_type?.name);
                  const Icon = meta.icon;
                  return (
                    <>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.bg}`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <span>{selected.notification_type?.label ?? "Notification"}</span>
                    </>
                  );
                })()}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <p className="text-gray-800 leading-relaxed">{selected.message}</p>
              <div className="grid grid-cols-2 gap-3 text-sm border-t pt-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Channel</p>
                  <p className="font-medium capitalize">{selected.channel}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Status</p>
                  <p className="font-medium capitalize">{selected.status}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Received</p>
                  <p className="font-medium">{formatDate(selected.created_at)}</p>
                </div>
                {selected.read_at && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Read at</p>
                    <p className="font-medium">{formatDate(selected.read_at)}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}

import React, { useEffect, useState } from "react";
import TeamLayout from "@/components/layout/TeamLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar, Users, QrCode, Clock, MapPin, Search, Loader2, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import { parseEventDateTime } from "@/utils/datetime";

const EVENT_GRADIENTS = [
  { from: "#3b82f6", to: "#7c3aed" },
  { from: "#10b981", to: "#0891b2" },
  { from: "#f59e0b", to: "#ef4444" },
  { from: "#ec4899", to: "#8b5cf6" },
  { from: "#06b6d4", to: "#2563eb" },
  { from: "#84cc16", to: "#059669" },
  { from: "#f97316", to: "#dc2626" },
  { from: "#a855f7", to: "#6366f1" },
];

function eventGradient(id: number) {
  return EVENT_GRADIENTS[id % EVENT_GRADIENTS.length];
}

// Grace period (hours) after event end before it is hidden from the list.
// Configurable via VITE_TEAM_EVENT_GRACE_HOURS in .env (default 48).
const GRACE_HOURS = Number(import.meta.env.VITE_TEAM_EVENT_GRACE_HOURS ?? 48);
const GRACE_MS = GRACE_HOURS * 60 * 60 * 1000;

function eventEndMs(event: AssignedEvent): number {
  return parseEventDateTime(
    event.end_date ?? event.start_date,
    event.end_time ?? event.start_time ?? "23:59",
  );
}

function fmtCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "0h 0m";
  const totalMins = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

interface AssignedEvent {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  description: string | null;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  location: string | null;
  status: string;
  total_attendees: number;
  checked_in: number;
}

type FilterTag = "all" | "live" | "active" | "past";

function fmtDate(d: string | null) {
  if (!d) return null;
  const datePart = d.split("T")[0].split(" ")[0];
  const date = new Date(`${datePart}T00:00:00`);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}

function fmtTime(t: string | null) {
  if (!t) return null;
  const match = t.match(/(\d{1,2}):(\d{2})/);
  if (!match) return t;
  const d = new Date();
  d.setHours(+match[1], +match[2], 0, 0);
  if (isNaN(d.getTime())) return t;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "live") return "default";
  if (status === "completed") return "secondary";
  if (status === "cancelled") return "destructive";
  return "outline";
}

function getFilterTag(event: AssignedEvent): FilterTag {
  const today = new Date().toISOString().split("T")[0];
  if (event.status === "completed" || event.status === "cancelled") return "past";
  if (event.start_date && event.start_date <= today) return "live";
  return "active";
}

const TeamEvents = () => {
  const [events, setEvents]   = useState<AssignedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<FilterTag>("live");
  const [now, setNow]         = useState(() => Date.now());

  useEffect(() => {
    api.get("/team/dashboard")
      .then((res) => setEvents(res.data.events ?? []))
      .catch(() => setError("Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  // Tick every minute to update countdowns and hide expired events
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Exclude events that ended more than GRACE_HOURS ago, or are completed with no end date
  const visibleEvents = events.filter((e) => {
    if (e.status === "completed") {
      const endMs = eventEndMs(e);
      return endMs > 0 && now < endMs + GRACE_MS;
    }
    const endMs = eventEndMs(e);
    if (!endMs) return true; // no date info — keep
    return now < endMs + GRACE_MS;
  });

  const counts: Record<FilterTag, number> = {
    all:    visibleEvents.length,
    live:   visibleEvents.filter((e) => getFilterTag(e) === "live").length,
    active: visibleEvents.filter((e) => getFilterTag(e) === "active").length,
    past:   visibleEvents.filter((e) => getFilterTag(e) === "past").length,
  };

  const filtered = visibleEvents.filter((e) => {
    const matchesTag    = filter === "all" || getFilterTag(e) === filter;
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.location ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesTag && matchesSearch;
  });

  return (
    <TeamLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Assigned Events</h1>
          <p className="text-gray-600 mt-1">Events you have been assigned to manage and handle check-ins for.</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search events…"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all", "live", "active", "past"] as FilterTag[]).map((tag) => {
                const labels: Record<FilterTag, string> = {
                  all: "All", live: "Live", active: "Upcoming", past: "Past",
                };
                const colors: Record<FilterTag, string> = {
                  all:    "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  live:   "bg-green-100 text-green-700 hover:bg-green-200",
                  active: "bg-blue-100 text-blue-700 hover:bg-blue-200",
                  past:   "bg-gray-100 text-gray-500 hover:bg-gray-200",
                };
                const activeColors: Record<FilterTag, string> = {
                  all:    "bg-gray-800 text-white",
                  live:   "bg-green-600 text-white",
                  active: "bg-blue-600 text-white",
                  past:   "bg-gray-500 text-white",
                };
                const isActive = filter === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setFilter(tag)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${isActive ? activeColors[tag] : colors[tag]}`}
                  >
                    {labels[tag]}
                    <span className={`text-xs rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20" : "bg-black/10"}`}>
                      {counts[tag]}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 shrink-0" /> {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-center text-gray-500 py-12">
            {search ? "No events match your search." : "You have no assigned events yet."}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((event) => {
            const pct = event.total_attendees > 0
              ? Math.round((event.checked_in / event.total_attendees) * 100)
              : 0;
            const endMs = eventEndMs(event);
            const isRecentlyEnded = endMs > 0 && now >= endMs && now < endMs + GRACE_MS;
            const graceRemaining = isRecentlyEnded ? endMs + GRACE_MS - now : 0;
            return (
              <Card key={event.id} className="overflow-hidden">
                {/* Gradient banner */}
                {(() => {
                  const g = eventGradient(event.id);
                  return (
                    <div
                      className="relative h-28 w-full"
                      style={{ background: `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)` }}
                    >
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "22px 22px" }} />
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 12px)" }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Calendar className="h-10 w-10 text-white/30" />
                      </div>
                    </div>
                  );
                })()}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <Badge variant={statusVariant(event.status)} className="shrink-0 capitalize">{event.status}</Badge>
                      </div>
                      {event.description && (
                        <p className="text-gray-600 mt-1 text-sm line-clamp-2">{event.description}</p>
                      )}
                    </div>
                    {isRecentlyEnded && (
                      <div className="shrink-0 flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        {fmtCountdown(graceRemaining)}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      {event.start_date && (
                        <div className="flex items-center text-sm text-gray-600 gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          {fmtDate(event.start_date)}{event.start_time ? ` at ${fmtTime(event.start_time)}` : ""}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center text-sm text-gray-600 gap-2">
                          <MapPin className="h-4 w-4 shrink-0" /> {event.location}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600 gap-2">
                        <Users className="h-4 w-4 shrink-0" /> {event.total_attendees} attendees
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">Check-in Progress</span>
                        <span>{event.checked_in}/{event.total_attendees} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Link to={`/team/events/${event.slug}`} className="flex-1">
                        <Button variant="outline" className="w-full">View Details</Button>
                      </Link>
                      {event.status !== "completed" && event.status !== "cancelled" && (
                        (event.end_date && endMs > 0 && now >= endMs) ? (
                          <Button className="flex-1 w-full" disabled>
                            <QrCode className="mr-2 h-4 w-4" /> Check-in Closed
                          </Button>
                        ) : (
                          <Link to={`/team/checkin/${event.slug}`} className="flex-1">
                            <Button className="w-full">
                              <QrCode className="mr-2 h-4 w-4" /> Check-in
                            </Button>
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </TeamLayout>
  );
};

export default TeamEvents;

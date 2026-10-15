import React, { useEffect, useState } from "react";
import TeamLayout from "@/components/layout/TeamLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Users, QrCode, Clock, MapPin, CheckCircle, Loader2, AlertCircle, Globe,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import AppDownloadPrompt from "@/components/AppDownloadPrompt";

interface AssignedEvent {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  description: string | null;
  start_date: string | null;
  start_time: string | null;
  location: string | null;
  status: string;
  total_attendees: number;
  checked_in: number;
}

interface DashboardData {
  events: AssignedEvent[];
  total_events: number;
  total_attendees: number;
  total_checked_in: number;
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "live") return "default";
  if (status === "completed") return "secondary";
  if (status === "cancelled") return "destructive";
  return "outline";
}

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

const TeamDashboard = () => {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    api.get("/team/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <TeamLayout>
      <AppDownloadPrompt />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Dashboard</h1>
          <p className="text-gray-600 mt-1">Your assigned events and check-in activities.</p>
        </div>

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

        {data && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Assigned Events */}
              <div className="relative rounded-xl overflow-hidden min-h-[110px] group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                style={{ background: "linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%)" }}>
                <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/[0.07]" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent" />
                <div className="relative z-10 p-4 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mt-auto">{data.total_events}</div>
                  <p className="text-[10px] font-semibold text-white/50 tracking-widest uppercase mt-2">Assigned Events</p>
                </div>
              </div>

              {/* Total Attendees */}
              <div className="relative rounded-xl overflow-hidden min-h-[110px] group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                style={{ background: "linear-gradient(135deg,#5b21b6 0%,#7c3aed 55%,#8b5cf6 100%)" }}>
                <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/[0.07]" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent" />
                <div className="relative z-10 p-4 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mt-auto">{data.total_attendees.toLocaleString()}</div>
                  <p className="text-[10px] font-semibold text-white/50 tracking-widest uppercase mt-2">Total Attendees</p>
                </div>
              </div>

              {/* Total Checked In */}
              <div className="relative rounded-xl overflow-hidden min-h-[110px] group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                style={{ background: "linear-gradient(135deg,#065f46 0%,#059669 55%,#10b981 100%)" }}>
                <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/[0.07]" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent" />
                <div className="relative z-10 p-4 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mt-auto">{data.total_checked_in.toLocaleString()}</div>
                  <p className="text-[10px] font-semibold text-white/50 tracking-widest uppercase mt-2">Checked In</p>
                </div>
              </div>
            </div>

            {/* Assigned Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" /> My Assigned Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.events.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">You have no assigned events yet.</p>
                ) : (
                  <div className="space-y-4">
                    {data.events.map((event) => {
                      const pct = event.total_attendees > 0
                        ? Math.round((event.checked_in / event.total_attendees) * 100)
                        : 0;
                      return (
                        <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold text-lg">{event.title}</h3>
                              <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                            </div>

                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                              {event.start_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 shrink-0" />
                                  {fmtDate(event.start_date)}
                                  {event.start_time && ` at ${fmtTime(event.start_time)}`}
                                </span>
                              )}
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 shrink-0" /> {event.location}
                                </span>
                              )}
                            </div>

                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span>Check-in Progress</span>
                                <span>{event.checked_in}/{event.total_attendees} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 shrink-0">
                            <Link to={`/team/events/${event.slug}`}>
                              <Button variant="outline" size="sm" className="w-full">View Details</Button>
                            </Link>
                            {event.status !== "completed" && event.status !== "cancelled" && (
                              <Link to={`/team/checkin/${event.slug}`}>
                                <Button size="sm" className="w-full">
                                  <QrCode className="mr-2 h-4 w-4" /> Check-in
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TeamLayout>
  );
};

export default TeamDashboard;

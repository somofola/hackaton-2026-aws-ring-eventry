import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Loader2, Ticket, UserCheck, BarChart2, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import api from "@/services/api";

interface AnalyticsData {
  summary: {
    staff_count: number;
    events_created: number;
    total_attendees: number;
  };
  events: {
    by_status: { status: string; count: number; color: string }[];
    monthly_created: { month: string; count: number }[];
    total_capacity: number;
    total_enrolled: number;
    fill_rate: number;
    enrollment_statuses: { status: string; count: number }[];
    check_in_rate: number;
    monthly_enrollments: { month: string; count: number }[];
    top_events: { title: string; date: string; status: string; current_attendees: number; max_attendees: number; fill_rate: number }[];
    upcoming: { title: string; date: string; current_attendees: number; max_attendees: number }[];
    tickets_sold: number;
    ticket_revenue: number;
  };
}

const AdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/corporate/analytics")
      .then(({ data }) => setData(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-32 text-gray-400">
          <Loader2 className="animate-spin mr-2 h-6 w-6" />
          Loading analytics…
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="text-center py-32 text-gray-400">Failed to load analytics. Please try again later.</div>
      </AdminLayout>
    );
  }

  const { summary } = data;
  const events = data.events ?? null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Insights for your events</p>
        </div>

        {/* ── Event Analytics ─────────────────────────────────────────── */}
        {events && (
          <>
            {/* Event KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <Users className="h-6 w-6 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{summary.staff_count}</p>
                    <p className="text-sm text-gray-500">Staff Members</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{summary.events_created}</p>
                    <p className="text-sm text-gray-500">Events Created</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <Users className="h-6 w-6 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{summary.total_attendees.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Total Attendees</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <BarChart2 className="h-6 w-6 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{events.fill_rate}%</p>
                    <p className="text-sm text-gray-500">Avg Fill Rate</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <UserCheck className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{events.check_in_rate}%</p>
                    <p className="text-sm text-gray-500">Check-in Rate</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <Ticket className="h-6 w-6 text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{events.tickets_sold.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Tickets Sold</p>
                    {events.ticket_revenue > 0 && (
                      <p className="text-xs text-gray-400">${events.ticket_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Event trends + status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Events & Enrollments</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                      data={events.monthly_created.map((m, i) => ({
                        month: m.month,
                        events: m.count,
                        enrollments: events.monthly_enrollments[i]?.count ?? 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="events" name="Events Created" stroke="#F97316" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="enrollments" name="Enrollments" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Events by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {events.by_status.length === 0 ? (
                    <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No events yet</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={events.by_status}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            dataKey="count"
                            nameKey="status"
                            label={({ status, count }) => `${status}: ${count}`}
                          >
                            {events.by_status.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number, n: string) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
                        {events.by_status.map((s, i) => (
                          <span key={i} className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)} ({s.count})
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Enrollment status breakdown */}
            {events.enrollment_statuses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Enrollment Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={events.enrollment_statuses} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                        {events.enrollment_statuses.map((_, i) => (
                          <Cell key={i} fill={["#3B82F6", "#10B981", "#EF4444"][i % 3]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top events table */}
            {events.top_events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Events by Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events.top_events.map((ev, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium truncate">{ev.title}</p>
                            <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                              {ev.current_attendees} / {ev.max_attendees}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-orange-400"
                              style={{ width: `${ev.fill_rate}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs text-gray-400">{new Date(ev.date).toLocaleDateString()}</span>
                            <span className="text-xs text-gray-400">{ev.fill_rate}% full</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming events */}
            {events.upcoming.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" /> Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {events.upcoming.map((ev, i) => (
                      <div key={i} className="border rounded-lg p-4 space-y-2">
                        <p className="font-medium text-sm truncate">{ev.title}</p>
                        <p className="text-xs text-gray-500">{new Date(ev.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{ width: `${ev.max_attendees > 0 ? Math.round((ev.current_attendees / ev.max_attendees) * 100) : 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400">{ev.current_attendees} / {ev.max_attendees} registered</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;

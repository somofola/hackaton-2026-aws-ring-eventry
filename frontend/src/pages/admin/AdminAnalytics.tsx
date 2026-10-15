import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CreditCard, Calendar, Eye, TrendingUp, TrendingDown, Minus, Loader2, Ticket, UserCheck, BarChart2, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import api from "@/services/api";

interface AnalyticsData {
  summary: {
    staff_count: number;
    total_cards: number;
    active_cards: number;
    suspended_cards: number;
    total_views: number;
    events_created: number;
    total_attendees: number;
  };
  monthly_views: { month: string; views: number }[];
  departments: { department: string; cards: number; views: number; percent: number; color: string }[];
  top_card: { name: string; views: number } | null;
  top_department: { name: string; views: number } | null;
  growth_rate: number;
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
  const [view, setView] = useState<"cards" | "events">("cards");

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

  const { summary, monthly_views, departments, top_card, top_department, growth_rate } = data;
  const events = data.events ?? null;

  const GrowthIcon = growth_rate > 0 ? TrendingUp : growth_rate < 0 ? TrendingDown : Minus;
  const growthColor = growth_rate > 0 ? "text-green-600" : growth_rate < 0 ? "text-red-600" : "text-gray-500";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Insights for your company's digital presence</p>
          </div>
          <Select value={view} onValueChange={(v) => setView(v as "cards" | "events")}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">Card Analytics</SelectItem>
              <SelectItem value="events">Event Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Card Analytics ─────────────────────────────────────────── */}
        {view === "cards" && <>

        {/* KPI Summary */}
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
              <CreditCard className="h-6 w-6 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold">{summary.total_cards}</p>
                <p className="text-sm text-gray-500">
                  Business Cards
                  {summary.suspended_cards > 0 && (
                    <span className="ml-1 text-xs text-amber-500">({summary.suspended_cards} suspended)</span>
                  )}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Eye className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold">{summary.total_views.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Card Views</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold">
                  {summary.total_cards > 0 ? (summary.total_views / summary.total_cards).toFixed(1) : "0"}
                </p>
                <p className="text-sm text-gray-500">Avg Views / Card</p>
              </div>
            </div>
          </Card>

        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Card Views Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {monthly_views.every(m => m.views === 0) ? (
                <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No scan data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthly_views}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">No department data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departments}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="views"
                      nameKey="department"
                      label={({ department, percent }) => `${department}: ${percent}%`}
                    >
                      {departments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {departments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(240, departments.length * 52)}>
                <BarChart
                  data={departments.map(d => ({
                    ...d,
                    views_per_card: d.cards > 0 ? Math.round((d.views / d.cards) * 10) / 10 : 0,
                  }))}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  barCategoryGap="55%"
                  barSize={10}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="department" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value,
                      name === "cards" ? "Total Cards" : name === "views" ? "Total Views" : "Views / Card",
                    ]}
                  />
                  <Bar dataKey="cards" name="cards" stackId="dept" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="views" name="views" stackId="dept" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="views_per_card" name="views_per_card" stackId="dept" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[#F59E0B]" />Total Cards</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[#3B82F6]" />Total Views</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[#10B981]" />Views / Card</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Most Popular Card</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {top_card ? (
                  <>
                    <p className="text-2xl font-bold text-blue-600">{top_card.name}</p>
                    <p className="text-sm text-gray-500">{top_card.views.toLocaleString()} total views</p>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">No cards yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {top_department ? (
                  <>
                    <p className="text-2xl font-bold text-green-600">{top_department.name}</p>
                    <p className="text-sm text-gray-500">{top_department.views.toLocaleString()} total views</p>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">No department data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={`flex items-center justify-center gap-1 text-2xl font-bold ${growthColor}`}>
                  <GrowthIcon className="h-6 w-6" />
                  {growth_rate > 0 ? "+" : ""}{growth_rate}%
                </div>
                <p className="text-sm text-gray-500 mt-1">Card scans vs last month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        </>}

        {/* ── Event Analytics ─────────────────────────────────────────── */}
        {view === "events" && events && (
          <>
            {/* Event KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent, useEventAnalytics } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, TrendingUp, Users, DollarSign, UserCheck,
  BarChart3, Tag, Loader2,
} from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

const currency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const EventAnalytics = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading: eventLoading } = useEvent(uuid || "");
  const { data: analytics, isLoading: analyticsLoading } = useEventAnalytics(uuid || "");

  const isLoading = eventLoading || analyticsLoading;

  if (eventLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-gray-500">Event not found.</div>
      </AdminLayout>
    );
  }

  const stats = analytics?.basic_stats;
  const revenue = analytics?.revenue;
  const trend = analytics?.registration_trend ?? [];
  const ticketSales = analytics?.ticket_sales ?? [];
  const demographics = analytics?.demographics;

  const registered = stats?.total_registered ?? event.current_attendees ?? 0;
  const maxAttendees = event.max_attendees ?? 0;
  const capacityPct = maxAttendees > 0 ? Math.round((registered / maxAttendees) * 100) : 0;

  const totalSold = ticketSales.reduce((s, t) => s + t.sold_quantity, 0);
  const avgTicketPrice = totalSold > 0
    ? ticketSales.reduce((s, t) => s + t.price * t.sold_quantity, 0) / totalSold
    : 0;

  // Cumulative registration trend for the line chart
  let cumulative = 0;
  const trendData = trend.map((d) => {
    cumulative += d.count;
    return {
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daily: d.count,
      cumulative,
    };
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate(`/admin/events/${uuid}/manage`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Event
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Event Analytics</h1>
            <p className="text-gray-600 mt-1">{event.title}</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                {analyticsLoading
                  ? <Loader2 className="h-5 w-5 animate-spin mt-1 text-gray-400" />
                  : <p className="text-2xl font-bold text-green-600">{currency(revenue?.total ?? 0)}</p>}
                {revenue?.pending > 0 && (
                  <p className="text-xs text-yellow-500 mt-0.5">{currency(revenue.pending)} pending</p>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-green-500 shrink-0" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Registrations</p>
                <p className="text-2xl font-bold text-blue-600">{registered}</p>
                <p className="text-sm text-blue-500">{capacityPct}% capacity</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 shrink-0" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Checked In</p>
                {analyticsLoading
                  ? <Loader2 className="h-5 w-5 animate-spin mt-1 text-gray-400" />
                  : <p className="text-2xl font-bold text-purple-600">{stats?.checked_in ?? 0}</p>}
                <p className="text-sm text-purple-500">{stats?.check_in_rate ?? 0}% check-in rate</p>
              </div>
              <UserCheck className="h-8 w-8 text-purple-500 shrink-0" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Ticket Price</p>
                {analyticsLoading
                  ? <Loader2 className="h-5 w-5 animate-spin mt-1 text-gray-400" />
                  : <p className="text-2xl font-bold text-orange-600">{totalSold > 0 ? currency(avgTicketPrice) : "—"}</p>}
                <p className="text-sm text-orange-500">{totalSold} tickets sold</p>
              </div>
              <Tag className="h-8 w-8 text-orange-500 shrink-0" />
            </div>
          </Card>
        </div>

        {/* Registration Trend */}
        <Card className="card-enhanced">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" /> Registration Trend
            </h3>
            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-gray-400 h-64 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : trendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No registration data yet.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="daily" name="Daily" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative" stroke="#10B981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Sales by Category */}
          <Card className="card-enhanced">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-green-500" /> Ticket Sales by Category
              </h3>
              {analyticsLoading ? (
                <div className="flex items-center gap-2 text-gray-400 h-48 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
              ) : ticketSales.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No ticket categories.</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketSales} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v, name) => [v, name === "sold_quantity" ? "Sold" : "Available"]} />
                      <Bar dataKey="max_quantity" name="Available" fill="#E5E7EB" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="sold_quantity" name="Sold" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Detail rows */}
              {!analyticsLoading && ticketSales.length > 0 && (
                <div className="mt-4 space-y-2">
                  {ticketSales.map((t) => (
                    <div key={t.name} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate">{t.name}</span>
                      <span className="text-gray-500 shrink-0 ml-2">
                        {t.sold_quantity}/{t.max_quantity} · {currency(t.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Revenue Breakdown */}
          <Card className="card-enhanced">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" /> Revenue Breakdown
              </h3>
              {analyticsLoading ? (
                <div className="flex items-center gap-2 text-gray-400 h-48 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
              ) : (
                <div className="space-y-4 mt-2">
                  {[
                    { label: "Completed", value: revenue?.total ?? 0, color: "bg-green-500", textColor: "text-green-600" },
                    { label: "Pending", value: revenue?.pending ?? 0, color: "bg-yellow-400", textColor: "text-yellow-600" },
                    { label: "Refunded", value: revenue?.refunded ?? 0, color: "bg-red-400", textColor: "text-red-600" },
                  ].map(({ label, value, color, textColor }) => {
                    const grand = (revenue?.total ?? 0) + (revenue?.pending ?? 0) + (revenue?.refunded ?? 0);
                    const pct = grand > 0 ? Math.round((value / grand) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{label}</span>
                          <span className={`font-semibold ${textColor}`}>{currency(value)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Speakers</p>
                      <p className="text-lg font-bold">{demographics?.total_speakers ?? event.speakers?.length ?? 0}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Sessions</p>
                      <p className="text-lg font-bold">{demographics?.total_sessions ?? event.sessions?.length ?? 0}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Exhibitors</p>
                      <p className="text-lg font-bold">{demographics?.total_exhibitors ?? 0}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Team Members</p>
                      <p className="text-lg font-bold">{demographics?.team_members ?? 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Capacity progress */}
        <Card className="card-enhanced">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" /> Capacity &amp; Check-in
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Registrations</span>
                  <span className="font-medium">{registered} / {maxAttendees} ({capacityPct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.min(capacityPct, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Checked In</span>
                  <span className="font-medium">{stats?.checked_in ?? 0} / {registered} ({stats?.check_in_rate ?? 0}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: `${Math.min(stats?.check_in_rate ?? 0, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default EventAnalytics;

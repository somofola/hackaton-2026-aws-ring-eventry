import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DateRange } from "react-day-picker";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import AppDownloadPrompt from "@/components/AppDownloadPrompt";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Users, Calendar, DollarSign,
  TrendingUp, TrendingDown, Eye, UserPlus, CalendarPlus,
  Activity, BarChart3, ChevronRight, Loader2, CalendarIcon,
} from "lucide-react";
import api from "@/services/api";
import { useExchangeRates } from "@/hooks/useExchangeRates";

// Rate format from open.er-api.com: units of currency per 1 USD (e.g. NGN: 1540)
// → divide amount by rate to get USD
function toUSD(byCurrency: Record<string, number>, rates: Record<string, number>): number {
  return Object.entries(byCurrency).reduce((sum, [currency, amount]) => {
    const rate = rates[currency.toUpperCase()] ?? 1;
    return sum + amount / rate;
  }, 0);
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function fmtUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(2)}`;
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// API interfaces
// ---------------------------------------------------------------------------
type CurrencyMap = Record<string, number>;

interface AdminStats {
  total_users: number;
  users_change: number;
  total_events: number;
  events_change: number;
  ticket_rev_all_time: CurrencyMap;
  ticket_rev_period: CurrencyMap;
  ticket_rev_prev: CurrencyMap;
  active_users: number;
  new_signups: number;
  events_created: number;
}

interface RevenueChartPoint {
  period: string;
  ticket: CurrencyMap;
}

interface RecentUser {
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface RecentEvent {
  title: string;
  status: string;
  current_attendees: number;
  created_at: string;
  updated_at: string;
}

interface TopEvent {
  title: string;
  attendees: number;
  revenue: number;
}

interface DashboardData {
  stats: AdminStats;
  revenue_chart: RevenueChartPoint[];
  recent_users: RecentUser[];
  recent_events: RecentEvent[];
  top_events: TopEvent[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "live":      return "text-green-600";
    case "draft":     return "text-orange-500";
    case "cancelled": return "text-red-500";
    default:          return "text-blue-600";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
interface StatCardProps {
  to: string;
  bg: string;
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  children: React.ReactNode;
}

const StatCard = ({ to, bg, icon, label, loading, children }: StatCardProps) => (
  <Link to={to} className="block">
    <div
      className="relative rounded-xl overflow-hidden h-full min-h-[120px] cursor-pointer group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
      style={{ background: bg }}
    >
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/[0.07]" />
      <div className="absolute top-1/2 right-6 w-10 h-10 rounded-full bg-white/[0.05]" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent" />
      <div className="relative z-10 p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">{icon}</div>
          <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/80 transition-colors" />
        </div>
        {loading
          ? <Loader2 className="h-5 w-5 animate-spin text-white/50 my-1" />
          : <div className="mt-auto">{children}</div>}
        <p className="text-[10px] font-semibold text-white/50 tracking-widest uppercase mt-2">{label}</p>
      </div>
    </div>
  </Link>
);

const Change = ({ value }: { value: number }) => (
  <div className="flex items-center gap-1">
    {value >= 0
      ? <TrendingUp className="h-3 w-3 text-green-300" />
      : <TrendingDown className="h-3 w-3 text-red-300" />}
    <span className={`text-[10px] font-medium ${value >= 0 ? "text-green-300" : "text-red-300"}`}>
      {value >= 0 ? "+" : ""}{value}% this period
    </span>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{fmtUSD(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const AdminDashboard = () => {
  const [range, setRange] = useState("this_month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { rates, ratesLoading, ratesFallback } = useExchangeRates();

  // When a preset is selected, clear the custom date range
  const handleRangeChange = (value: string) => {
    setRange(value);
    setDateRange(undefined);
  };

  // When a date range is fully selected, switch to custom mode
  const handleDateRangeSelect = (dr: DateRange | undefined) => {
    setDateRange(dr);
    if (dr?.from && dr?.to) {
      setRange("custom");
      setCalendarOpen(false);
    }
  };

  useEffect(() => {
    // Don't fetch if custom mode but range not fully selected
    if (range === "custom" && (!dateRange?.from || !dateRange?.to)) return;

    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setData(null);

    const params = new URLSearchParams({ range });
    if (range === "custom" && dateRange?.from && dateRange?.to) {
      params.set("from", dateRange.from.toISOString().slice(0, 10));
      params.set("to",   dateRange.to.toISOString().slice(0, 10));
    }

    api.get(`/admin/dashboard?${params.toString()}`, { signal: controller.signal })
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err.code !== "ERR_CANCELED") {
          setError("Failed to load dashboard data");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [range, dateRange]);

  if (!loading && error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-red-500">{error}</div>
      </AdminLayout>
    );
  }

  // Derived USD values (wait for rates before computing)
  const stats = data?.stats;
  const ticketRevUSD       = stats && !ratesLoading ? toUSD(stats.ticket_rev_all_time, rates) : 0;
  const ticketPeriodUSD    = stats && !ratesLoading ? toUSD(stats.ticket_rev_period, rates) : 0;
  const ticketPrevUSD      = stats && !ratesLoading ? toUSD(stats.ticket_rev_prev,   rates) : 0;
  const ticketChange       = pct(ticketPeriodUSD, ticketPrevUSD);

  const totalRevUSD = ticketRevUSD;
  const revenueChange = ticketChange;

  // Chart — convert each interval's per-currency maps to USD numbers
  const chartData = (data?.revenue_chart ?? []).map((pt) => ({
    period:          pt.period,
    ticket_revenue:  toUSD(pt.ticket, rates),
  }));

  return (
    <AdminLayout>
      <AppDownloadPrompt />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Platform overview and key metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range === "custom" ? "custom" : range} onValueChange={handleRangeChange}>
              <SelectTrigger className="w-36">
                <SelectValue>
                  {range === "custom" ? "Custom" : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This week</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="last_month">Last month</SelectItem>
                <SelectItem value="3months">3 months</SelectItem>
                <SelectItem value="6months">6 months</SelectItem>
                <SelectItem value="1year">1 year</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-normal"
                >
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  {dateRange?.from && dateRange?.to
                    ? `${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}`
                    : "Pick dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  disabled={{ after: new Date() }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Primary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <StatCard to="/admin/users" bg="linear-gradient(135deg,#1e40af 0%,#2563eb 55%,#3b82f6 100%)"
            icon={<Users className="h-4 w-4" />} label="Total Users" loading={loading}>
            <div className="text-2xl md:text-3xl font-bold text-white leading-none">
              {stats?.total_users.toLocaleString()}
            </div>
            <Change value={stats?.users_change ?? 0} />
          </StatCard>

          <StatCard to="/admin/events" bg="linear-gradient(135deg,#92400e 0%,#d97706 55%,#f59e0b 100%)"
            icon={<Calendar className="h-4 w-4" />} label="Total Events" loading={loading}>
            <div className="text-2xl md:text-3xl font-bold text-white leading-none">
              {stats?.total_events.toLocaleString()}
            </div>
            <Change value={stats?.events_change ?? 0} />
          </StatCard>

          <StatCard to="/admin/payments" bg="linear-gradient(135deg,#14532d 0%,#16a34a 55%,#22c55e 100%)"
            icon={<DollarSign className="h-4 w-4" />} label="Total Revenue (USD)" loading={loading}>
            <div className="text-2xl md:text-3xl font-bold text-white leading-none">
              {fmtUSD(totalRevUSD)}
            </div>
            <Change value={revenueChange} />
          </StatCard>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard to="/admin/users" bg="linear-gradient(135deg,#134e4a 0%,#0d9488 55%,#14b8a6 100%)"
            icon={<Eye className="h-4 w-4" />} label="Active Users" loading={loading}>
            <div className="text-2xl md:text-3xl font-bold text-white leading-none">
              {stats?.active_users.toLocaleString()}
            </div>
            <p className="text-[10px] text-white/60 mt-1 font-medium">active this period</p>
          </StatCard>

          <StatCard to="/admin/users" bg="linear-gradient(135deg,#312e81 0%,#4338ca 55%,#6366f1 100%)"
            icon={<UserPlus className="h-4 w-4" />} label="New Signups" loading={loading}>
            <div className="text-2xl md:text-3xl font-bold text-white leading-none">
              {stats?.new_signups.toLocaleString()}
            </div>
            <p className="text-[10px] text-white/60 mt-1 font-medium">registered this period</p>
          </StatCard>

          <StatCard to="/admin/events" bg="linear-gradient(135deg,#881337 0%,#e11d48 55%,#f43f5e 100%)"
            icon={<CalendarPlus className="h-4 w-4" />} label="Events Created" loading={loading}>
            <div className="text-2xl md:text-3xl font-bold text-white leading-none">
              {stats?.events_created.toLocaleString()}
            </div>
            <p className="text-[10px] text-white/60 mt-1 font-medium">created this period</p>
          </StatCard>
        </div>

        {/* Revenue Chart */}
        <div className="grid grid-cols-1 gap-4">

          {/* Event Ticket Revenue — Line Chart */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    Event Ticket Revenue
                  </CardTitle>
                  <p className="text-xs text-gray-400 mt-1">Paid event ticket sales</p>
                </div>
                {!loading && stats && (
                  <div className="flex gap-4 text-right shrink-0">
                    <div>
                      <p className="text-[10px] text-gray-400">Period</p>
                      <p className="text-xs font-semibold text-emerald-600">{fmtUSD(ticketPeriodUSD)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">All time</p>
                      <p className="text-xs font-semibold text-emerald-700">{fmtUSD(ticketRevUSD)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Change</p>
                      <p className={`text-xs font-semibold ${ticketChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {ticketChange >= 0 ? "+" : ""}{ticketChange}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-52">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => fmtUSD(v)} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                      formatter={() => "Ticket Revenue"} />
                    <Line type="monotone" dataKey="ticket_revenue" stroke="#10b981" strokeWidth={2}
                      dot={{ r: 3, fill: "#10b981" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link to="/admin/users" className="block group">
            <Card className="h-full hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Registrations
                </CardTitle>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                ) : !data?.recent_users.length ? (
                  <p className="text-sm text-gray-500">No recent registrations.</p>
                ) : (
                  <div className="space-y-4">
                    {data.recent_users.map((user, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email} · {user.role} · {timeAgo(user.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/events" className="block group">
            <Card className="h-full hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Recent Events
                </CardTitle>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                ) : !data?.recent_events.length ? (
                  <p className="text-sm text-gray-500">No events yet.</p>
                ) : (
                  <div className="space-y-4">
                    {data.recent_events.map((event, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <p className={`text-xs ${statusColor(event.status)}`}>
                            {event.status} · {event.current_attendees} attendee{event.current_attendees !== 1 ? "s" : ""} · {timeAgo(event.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Top Events */}
        <Link to="/admin/events" className="block group">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Top Performing Events
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : !data?.top_events.length ? (
                <p className="text-sm text-gray-500">No event data yet.</p>
              ) : (
                <div className="divide-y">
                  {data.top_events.map((event, i) => (
                    <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-bold text-gray-300 w-4 shrink-0">#{i + 1}</span>
                        <p className="text-sm font-medium truncate">{event.title}</p>
                      </div>
                      <div className="flex items-center gap-6 ml-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-700">{event.attendees.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">attendees</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-violet-600">{fmtUSD(event.revenue)}</p>
                          <p className="text-xs text-gray-400">revenue</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

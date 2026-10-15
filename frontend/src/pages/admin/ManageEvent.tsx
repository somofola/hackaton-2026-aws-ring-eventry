import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent, useEventAnalytics } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, UserCheck, QrCode, Settings, BarChart3,
  Calendar, MapPin, DollarSign, TrendingUp, Mic, Clock,
  CreditCard, Building, Loader2, User, Mail, Phone, Copy,
} from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import CloneEventDialog from "@/components/events/CloneEventDialog";

const fmt = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`;
};

const ManageEvent = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading: eventLoading } = useEvent(uuid || "");
  const { data: analytics, isLoading: analyticsLoading } = useEventAnalytics(uuid || "");
  const [cloneOpen, setCloneOpen] = useState(false);

  if (eventLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading event…
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
  const demographics = analytics?.demographics;

  const totalSold = analytics?.ticket_sales.reduce((s, t) => s + Number(t.sold_quantity), 0) ?? 0;
  const avgTicketPrice = totalSold > 0 && analytics
    ? analytics.ticket_sales.reduce((s, t) => s + Number(t.price) * Number(t.sold_quantity), 0) / totalSold
    : 0;

  const checkInRate = stats?.check_in_rate ?? 0;
  const checkedIn = stats?.checked_in ?? 0;
  const registered = stats?.total_registered ?? event.current_attendees ?? 0;

  const quickActions = [
    { title: "Check-in Attendees", description: "Scan QR codes to check in attendees", icon: QrCode, path: `/admin/events/${uuid}/checkin`, color: "bg-green-500" },
    { title: "View Attendees", description: "See all registered attendees and their status", icon: Users, path: `/admin/events/${uuid}/attendees`, color: "bg-blue-500" },
    { title: "Event Analytics", description: "View detailed event statistics and insights", icon: BarChart3, path: `/admin/events/${uuid}/analytics`, color: "bg-purple-500" },
    { title: "Edit Event", description: "Update event details and configuration", icon: Settings, path: `/admin/events/${uuid}/edit`, color: "bg-orange-500" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate("/admin/events")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gradient">Manage Event</h1>
              <p className="text-gray-600 mt-1">Event day activities and management</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-blue-300 text-blue-600 hover:bg-blue-50 shrink-0"
            onClick={() => setCloneOpen(true)}
          >
            <Copy className="mr-2 h-4 w-4" /> Clone Event
          </Button>
        </div>

        {/* Event Overview */}
        <Card className="card-enhanced">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{event.title}</h2>
                <p className="text-gray-600 mt-1">{event.description}</p>
              </div>
              <Badge variant={event.status === "live" ? "default" : "secondary"}>
                {event.status}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <p className="font-medium">
                    {new Date(event.start_date).toLocaleDateString()}
                    {event.end_date && event.end_date !== event.start_date
                      ? ` – ${new Date(event.end_date).toLocaleDateString()}` : ""}
                  </p>
                  <p className="text-sm text-gray-500">
                    {event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-gray-500 shrink-0" />
                <p className="font-medium">{event.location}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <p className="font-medium">{registered}/{event.max_attendees}</p>
                  <p className="text-sm text-gray-500">Attendees</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{registered}</p>
                <p className="text-sm text-gray-500">Registered</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-green-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{checkedIn}</p>
                <p className="text-sm text-gray-500">Checked In</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Mic className="h-5 w-5 text-purple-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{demographics?.total_speakers ?? event.speakers?.length ?? 0}</p>
                <p className="text-sm text-gray-500">Speakers</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{demographics?.total_sessions ?? event.sessions?.length ?? 0}</p>
                <p className="text-sm text-gray-500">Sessions</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Payment Summary */}
        <Card className="card-enhanced">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" /> Payment Summary
              </h3>
              <Button variant="outline" onClick={() => navigate(`/admin/events/${uuid}/payments`)}>
                <CreditCard className="mr-2 h-4 w-4" /> View All Payments
              </Button>
            </div>
            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-gray-400 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{fmt(revenue?.total ?? 0)}</p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{fmt(revenue?.pending ?? 0)}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{fmt(revenue?.refunded ?? 0)}</p>
                  <p className="text-sm text-gray-600">Refunded</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{totalSold > 0 ? fmt(avgTicketPrice) : "—"}</p>
                  <p className="text-sm text-gray-600">Avg. Ticket Price</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Analytics */}
        <Card className="card-enhanced">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" /> Event Analytics
            </h3>
            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-gray-400 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Check-in Rate</p>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{checkInRate}%</p>
                  <p className="text-sm text-gray-600">Of registered attendees</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Tickets Sold</p>
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{totalSold}</p>
                  <p className="text-sm text-gray-600">Across all categories</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Exhibitors</p>
                    <Building className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{demographics?.total_exhibitors ?? 0}</p>
                  <p className="text-sm text-gray-600">Registered exhibitors</p>
                </div>
              </div>
            )}

            {/* Ticket sales breakdown */}
            {(analytics?.ticket_sales?.length ?? 0) > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-600 mb-3">Ticket Sales by Category</p>
                <div className="space-y-2">
                  {analytics!.ticket_sales.map((t) => (
                    <div key={t.name} className="flex items-center gap-3">
                      <span className="text-sm w-36 truncate text-gray-700">{t.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${t.max_quantity > 0 ? (t.sold_quantity / t.max_quantity) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-20 text-right">
                        {t.sold_quantity}/{t.max_quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Team Members */}
        {(event.team_members?.length ?? 0) > 0 && (
          <Card className="card-enhanced">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" /> Event Team
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {event.team_members!.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.role}</p>
                      <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>
                        {m.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Clone dialog */}
        <CloneEventDialog
          open={cloneOpen}
          onOpenChange={setCloneOpen}
          eventUuid={event.uuid}
          eventTitle={event.title}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action) => (
            <Card key={action.title} className="card-enhanced hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(action.path)}>
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`${action.color} p-3 rounded-lg text-white shrink-0`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{action.title}</h3>
                    <p className="text-gray-600 mt-1">{action.description}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageEvent;

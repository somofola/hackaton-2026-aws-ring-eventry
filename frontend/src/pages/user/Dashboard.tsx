
import React, { useEffect, useState } from "react";
import UserLayout from "@/components/layout/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, UserCheck, Loader2, ChevronRight, CreditCard } from "lucide-react";
import api from "@/services/api";
import AppDownloadPrompt from "@/components/AppDownloadPrompt";

interface Enrollment {
  id: number;
  event_id: number;
  checked_in: boolean;
  status: string;
  enrolled_at: string;
  event: {
    id: number;
    title: string;
    date: string;
    location: string;
    price: number | null;
    status: string;
  } | null;
}

interface DashboardStats {
  eventsAttended: number;
  upcomingEventsCount: number;
  ticketsPurchased: number;
  upcomingEvents: Enrollment[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [enrollmentsRes] = await Promise.allSettled([
          api.get("/my-enrollments"),
        ]);

        let enrollments: Enrollment[] = [];
        if (enrollmentsRes.status === "fulfilled") {
          const d = enrollmentsRes.value.data;
          enrollments = Array.isArray(d) ? d : [];
        }

        const today = new Date().toISOString().split("T")[0];
        const eventsAttended = enrollments.filter(
          (e) => e.checked_in || e.status === "attended"
        ).length;
        const upcomingEnrollments = enrollments
          .filter((e) => e.event && e.event.date >= today && e.event.status === "live")
          .sort((a, b) => (a.event!.date > b.event!.date ? 1 : -1));

        setStats({
          eventsAttended,
          upcomingEventsCount: upcomingEnrollments.length,
          ticketsPurchased: enrollments.length,
          upcomingEvents: upcomingEnrollments.slice(0, 3),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <UserLayout>
      <AppDownloadPrompt />
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's an overview of your events.
          </p>
        </div>

        {/* Top metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">

          {/* Events */}
          <Link to="/user/events" className="block">
            <div className="relative rounded-xl overflow-hidden h-full min-h-[130px] cursor-pointer group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #92400e 0%, #d97706 55%, #f59e0b 100%)" }}>
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/[0.07]" />
              <div className="absolute top-1/2 right-6 w-10 h-10 rounded-full bg-white/[0.05]" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent" />
              <div className="relative z-10 p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-white" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/80 transition-colors" />
                </div>
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-white/50 my-1" /> : (
                  <div className="flex items-end gap-1.5 mt-auto">
                    <div>
                      <span className="text-2xl md:text-3xl font-bold text-white leading-none">{stats?.eventsAttended ?? 0}</span>
                      <p className="text-[10px] text-white/60 mt-1 font-medium">attended</p>
                    </div>
                    <span className="text-base font-light text-white/30 mb-4">/</span>
                    <div>
                      <span className="text-2xl md:text-3xl font-bold text-white leading-none">{stats?.upcomingEventsCount ?? 0}</span>
                      <p className="text-[10px] text-white/60 mt-1 font-medium">upcoming</p>
                    </div>
                  </div>
                )}
                <p className="text-[10px] font-semibold text-white/50 tracking-widest uppercase mt-2">Events</p>
              </div>
            </div>
          </Link>

          {/* Tickets */}
          <Link to="/user/events" className="block">
            <div className="relative rounded-xl overflow-hidden h-full min-h-[130px] cursor-pointer group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #3b82f6 100%)" }}>
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/[0.07]" />
              <div className="absolute top-1/2 right-6 w-10 h-10 rounded-full bg-white/[0.05]" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent" />
              <div className="relative z-10 p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white/80 transition-colors" />
                </div>
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-white/50 my-1" /> : (
                  <div className="mt-auto">
                    <span className="text-2xl md:text-3xl font-bold text-white leading-none">{stats?.ticketsPurchased ?? 0}</span>
                  </div>
                )}
                <p className="text-[10px] font-semibold text-white/50 tracking-widest uppercase mt-2">Tickets Purchased</p>
              </div>
            </div>
          </Link>

        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <Link to="/user/events">
                    <Button size="sm" variant="outline" className="border-blue-600 text-blue-600">
                      View Events
                    </Button>
                  </Link>
                </div>
                <h3 className="font-semibold text-lg mb-1">Browse Events</h3>
                <p className="text-gray-600 text-sm">
                  Discover and register for upcoming events.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : stats?.upcomingEvents?.length ? (
                <div className="divide-y divide-gray-200">
                  {stats.upcomingEvents.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{enrollment.event!.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(enrollment.event!.date)}
                            {enrollment.event!.location ? ` · ${enrollment.event!.location}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {enrollment.event!.price === 0 || enrollment.event!.price === null ? (
                          <span className="text-xs text-green-600 font-medium">Free</span>
                        ) : (
                          <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />${enrollment.event!.price}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="p-4 bg-gray-50">
                    <Link to="/user/events">
                      <Button variant="outline" size="sm" className="w-full">View All Events</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  <div className="p-6 text-center text-sm text-gray-500">
                    No upcoming events. Browse events to register.
                  </div>
                  <div className="p-4 bg-gray-50">
                    <Link to="/user/events">
                      <Button variant="outline" size="sm" className="w-full">Browse Events</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
};

export default Dashboard;

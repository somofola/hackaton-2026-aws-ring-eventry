import React, { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/layout/UserLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import ListPagination from "@/components/ui/list-pagination";
import Preloader from "@/components/ui/preloader";
import { calculateDistance, getUserLocation, Coords } from "@/utils/distance";
import { Calendar, MapPin, Users, Search, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Event } from "@/types";
import api from "@/services/api";
import { parseEventDateTime } from "@/utils/datetime";

type FilterKey = "all" | "live" | "upcoming" | "past";

const EVENT_GRADIENTS = [
  { from: "#3b82f6", to: "#7c3aed" }, // blue → violet
  { from: "#10b981", to: "#0891b2" }, // emerald → cyan
  { from: "#f59e0b", to: "#ef4444" }, // amber → red
  { from: "#ec4899", to: "#8b5cf6" }, // pink → purple
  { from: "#06b6d4", to: "#2563eb" }, // cyan → blue
  { from: "#84cc16", to: "#059669" }, // lime → emerald
  { from: "#f97316", to: "#dc2626" }, // orange → red
  { from: "#a855f7", to: "#6366f1" }, // purple → indigo
];

function eventGradient(id: number) {
  return EVENT_GRADIENTS[id % EVENT_GRADIENTS.length];
}

function classifyEvent(event: Event): FilterKey {
  if (event.status === "completed") return "past";

  const now = Date.now();
  const startMs = parseEventDateTime(event.start_date, event.start_time ?? "00:00");

  // Not started yet → upcoming
  if (startMs > now) return "upcoming";

  // Started — check whether end date/time has also passed
  if (event.end_date) {
    const endMs = parseEventDateTime(event.end_date, event.end_time ?? "23:59");
    if (endMs > 0 && now > endMs) return "past";
  }

  // Started and not yet ended → live
  return "live";
}

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "live",     label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past",     label: "Past" },
];

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [enrolledUuids, setEnrolledUuids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");
  const [maxDistance, setMaxDistance] = useState([50]);
  const [distanceEnabled, setDistanceEnabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 6;
  const [isOpen, setIsOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const [liveRes, completedRes, enrollmentsRes] = await Promise.allSettled([
          api.get("/events/status/live"),
          api.get("/events/status/completed"),
          api.get("/my-enrollments"),
        ]);

        if (liveRes.status === "fulfilled" || completedRes.status === "fulfilled") {
          const toList = (res: PromiseSettledResult<any>) =>
            res.status === "fulfilled"
              ? (Array.isArray(res.value.data) ? res.value.data : (res.value.data?.data ?? []))
              : [];
          const merged = [...toList(liveRes), ...toList(completedRes)];
          const seen = new Set<number>();
          const deduped = merged.filter((e: any) => {
            if (seen.has(e.id)) return false;
            seen.add(e.id);
            return true;
          });
          const sorted = deduped.sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setEvents(sorted);
          const hasUpcoming = sorted.some((e: any) => classifyEvent(e) === "upcoming");
          const hasLive = sorted.some((e: any) => classifyEvent(e) === "live");
          setFilter(hasUpcoming ? "upcoming" : hasLive ? "live" : "all");
        } else {
          setError("Failed to load events");
        }
        if (enrollmentsRes.status === "fulfilled") {
          const data = enrollmentsRes.value.data;
          const list = Array.isArray(data) ? data : (data?.data ?? []);
          const uuids = new Set<string>(
            list
              .filter((e: any) => e.status === "enrolled" || e.status === "attended")
              .map((e: any) => e.event?.uuid ?? e.event_uuid ?? e.uuid)
              .filter(Boolean)
          );
          setEnrolledUuids(uuids);
        }
      } catch (err) {
        setError("Failed to load events");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Request user location once
  useEffect(() => {
    getUserLocation().then(setUserLocation);
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchInput]);

  // Reset page when filter changes
  useEffect(() => { setCurrentPage(1); }, [filter]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: events.length, live: 0, upcoming: 0, past: 0 };
    events.forEach((e) => { c[classifyEvent(e)]++; });
    return c;
  }, [events]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    // Pill filter
    if (filter !== "all" && classifyEvent(event) !== filter) return false;

    const matchesSearch = !search ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || event.tags.includes(selectedCategory);
    const cats = Array.isArray(event.ticket_categories) ? event.ticket_categories : [];
    const lowestPrice = cats.length > 0 ? Math.min(...cats.map((tc: any) => tc.price)) : 0;
    const matchesPrice = selectedPrice === "all" ||
      (selectedPrice === "free" && lowestPrice === 0) ||
      (selectedPrice === "paid" && lowestPrice > 0) ||
      (selectedPrice === "under50" && lowestPrice > 0 && lowestPrice < 50) ||
      (selectedPrice === "50to200" && lowestPrice >= 50 && lowestPrice <= 200) ||
      (selectedPrice === "over200" && lowestPrice > 200);

    // Date filtering
    const eventDate = new Date(event.start_date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    let matchesDate = true;
    if (selectedDate === "today") {
      matchesDate = eventDate.toDateString() === today.toDateString();
    } else if (selectedDate === "tomorrow") {
      matchesDate = eventDate.toDateString() === tomorrow.toDateString();
    } else if (selectedDate === "this-week") {
      matchesDate = eventDate >= today && eventDate <= nextWeek;
    } else if (selectedDate === "this-month") {
      matchesDate = eventDate >= today && eventDate <= nextMonth;
    } else if (selectedDate === "upcoming") {
      matchesDate = eventDate >= today;
    } else if (selectedDate === "completed") {
      matchesDate = eventDate < today;
    }

    // Distance filtering — only active when checkbox is on AND location is available
    let matchesDistance = true;
    if (distanceEnabled && userLocation && event.latitude && event.longitude) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        event.latitude,
        event.longitude
      );
      matchesDistance = distance <= maxDistance[0];
    }

    return matchesSearch && matchesCategory && matchesPrice && matchesDate && matchesDistance;
  }), [events, filter, search, selectedCategory, selectedPrice, selectedDate, maxDistance, distanceEnabled, userLocation]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + eventsPerPage);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">
              Discover and join exciting events near you
            </p>
          </div>
          <Link to="/user/events/history">
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              View Attended Events
            </Button>
          </Link>
        </div>

        {/* Filter Pills + Search */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                filter === key
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                filter === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {counts[key]}
              </span>
            </button>
          ))}
          <div className="relative sm:ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search events…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardHeader
            className="cursor-pointer flex items-center justify-between"
            onClick={() => setIsOpen(!isOpen)}
          >
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Find Your Perfect Event
            </CardTitle>

            {/* Chevron only visible on mobile */}
            <div className="block md:hidden">
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </CardHeader>

          {/* On mobile → collapsible. On desktop → always open */}
          {(isOpen || window.innerWidth >= 768) && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="networking">Networking</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="tomorrow">Tomorrow</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range</label>
                  <Select value={selectedPrice} onValueChange={setSelectedPrice}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Prices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="under50">Under $50</SelectItem>
                      <SelectItem value="50to200">$50 - $200</SelectItem>
                      <SelectItem value="over200">Over $200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Distance */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="distanceToggle"
                      checked={distanceEnabled}
                      onChange={(e) => setDistanceEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                    />
                    <label htmlFor="distanceToggle" className="text-sm font-medium cursor-pointer select-none">
                      Distance:{" "}
                      {!distanceEnabled
                        ? <span className="text-gray-400 font-normal">off</span>
                        : !userLocation
                          ? <span className="text-gray-400 font-normal text-xs">(location unavailable)</span>
                          : `${maxDistance[0]}km`
                      }
                    </label>
                  </div>
                  <div className={`px-2 transition-opacity ${!distanceEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                    <Slider
                      value={maxDistance}
                      onValueChange={setMaxDistance}
                      max={100}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1km</span>
                      <span>100km</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredEvents.length} of {events.length} events
              </div>
            </CardContent>
          )}
        </Card>

        {/* Events Grid */}
        {loading ? (
          <Preloader message="Loading events..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (() => {
                    const g = eventGradient(event.id);
                    return (
                      <div
                        className="w-full h-full relative"
                        style={{ background: `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)` }}
                      >
                        {/* dot pattern */}
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
                            backgroundSize: "22px 22px",
                          }}
                        />
                        {/* diagonal stripe accent */}
                        <div
                          className="absolute inset-0 opacity-10"
                          style={{
                            backgroundImage: "repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 12px)",
                          }}
                        />
                        {/* calendar icon watermark */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Calendar className="h-12 w-12 text-white/30" />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    {enrolledUuids.has(event.uuid) && (
                      <Badge className="bg-green-100 text-green-800 border-green-200 shrink-0">
                        Enrolled
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {event.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(event.start_date).toLocaleDateString()} at {event.start_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{event.current_attendees} / {event.max_attendees} attendees</span>
                    </div>
                    {(() => {
                      const cats = Array.isArray(event.ticket_categories) ? event.ticket_categories : [];
                      const lowest = cats.length > 0
                        ? Math.min(...cats.map((tc: any) => tc.price))
                        : event.price ?? 0;
                      return lowest === 0 ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800">Free</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Tickets from</span>
                          <span className="font-semibold text-primary">${lowest}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {(Array.isArray(event.tags) && event.tags.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {event.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {event.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{event.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>

                <div className="p-6 pt-0">
                  <Link to={`/user/events/${event.slug}`}>
                    <Button className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredEvents.length}
            pageSize={eventsPerPage}
            onPageChange={setCurrentPage}
            itemLabel="events"
          />
        )}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No events found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or check back later for new events.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Events;

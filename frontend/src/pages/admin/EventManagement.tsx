
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useEvents, useDeleteEvent } from "@/hooks/useApi";
import { Event } from "@/types";
import { parseEventDateTime } from "@/utils/datetime";
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Edit,
  Trash2,
  UserCheck,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Award,
  Copy,
} from "lucide-react";
import CloneEventDialog from "@/components/events/CloneEventDialog";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import LocationPicker from "@/components/events/LocationPicker";

const PAGE_SIZE = 9;

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function gradientFor(id: string | number) {
  const s = String(id);
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return EVENT_GRADIENTS[Math.abs(hash) % EVENT_GRADIENTS.length];
}

type FilterKey = "all" | "draft" | "live" | "upcoming" | "past";

function classifyEvent(event: Event): FilterKey {
  if (event.status === "draft") return "draft";
  if (event.status === "cancelled" || event.status === "completed") return "past";

  const now = Date.now();
  const startMs = parseEventDateTime(event.start_date, event.start_time ?? "00:00");

  if (startMs > now) return "upcoming";

  if (event.end_date) {
    const endMs = parseEventDateTime(event.end_date, event.end_time ?? "23:59");
    if (endMs > 0 && now > endMs) return "past";
  }

  return "live";
}

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "live",     label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past",     label: "Past" },
  { key: "draft",    label: "Draft" },
];

const STATUS_STYLES: Record<FilterKey, string> = {
  all:      "",
  live:     "bg-green-100 text-green-700",
  upcoming: "bg-blue-100 text-blue-700",
  past:     "bg-gray-100 text-gray-500",
  draft:    "bg-yellow-100 text-yellow-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

const EventManagement = () => {
  const navigate = useNavigate();
  const { data: events = [], isLoading } = useEvents();
  const deleteEventMutation = useDeleteEvent();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterKey>("live");

  // Quick-create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "", start_date: "", end_date: "", start_time: "", end_time: "", location: "", event_type: "physical" as "virtual" | "physical" | "hybrid", virtual_link: "", issues_certificate: false });
  const setF = (k: keyof typeof createForm, v: string) => setCreateForm((p) => ({ ...p, [k]: v }));

  const handleQuickCreate = async () => {
    if (!createForm.title.trim() || !createForm.start_date || !createForm.start_time || !createForm.location.trim() || startDateError || endDateError || endTimeError) return;
    setCreating(true);
    try {
      const { data } = await api.post("/events", {
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        start_date: createForm.start_date,
        end_date: createForm.end_date || undefined,
        start_time: createForm.start_time,
        end_time: createForm.end_time || undefined,
        location: createForm.location.trim(),
        event_type: createForm.event_type,
        virtual_link: createForm.virtual_link.trim() || undefined,
        issues_certificate: createForm.issues_certificate,
        status: "draft",
      });
      toast({ title: "Event created. Complete the details below." });
      setCreateOpen(false);
      setCreateForm({ title: "", description: "", start_date: "", end_date: "", start_time: "", end_time: "", location: "", event_type: "physical", virtual_link: "", issues_certificate: false });
      navigate(`/admin/events/${data.uuid}/edit`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast({ title: e.response?.data?.message ?? "Failed to create event.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const startDateError = createForm.start_date && createForm.start_date < today ? "Start date cannot be in the past." : null;
  const endDateError = createForm.end_date && createForm.start_date && createForm.end_date < createForm.start_date ? "End date must be on or after start date." : null;
  const endTimeError = createForm.end_time && createForm.start_time && createForm.end_time <= createForm.start_time ? "End time must be after start time." : null;
  const canCreate = !!(createForm.title.trim() && createForm.start_date && createForm.start_time && createForm.location.trim() && !startDateError && !endDateError && !endTimeError);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchInput]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const filtered = useMemo(() => {
    let result = filter === "all" ? events : events.filter((e) => classifyEvent(e) === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [events, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: events.length, live: 0, upcoming: 0, past: 0, draft: 0 };
    events.forEach((e) => { c[classifyEvent(e)]++; });
    return c;
  }, [events]);

  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [cloneTarget, setCloneTarget]   = useState<Event | null>(null);

  const canDelete = (e: Event) => e.status === "draft" && e.current_attendees === 0;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEventMutation.mutateAsync(deleteTarget.uuid);
      toast({ title: "Event deleted." });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Failed to delete event.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-500 mt-1">Create and manage your corporate events</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
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

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                <div className="h-36 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No events found</p>
            {(filter !== "all" || search) ? (
              <p className="text-sm mt-1">
                Try{" "}
                <button
                  className="text-primary underline"
                  onClick={() => { setFilter("all"); setSearchInput(""); }}
                >
                  clearing filters
                </button>
              </p>
            ) : (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first event
              </Button>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginated.map((event) => {
              const cls = classifyEvent(event);
              return (
                <div
                  key={event.id}
                  className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                >
                  {/* Image / Gradient Banner */}
                  <div className="relative h-36 overflow-hidden">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (() => {
                      const g = gradientFor(event.uuid || event.id);
                      return (
                        <div
                          className="w-full h-full relative"
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
                    {/* Status badge */}
                    <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[cls] || "bg-gray-100 text-gray-500"}`}>
                      {cls.charAt(0).toUpperCase() + cls.slice(1)}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 mb-2">
                      {event.title}
                    </h3>

                    <div className="space-y-1.5 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{fmtDate(event.start_date)}{event.end_date ? ` – ${fmtDate(event.end_date)}` : ""}{event.start_time ? ` · ${event.start_time}` : ""}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>{event.current_attendees} / {event.max_attendees} attendees</span>
                      </div>
                    </div>

                    {/* Extra counts row */}
                    <div className="flex items-center gap-3 text-xs mb-4">
                      {event.speakers && event.speakers.length > 0 && (
                        <span className="text-blue-600">{event.speakers.length} speaker{event.speakers.length !== 1 ? "s" : ""}</span>
                      )}
                      {event.sessions && event.sessions.length > 0 && (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />{event.sessions.length} session{event.sessions.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => navigate(`/admin/events/${event.uuid}/manage`)}
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        Manage
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2.5"
                        onClick={() => navigate(`/admin/events/${event.uuid}/edit`)}
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2.5 text-blue-500 hover:text-blue-600 hover:border-blue-300"
                        onClick={() => setCloneTarget(event)}
                        title="Clone event"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2.5 text-red-500 hover:text-red-600 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => canDelete(event) && setDeleteTarget(event)}
                        disabled={!canDelete(event)}
                        title={!canDelete(event) ? "Only draft events with 0 attendees can be deleted" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? "default" : "outline"}
                    onClick={() => setPage(p)}
                    className="w-8 px-0"
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Quick-create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            <div>
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input placeholder="Event name" value={createForm.title} onChange={(e) => setF("title", e.target.value)} />
            </div>

            <div>
              <Label>Description <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
              <Textarea placeholder="Brief overview…" rows={3} value={createForm.description} onChange={(e) => setF("description", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={createForm.start_date} min={today} onChange={(e) => setF("start_date", e.target.value)} className={startDateError ? "border-red-400" : ""} />
                {startDateError && <p className="text-xs text-red-500 mt-1">{startDateError}</p>}
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={createForm.end_date} min={createForm.start_date || today} onChange={(e) => setF("end_date", e.target.value)} className={endDateError ? "border-red-400" : ""} />
                {endDateError && <p className="text-xs text-red-500 mt-1">{endDateError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time <span className="text-red-500">*</span></Label>
                <Input type="time" value={createForm.start_time} onChange={(e) => setF("start_time", e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={createForm.end_time} onChange={(e) => setF("end_time", e.target.value)} className={endTimeError ? "border-red-400" : ""} />
                {endTimeError && <p className="text-xs text-red-500 mt-1">{endTimeError}</p>}
              </div>
            </div>

            <LocationPicker
              locationType={createForm.event_type}
              location={createForm.location}
              virtualLink={createForm.virtual_link}
              onTypeChange={(t) => setCreateForm((p) => ({ ...p, event_type: t }))}
              onLocationChange={(v) => setF("location", v)}
              onVirtualLinkChange={(v) => setF("virtual_link", v)}
              required
            />

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-yellow-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Issue Attendance Certificates</p>
                  <p className="text-xs text-gray-500">Attendees can download a certificate after check-in</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={createForm.issues_certificate}
                onClick={() => setCreateForm((p) => ({ ...p, issues_certificate: !p.issues_certificate }))}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  createForm.issues_certificate ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    createForm.issues_certificate ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="button" onClick={handleQuickCreate} disabled={!canCreate || creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {creating ? "Creating…" : "Continue to Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone dialog */}
      {cloneTarget && (
        <CloneEventDialog
          open={!!cloneTarget}
          onOpenChange={(v) => !v && setCloneTarget(null)}
          eventUuid={cloneTarget.uuid}
          eventTitle={cloneTarget.title}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">"{deleteTarget?.title}"</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default EventManagement;

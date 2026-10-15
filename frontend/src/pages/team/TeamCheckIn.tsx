
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import TeamLayout from "@/components/layout/TeamLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RingCheckInView from "@/components/events/RingCheckInView";
import FaceCheckInScanner from "@/components/events/FaceCheckInScanner";
import {
  ArrowLeft, Calendar, MapPin, Users, QrCode, Search,
  UserCheck, XCircle, CheckCircle, Loader2, Clock,
  Layers, Globe, Award, Video, ScanFace,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEventEnrollments } from "@/hooks/useApi";
import { checkInEnrollment, fetchRingStatus, armRingDevice, disarmRingDevice, RingStatus } from "@/services/eventService";
import { fetchMyRingDevices, RingDevice } from "@/services/ringDeviceService";
import api from "@/services/api";
import { isEventPast } from "@/utils/datetime";
import { Bell } from "lucide-react";

const RING_CHIME_SKIP_MESSAGES: Record<string, string> = {
  not_configured: "Ring integration isn't configured on the server.",
  unsupported_device: "This Ring device has no chime hardware — it can't play a sound.",
  no_audio_slot: "No chime sound is assigned to this device yet.",
  api_error: "Ring rejected the chime request — check the device ID.",
};

interface Session {
  id: number;
  title: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
}

interface EventData {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  description: string | null;
  banner_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  event_type: string | null;
  status: string;
  max_attendees: number | null;
  website_url: string | null;
  issues_certificate: boolean;
  sessions: Session[];
}

function fmtTime(t: string | null) {
  if (!t) return null;
  // Extract HH:MM from any format: "HH:MM", "HH:MM:SS", or full datetime
  const match = t.match(/(\d{1,2}):(\d{2})/);
  if (!match) return t;
  const d = new Date();
  d.setHours(+match[1], +match[2], 0, 0);
  if (isNaN(d.getTime())) return t;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string | null) {
  if (!d) return null;
  const datePart = d.split("T")[0].split(" ")[0];
  const date = new Date(`${datePart}T00:00:00`);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

const TeamCheckIn = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [event, setEvent]             = useState<EventData | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [searchTerm, setSearchTerm]   = useState("");
  const [sessionFilter, setSessionFilter]     = useState<number | "all">("all");
  const [ringDeviceId, setRingDeviceId] = useState(() => localStorage.getItem("ring_device_id") || "");
  const [ringStatus, setRingStatus] = useState<RingStatus["ring"]>(null);
  const [armedForThisEvent, setArmedForThisEvent] = useState(false);
  const [arming, setArming] = useState(false);
  const [ringDevices, setRingDevices] = useState<RingDevice[]>([]);

  useEffect(() => {
    localStorage.setItem("ring_device_id", ringDeviceId);
  }, [ringDeviceId]);

  useEffect(() => {
    fetchMyRingDevices(event?.id).then(setRingDevices).catch(() => setRingDevices([]));
  }, [event?.id]);

  useEffect(() => {
    if (!event?.uuid || !ringDeviceId) {
      setRingStatus(null);
      return;
    }
    let cancelled = false;
    const poll = () => {
      fetchRingStatus(event.uuid, ringDeviceId)
        .then((data) => { if (!cancelled) setRingStatus(data.ring); })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [event?.uuid, ringDeviceId]);

  const ringApproachActive = ringStatus && (Date.now() - new Date(ringStatus.at).getTime()) < 30000;

  useEffect(() => {
    setArmedForThisEvent(false);
  }, [ringDeviceId, event?.id]);

  const handleToggleArm = async () => {
    if (!event || !ringDeviceId) return;
    setArming(true);
    try {
      if (armedForThisEvent) {
        await disarmRingDevice(ringDeviceId);
        setArmedForThisEvent(false);
        toast({ title: "Device disarmed", description: "Ring will no longer attempt automatic check-ins from this device." });
      } else {
        await armRingDevice(ringDeviceId, event.id);
        setArmedForThisEvent(true);
        toast({ title: "Device armed", description: "Approaching attendees will be auto-checked-in via QR/face capture from this Ring device." });
      }
    } catch {
      toast({ title: "Failed", description: "Could not update Ring device arming state.", variant: "destructive" });
    } finally {
      setArming(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    api.get(`/events/slug/${slug}`)
      .then(({ data }) => setEvent(data))
      .catch(() => setEvent(null))
      .finally(() => setLoadingEvent(false));
  }, [slug]);

  const { data: enrollments = [], refetch } = useEventEnrollments(event?.uuid ?? "");

  const handleManualCheckIn = async (enrollmentId: number, userName: string) => {
    if (!event) return;
    if (isEventPast(event)) {
      toast({ title: "Check-in Closed", description: "This event has ended. Check-in is no longer available.", variant: "destructive" });
      return;
    }
    try {
      const result = await checkInEnrollment(event.uuid, enrollmentId, "team", ringDeviceId);
      toast({ title: "Check-in Successful!", description: `${userName} has been checked in` });
      if (ringDeviceId && result?.ring_chime && !result.ring_chime.triggered) {
        toast({
          title: "Chime Didn't Sound",
          description: RING_CHIME_SKIP_MESSAGES[result.ring_chime.reason] ?? "The Ring chime couldn't be triggered.",
          variant: "destructive",
        });
      }
      await refetch();
    } catch {
      toast({ title: "Check-in Failed", variant: "destructive" });
    }
  };

  if (loadingEvent) {
    return (
      <TeamLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </TeamLayout>
    );
  }

  if (!event) {
    return (
      <TeamLayout>
        <div className="text-center py-12 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Event Not Found</h2>
          <p className="text-gray-600">The event doesn't exist or you don't have access.</p>
          <Link to="/team/events">
            <Button><ArrowLeft className="mr-2 h-4 w-4" />Back to Events</Button>
          </Link>
        </div>
      </TeamLayout>
    );
  }

  const isEnded = event ? isEventPast(event) : false;

  const checkedInCount = enrollments.filter((e) => e.checked_in).length;
  const pct = enrollments.length > 0 ? Math.round((checkedInCount / enrollments.length) * 100) : 0;

  if (isEnded) {
    return (
      <TeamLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Link to="/team/events">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Events</Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{event.title}</h1>
              <p className="text-gray-500 text-sm mt-0.5">Event Check-in Scanner</p>
            </div>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Check-in Closed</h2>
              <p className="text-gray-500 max-w-sm text-sm">
                This event has ended. Check-in is no longer available.
              </p>
              <div className="text-sm text-gray-400 mt-1">
                <span className="font-medium">{checkedInCount}</span> of{" "}
                <span className="font-medium">{enrollments.length}</span> attendees checked in
              </div>
            </CardContent>
          </Card>
        </div>
      </TeamLayout>
    );
  }

  const filtered = enrollments.filter((e) => {
    const matchesSearch =
      e.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const startLabel = [fmtDate(event.start_date), fmtTime(event.start_time)].filter(Boolean).join(" at ");
  const endLabel   = [fmtDate(event.end_date), fmtTime(event.end_time)].filter(Boolean).join(" at ");

  const isToday = event.start_date === new Date().toISOString().split("T")[0];

  return (
    <TeamLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/team/events">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Events</Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{event.title}</h1>
              {isToday && <Badge className="bg-green-100 text-green-800 border-green-200">Today</Badge>}
              {event.event_type && <Badge variant="outline">{event.event_type}</Badge>}
            </div>
            <p className="text-gray-600 text-sm mt-0.5">Event Check-in Scanner</p>
          </div>
        </div>

        {/* Banner */}
        {event.banner_image_url && (
          <div className="rounded-xl overflow-hidden h-36 md:h-48">
            <img src={event.banner_image_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Event Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base"></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Check-in progress bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">Check-in Progress</span>
                <span className="text-gray-500">{checkedInCount}/{enrollments.length} ({pct}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ring device link + approach banner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base"><Bell className="mr-2 h-4 w-4" />Ring Doorbell</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={ringDeviceId}
                onChange={(e) => setRingDeviceId(e.target.value)}
              >
                <option value="">Select a Ring device...</option>
                {ringDevices.map((d) => (
                  <option key={d.id} value={d.device_id}>
                    {d.name} {d.location ? `(${d.location})` : ""}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant={armedForThisEvent ? "destructive" : "default"}
                disabled={!ringDeviceId || arming}
                onClick={handleToggleArm}
                className="shrink-0"
              >
                {arming ? <Loader2 className="h-4 w-4 animate-spin" /> : armedForThisEvent ? "Disarm" : "Arm for this event"}
              </Button>
            </div>
            {armedForThisEvent && (
              <p className="text-xs text-gray-500">
                Approaching attendees are auto-checked-in via QR/face capture straight from this Ring device — no scanner needed.
              </p>
            )}
            {ringDeviceId && ringApproachActive && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                {ringStatus?.thumbnail_url && (
                  <img src={ringStatus.thumbnail_url} alt="Ring snapshot" className="h-16 w-16 rounded object-cover shrink-0" />
                )}
                <div>
                  <p className="font-medium text-amber-800">
                    {ringStatus?.event_type === "person_detected" ? "Someone's approaching" : "Motion detected"}
                  </p>
                  {ringStatus?.caption && (
                    <p className="text-sm text-amber-700 italic">{ringStatus.caption}</p>
                  )}
                  <p className="text-xs text-amber-600">{new Date(ringStatus!.at).toLocaleTimeString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><QrCode className="mr-2 h-5 w-5" />QR Code Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            {isEnded ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Clock className="h-8 w-8 text-gray-400" />
                <p className="font-medium text-gray-700">Check-in Closed</p>
                <p className="text-sm text-gray-500">This event has ended. Check-in is no longer available.</p>
              </div>
            ) : (
              <Tabs defaultValue="ring">
                <TabsList>
                  <TabsTrigger value="ring" className="flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5" /> Ring Counter
                  </TabsTrigger>
                  <TabsTrigger value="face" className="flex items-center gap-1.5">
                    <ScanFace className="h-3.5 w-3.5" /> Face Check-in
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ring" className="pt-2">
                  <RingCheckInView
                    eventUuid={event.uuid}
                    ringDeviceId={ringDeviceId}
                    checkedInBy="team"
                    onCheckedIn={() => refetch()}
                  />
                </TabsContent>

                <TabsContent value="face" className="pt-2">
                  <FaceCheckInScanner
                    eventUuid={event.uuid}
                    ringDeviceId={ringDeviceId}
                    checkedInBy="team"
                    onCheckedIn={() => refetch()}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Attendee List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />Attendee List ({filtered.length})
              </CardTitle>
              <Badge variant="outline">{checkedInCount} checked in</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Session filter pills */}
            {event.sessions?.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                <button
                  onClick={() => setSessionFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${sessionFilter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  All
                </button>
                {event.sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSessionFilter(sessionFilter === s.id ? "all" : s.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${sessionFilter === s.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {s.title}{s.startTime ? ` · ${fmtTime(s.startTime)}` : ""}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-gray-500 text-center py-6">
                  {searchTerm ? "No attendees match your search." : "No attendees registered yet."}
                </p>
              ) : (
                filtered.map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {enrollment.checked_in
                        ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                        : <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{enrollment.user_name}</p>
                        {/* <p className="text-xs text-gray-500 truncate">{enrollment.user_email}</p>*/}
                        {enrollment.checked_in_at && (
                          <p className="text-xs text-gray-400">
                            {new Date(enrollment.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {enrollment.checked_in ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          <UserCheck className="mr-1 h-3 w-3" />Checked In
                        </Badge>
                      ) : isEnded ? (
                        <Badge variant="outline" className="text-gray-400">Closed</Badge>
                      ) : (
                        <Button size="sm" onClick={() => handleManualCheckIn(enrollment.id, enrollment.user_name)}>
                          Check In
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </TeamLayout>
  );
};

export default TeamCheckIn;

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import TeamLayout from "@/components/layout/TeamLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Calendar, MapPin, Users, QrCode, Clock,
  CheckCircle, XCircle, Loader2, AlertCircle, Mic2,
  Layers, Tag, Globe, Mail, Phone, Building2, Award,
} from "lucide-react";
import api from "@/services/api";
import { isEventPast } from "@/utils/datetime";

interface Speaker {
  id: number;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  imageUrl: string | null;
}

interface Session {
  id: number;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  speakerIds: number[];
}

interface TicketCategory {
  id: number;
  name: string;
  description: string | null;
  price: number;
  maxQuantity: number;
  soldQuantity: number;
  color: string | null;
}

interface Exhibitor {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  boothNumber: string | null;
  logoUrl: string | null;
}

interface Sponsor {
  id: number;
  name: string;
  tier: string | null;
  logoUrl: string | null;
  website: string | null;
}

interface Enrollment {
  id: number;
  user_name: string;
  user_email: string;
  checked_in: boolean;
  checked_in_at: string | null;
  ticket_category?: string | null;
}

interface EventDetail {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  event_type: string | null;
  status: string;
  max_attendees: number | null;
  current_attendees: number;
  banner_image_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  issues_certificate: boolean;
  organizer_name: string | null;
  speakers: Speaker[];
  sessions: Session[];
  ticket_categories: TicketCategory[];
  exhibitors: Exhibitor[];
  sponsors: Sponsor[];
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "live") return "default";
  if (status === "completed") return "secondary";
  if (status === "cancelled") return "destructive";
  return "outline";
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

function fmtDate(d: string | null) {
  if (!d) return null;
  // Normalise: strip any time component so we always parse "YYYY-MM-DDT00:00:00"
  const datePart = d.split("T")[0].split(" ")[0];
  const date = new Date(`${datePart}T00:00:00`);
  if (isNaN(date.getTime())) return d; // fallback: show raw value
  return date.toLocaleDateString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

const TeamEventDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  const [event, setEvent]             = useState<EventDetail | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.get(`/events/slug/${slug}`)
      .then((evRes) => {
        const ev: EventDetail = evRes.data;
        setEvent(ev);
        return api.get(`/events/${ev.uuid}/enrollments`);
      })
      .then((enRes) => setEnrollments(enRes.data ?? []))
      .catch(() => setError("Event not found or you don't have access."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      </TeamLayout>
    );
  }

  if (error || !event) {
    return (
      <TeamLayout>
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Event Not Found</h2>
          <p className="text-gray-500">{error ?? "The event you're looking for doesn't exist or you don't have access."}</p>
          <Link to="/team/events">
            <Button><ArrowLeft className="mr-2 h-4 w-4" />Back to Events</Button>
          </Link>
        </div>
      </TeamLayout>
    );
  }

  const isEnded = isEventPast(event);

  const checkedInCount = enrollments.filter((e) => e.checked_in).length;
  const total          = enrollments.length;
  const pct            = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

  const startLabel = [fmtDate(event.start_date), fmtTime(event.start_time)].filter(Boolean).join(" at ");
  const endLabel   = [fmtDate(event.end_date), fmtTime(event.end_time)].filter(Boolean).join(" at ");

  return (
    <TeamLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link to="/team/events">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                {event.event_type && <Badge variant="outline">{event.event_type}</Badge>}
              </div>
              {event.organizer_name && (
                <p className="text-gray-500 text-sm mt-0.5">Organised by {event.organizer_name}</p>
              )}
            </div>
          </div>
          {event.status !== "completed" && event.status !== "cancelled" && !isEnded && (
            <Link to={`/team/checkin/${event.slug}`}>
              <Button><QrCode className="mr-2 h-4 w-4" />Start Check-in</Button>
            </Link>
          )}
        </div>

        {/* Banner */}
        {event.banner_image_url && (
          <div className="rounded-xl overflow-hidden h-48 md:h-64">
            <img src={event.banner_image_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Registered</p>
              <p className="text-3xl font-bold mt-1">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Checked In</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{checkedInCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</p>
              <p className="text-3xl font-bold text-orange-500 mt-1">{total - checkedInCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Capacity</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {event.max_attendees ? event.max_attendees : "∞"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Check-in progress */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Check-in Progress</span>
              <span className="text-gray-500">{checkedInCount} / {total} ({pct}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {event.description && (
              <p className="text-gray-700 leading-relaxed">{event.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {startLabel && (
                <div className="flex items-start gap-2 text-gray-600">
                  <Calendar className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Start</p>
                    <p>{startLabel}</p>
                  </div>
                </div>
              )}
              {endLabel && (
                <div className="flex items-start gap-2 text-gray-600">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">End</p>
                    <p>{endLabel}</p>
                  </div>
                </div>
              )}
              {event.location && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Location</p>
                    <p>{event.location}</p>
                  </div>
                </div>
              )}
              {event.website_url && (
                <div className="flex items-start gap-2 text-gray-600">
                  <Globe className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Website</p>
                    <a href={event.website_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate block">{event.website_url}</a>
                  </div>
                </div>
              )}
              {event.contact_email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href={`mailto:${event.contact_email}`} className="hover:underline">{event.contact_email}</a>
                </div>
              )}
              {event.contact_phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{event.contact_phone}</span>
                </div>
              )}
            </div>

            {event.issues_certificate && (
              <div className="flex items-center gap-2 text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5">
                <Award className="h-4 w-4 text-yellow-600 shrink-0" />
                <span className="text-yellow-800 font-medium">Attendance certificates will be issued to checked-in attendees</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Categories */}
        {event.ticket_categories?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" /> Ticket Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {event.ticket_categories.map((tc) => (
                  <div key={tc.id} className="border rounded-lg p-4 space-y-1"
                    style={tc.color ? { borderLeftColor: tc.color, borderLeftWidth: 4 } : {}}>
                    <p className="font-semibold text-gray-900">{tc.name}</p>
                    {tc.description && <p className="text-xs text-gray-500">{tc.description}</p>}
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="font-medium text-blue-700">
                        {tc.price === 0 ? "Free" : `$${tc.price.toFixed(2)}`}
                      </span>
                      <span className="text-gray-500">
                        {tc.soldQuantity}/{tc.maxQuantity > 0 ? tc.maxQuantity : "∞"} sold
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sessions */}
        {event.sessions?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" /> Sessions ({event.sessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.sessions.map((s) => {
                  const sessionSpeakers = event.speakers?.filter((sp) =>
                    s.speakerIds?.includes(sp.id)
                  ) ?? [];
                  return (
                    <div key={s.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <p className="font-semibold text-gray-900">{s.title}</p>
                        {(s.startTime || s.endTime) && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                            <Clock className="h-3.5 w-3.5" />
                            {[fmtTime(s.startTime), fmtTime(s.endTime)].filter(Boolean).join(" – ")}
                          </span>
                        )}
                      </div>
                      {s.description && <p className="text-sm text-gray-600">{s.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        {s.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />{s.location}
                          </span>
                        )}
                        {sessionSpeakers.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Mic2 className="h-3.5 w-3.5" />
                            {sessionSpeakers.map((sp) => sp.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Speakers */}
        {event.speakers?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic2 className="h-5 w-5" /> Speakers ({event.speakers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {event.speakers.map((sp) => (
                  <div key={sp.id} className="flex items-start gap-3 border rounded-lg p-3">
                    {sp.imageUrl ? (
                      <img src={sp.imageUrl} alt={sp.name}
                        className="h-12 w-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Mic2 className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{sp.name}</p>
                      {sp.title && <p className="text-xs text-blue-600">{sp.title}</p>}
                      {sp.company && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{sp.company}
                        </p>
                      )}
                      {sp.bio && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sp.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exhibitors */}
        {event.exhibitors?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Exhibitors ({event.exhibitors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {event.exhibitors.map((ex) => (
                  <div key={ex.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      {ex.logoUrl ? (
                        <img src={ex.logoUrl} alt={ex.name}
                          className="h-12 w-12 rounded-md object-contain border bg-white shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-md border bg-gray-50 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900 truncate">{ex.name}</p>
                          {ex.boothNumber && (
                            <Badge variant="outline" className="text-xs shrink-0">Booth {ex.boothNumber}</Badge>
                          )}
                        </div>
                        {ex.description && <p className="text-xs text-gray-500 mt-0.5">{ex.description}</p>}
                        {ex.website && (
                          <a href={ex.website} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline">{ex.website}</a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sponsors */}
        {event.sponsors?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sponsors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {event.sponsors.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    {sp.logoUrl && (
                      <img src={sp.logoUrl} alt={sp.name} className="h-6 w-auto object-contain" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{sp.name}</p>
                      {sp.tier && <p className="text-xs text-gray-500 capitalize">{sp.tier}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendee List */}
        <Card>
          <CardHeader>
            <CardTitle>Attendee List ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No attendees registered yet.</p>
            ) : (
              <div className="space-y-2">
                {enrollments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {a.checked_in
                        ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                        : <XCircle className="h-5 w-5 text-gray-300 shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{a.user_name}</p>
                        <p className="text-xs text-gray-500 truncate">{a.user_email}</p>
                        {a.checked_in_at && (
                          <p className="text-xs text-gray-400">
                            Checked in: {new Date(a.checked_in_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.ticket_category && <Badge variant="outline">{a.ticket_category}</Badge>}
                      <Badge variant={a.checked_in ? "default" : "secondary"}>
                        {a.checked_in ? "Checked In" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </TeamLayout>
  );
};

export default TeamEventDetail;

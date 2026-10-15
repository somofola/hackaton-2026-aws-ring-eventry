import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import Preloader from "@/components/ui/preloader";
import api from "@/services/api";
import { isEventPast } from "@/utils/datetime";
import { Event, EventReview, Speaker, Sponsor, TicketCategory } from "@/types";
import { fetchEventReviews, submitEventReview } from "@/services/eventService";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, MapPin, Users, DollarSign, Clock, Tag,
  ArrowLeft, ArrowRight, Share2, Mic, Building2, Star, Loader2,
  Map, Store, ExternalLink, Globe, Mail, Phone, Linkedin, Twitter,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

const WEBSITE_URL = (import.meta.env.VITE_WEBSITE_URL || "https://eventry.app").replace(/\/$/, "");

// ── Helpers ────────────────────────────────────────────────────────────────────

const GRADIENTS = [
  "from-violet-500 to-purple-700",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-700",
  "from-indigo-500 to-blue-700",
  "from-fuchsia-500 to-violet-700",
  "from-cyan-500 to-sky-700",
];

function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

const TIER_COLORS: Record<string, string> = {
  platinum: "bg-slate-100 text-slate-700 border-slate-300",
  gold:     "bg-yellow-100 text-yellow-700 border-yellow-300",
  silver:   "bg-gray-100 text-gray-600 border-gray-300",
  bronze:   "bg-orange-100 text-orange-700 border-orange-300",
  partner:  "bg-blue-100 text-blue-700 border-blue-300",
};

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function fmtTime(datetime: string | null | undefined) {
  if (!datetime) return null;
  const d = new Date(datetime);
  if (isNaN(d.getTime())) return datetime; // fallback: return as-is
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtSessionDate(datetime: string | null | undefined) {
  if (!datetime) return null;
  const d = new Date(datetime);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ── Component ──────────────────────────────────────────────────────────────────

const EventDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<EventReview[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Popup state
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketCategory | null>(null);
  const [viewTicket, setViewTicket] = useState<TicketCategory | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/events/slug/${slug}`)
      .then(async (res) => {
        const ev: Event = res.data;
        setEvent(ev);
        const cats = ev.ticket_categories ?? [];
        const firstAvailable = cats.find((tc) => tc.maxQuantity === 0 || tc.soldQuantity < tc.maxQuantity) ?? cats[0] ?? null;
        setSelectedTicket(firstAvailable);
        const [reviewsData, enrollmentsData] = await Promise.all([
          fetchEventReviews(ev.uuid),
          api.get("/my-enrollments").then((r) => r.data).catch(() => []),
        ]);
        setReviews(reviewsData);
        const enrolled = enrollmentsData.some(
          (e: any) => e.event?.uuid === ev.uuid && (e.status === "enrolled" || e.status === "attended")
        );
        setIsEnrolled(enrolled);
      })
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const eventStarted = event
    ? new Date() >= new Date(`${event.start_date}T${event.start_time || "00:00"}`)
    : false;

  const isPast = event ? isEventPast(event) : false;

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const handleReviewSubmit = async () => {
    if (!myRating || !event) return;
    setSubmitting(true);
    try {
      const review = await submitEventReview(event.uuid, myRating, myComment);
      setReviews((prev) => [review, ...prev.filter((r) => r.user_id !== review.user_id)]);
      setSubmitted(true);
      toast({ title: "Review submitted", description: "Thank you for your feedback!" });
    } catch {
      toast({ title: "Could not submit review", description: "You must be enrolled to leave a review.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnroll = (ticket?: TicketCategory) => {
    const tc = ticket ?? selectedTicket;
    navigate(`/user/events/${slug}/checkout`, { state: { ticket: tc } });
  };
  const handleShare = async () => {
    const shareUrl = `${WEBSITE_URL}/events/${event!.slug || slug}`;
    const payload = {
      title: event!.title,
      text: event!.description,
      url: shareUrl,
      dialogTitle: "Share Event",
    };

    if (Capacitor.isNativePlatform()) {
      try {
        const canShare = await Share.canShare();
        if (canShare.value) {
          await Share.share(payload);
          return;
        }
      } catch (err: any) {
        if (err?.message?.toLowerCase().includes("cancel")) return;
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied", description: shareUrl });
      } catch {
        toast({ title: "Share unavailable", description: shareUrl, variant: "destructive" });
      }
      return;
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(payload);
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied", description: shareUrl });
    } catch {
      toast({ title: "Share unavailable", description: shareUrl, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">
          <Preloader message="Loading event..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">Event not found</div>
      </DashboardLayout>
    );
  }

  const speakers         = event.speakers         ?? [];
  const sessions         = event.sessions         ?? [];
  const sponsors         = event.sponsors         ?? [];
  const exhibitors       = event.exhibitors       ?? [];
  const floorPlans       = event.floor_plans      ?? [];
  const ticketCategories = event.ticket_categories ?? [];
  const tags             = Array.isArray(event.tags) ? event.tags : [];

  const lowestPrice = ticketCategories.length > 0
    ? Math.min(...ticketCategories.map((tc) => tc.price))
    : 0;

  const lat = event.latitude  ? Number(event.latitude)  : null;
  const lng = event.longitude ? Number(event.longitude) : null;

  const mapsUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location ?? "")}`;

  const osmEmbed = lat && lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
    : null;

  // For sessions: find speakers by speakerIds
  const speakerById = Object.fromEntries(speakers.map((s) => [String(s.id), s]));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/user/events")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" /> Share Event
          </Button>
        </div>

        {/* Main Event Info */}
        <Card className="card-enhanced">
          <div className="p-8">
            {event.image_url && (
              <div className="mb-6 overflow-hidden rounded-lg">
                <img src={event.image_url} alt={event.title} className="w-full h-64 object-cover" />
              </div>
            )}
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
              <p className="text-gray-600 text-lg leading-relaxed">{event.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center text-gray-700">
                  <Calendar className="mr-3 h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Date</div>
                    <div className="text-sm">
                      {new Date(event.start_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      {event.end_date && event.end_date !== event.start_date && (
                        <> – {new Date(event.end_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-gray-700">
                  <Clock className="mr-3 h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Time</div>
                    <div className="text-sm">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-700">
                  <MapPin className="mr-3 h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div className="text-sm">{event.location}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center text-gray-700">
                  <Users className="mr-3 h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Attendees</div>
                    <div className="text-sm">{event.current_attendees}/{event.max_attendees} registered</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-700">
                  <DollarSign className="mr-3 h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Price</div>
                    <div className="text-sm">
                      {lowestPrice === 0
                        ? "Free"
                        : <>Starting from <span className="text-primary">${lowestPrice}</span></>}
                    </div>
                  </div>
                </div>
                {event.organizer_name && (
                  <div className="text-gray-700">
                    <div className="font-medium mb-1">Organized by</div>
                    <div className="text-sm">{event.organizer_name}</div>
                  </div>
                )}
              </div>
            </div>
            {tags.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <Tag className="mr-2 h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            {/* Ticket Categories — hidden when already enrolled */}
            {isEnrolled ? (
              <div className="flex flex-col items-center gap-3 py-6 border-t border-gray-100">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-green-700 text-lg">You're registered for this event</p>
                <p className="text-sm text-gray-500 text-center">
                  You have already enrolled. Check your email for confirmation details.
                </p>
              </div>
            ) : (
              <>
                {ticketCategories.length > 0 && (
                  <div className="mb-6">
                    <p className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-500" /> Select Ticket
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ticketCategories.map((tc) => {
                        const remaining = tc.maxQuantity > 0 ? tc.maxQuantity - tc.soldQuantity : null;
                        const soldOut = tc.maxQuantity > 0 && tc.soldQuantity >= tc.maxQuantity;
                        const isSelected = selectedTicket?.id === tc.id;
                        return (
                          <div
                            key={tc.id}
                            onClick={() => !soldOut && setSelectedTicket(tc)}
                            style={{ borderColor: isSelected ? tc.color : "#e5e7eb" }}
                            className={`relative border-2 rounded-xl overflow-hidden transition-all ${
                              soldOut ? "opacity-50 cursor-not-allowed bg-gray-50" : "cursor-pointer hover:shadow-sm bg-white"
                            }`}
                          >
                            <div className="h-1" style={{ backgroundColor: tc.color }} />
                            <div className="p-3 flex items-start gap-2">
                              <div
                                className="mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                                style={{ borderColor: isSelected ? tc.color : "#d1d5db" }}
                              >
                                {isSelected && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tc.color }} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{tc.name}</p>
                                {tc.description && (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tc.description}</p>
                                )}
                                {remaining !== null && (
                                  <p className={`text-xs mt-1 font-medium ${remaining <= 10 ? "text-orange-500" : "text-gray-400"}`}>
                                    {soldOut ? "Sold out" : `${remaining} spot${remaining !== 1 ? "s" : ""} left`}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <p className="font-bold text-sm" style={{ color: tc.color }}>
                                  {tc.price === 0 ? "Free" : `$${tc.price}`}
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setViewTicket(tc); }}
                                  className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-0.5 rounded transition-colors"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {isPast && (
                  <div className="px-4 pb-2 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200 py-3">
                    This event has ended — registration is closed.
                  </div>
                )}
                <div className="flex justify-center pt-6 border-t border-gray-100">
                  <Button
                    onClick={() => handleEnroll()}
                    disabled={isPast || event.current_attendees >= event.max_attendees}
                    className="btn-primary px-8 py-3 text-lg"
                    size="lg"
                  >
                    {isPast
                      ? "Registration Closed"
                      : event.current_attendees >= event.max_attendees
                        ? "Event Full"
                        : selectedTicket
                          ? selectedTicket.price === 0 ? "Register Free" : `Enroll for $${selectedTicket.price}`
                          : "Register Now"}
                    {!isPast && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Mini Map */}
        {event.location && event.event_type !== "virtual" && (
          <Card className="card-enhanced overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" /> Venue Location
              </h2>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open in Maps
                </Button>
              </a>
            </div>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
              {osmEmbed ? (
                <iframe title="Event location" src={osmEmbed} className="w-full h-52 border-0 pointer-events-none" loading="lazy" />
              ) : (
                <div className="h-52 bg-gray-100 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{event.location}</p>
                    <p className="text-xs mt-1 text-primary">Click to view on map</p>
                  </div>
                </div>
              )}
            </a>
            <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> {event.location}
            </div>
          </Card>
        )}

        {/* Event Agenda */}
        {sessions.length > 0 && (
          <Card className="card-enhanced">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" /> Event Agenda
              </h2>
              <div className="space-y-3">
                {sessions.map((session) => {
                  const sessionSpeakers = (session.speakerIds ?? [])
                    .map((id) => speakerById[String(id)])
                    .filter(Boolean);
                  return (
                    <div key={session.id} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50">
                      {/* Time badge */}
                      <div className="shrink-0 text-center min-w-[90px]">
                        <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                          {fmtTime(session.startTime) ?? "TBD"}
                          {session.endTime ? ` – ${fmtTime(session.endTime)}` : ""}
                        </div>
                        {(fmtSessionDate(session.startTime) ?? fmtDate(event.start_date)) && (
                          <div className="text-xs text-gray-400 mt-1">
                            {fmtSessionDate(session.startTime) ?? fmtDate(event.start_date)}
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{session.title}</h3>
                        {session.description && (
                          <p className="text-xs text-gray-600 mt-0.5">{session.description}</p>
                        )}
                        {session.location && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {session.location}
                          </p>
                        )}
                        {sessionSpeakers.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Mic className="h-3 w-3 text-gray-400 shrink-0" />
                            {sessionSpeakers.map((sp) => (
                              <button
                                key={sp.id}
                                onClick={() => setSelectedSpeaker(sp)}
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                              >
                                {sp.imageUrl ? (
                                  <img src={sp.imageUrl} alt={sp.name} className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                  <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${gradientFor(sp.name ?? "")} flex items-center justify-center text-white text-[9px] font-bold`}>
                                    {initials(sp.name)}
                                  </div>
                                )}
                                {sp.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Featured Speakers */}
        {speakers.length > 0 && (
          <Card className="card-enhanced">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Mic className="h-6 w-6 text-primary" /> Featured Speakers
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {speakers.map((speaker) => (
                  <button
                    key={speaker.id}
                    onClick={() => setSelectedSpeaker(speaker)}
                    className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 hover:shadow-sm transition-all"
                  >
                    {speaker.imageUrl ? (
                      <img src={speaker.imageUrl} alt={speaker.name} className="w-20 h-20 rounded-full object-cover mb-3 ring-2 ring-white shadow" />
                    ) : (
                      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradientFor(speaker.name ?? "")} flex items-center justify-center mb-3 text-2xl font-bold text-white shadow`}>
                        {initials(speaker.name)}
                      </div>
                    )}
                    <p className="font-semibold text-sm leading-tight">{speaker.name}</p>
                    {speaker.title && <p className="text-xs text-primary mt-0.5">{speaker.title}</p>}
                    {speaker.company && <p className="text-xs text-gray-500">{speaker.company}</p>}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Exhibitors */}
        {exhibitors.length > 0 && (
          <Card className="card-enhanced">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Store className="h-6 w-6 text-primary" /> Exhibitors
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {exhibitors.map((ex) => (
                  <div key={ex.id} className="p-4 rounded-lg bg-gray-50 flex gap-3">
                    {ex.logoUrl ? (
                      <img src={ex.logoUrl} alt={ex.name} className="w-14 h-14 rounded-lg object-contain shrink-0 bg-white border p-1" />
                    ) : (
                      <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${gradientFor(ex.name ?? "")} flex items-center justify-center shrink-0 text-xl font-bold text-white`}>
                        {initials(ex.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm">{ex.name}</p>
                      {ex.boothNumber && (
                        <p className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> Booth {ex.boothNumber}
                        </p>
                      )}
                      {ex.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ex.description}</p>
                      )}
                      {ex.website && (
                        <a href={ex.website} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {ex.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                      {ex.contact?.phone && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {ex.contact.phone}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Floor Plans */}
        {floorPlans.length > 0 && (
          <Card className="card-enhanced">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Map className="h-6 w-6 text-primary" /> Floor Plans
              </h2>
              <div className="space-y-6">
                {floorPlans.map((fp) => (
                  <div key={fp.id}>
                    <p className="font-medium text-sm text-gray-700 mb-2">{fp.name}</p>
                    {fp.imageUrl ? (
                      <a href={fp.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={fp.imageUrl} alt={fp.name} className="w-full rounded-lg border object-contain max-h-96 bg-gray-50 hover:opacity-90 transition-opacity" />
                      </a>
                    ) : (
                      <div className="w-full h-40 rounded-lg border bg-gray-50 flex items-center justify-center text-gray-400 text-sm">No image available</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Sponsors */}
        {sponsors.length > 0 && (
          <Card className="card-enhanced">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" /> Our Sponsors
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sponsors.map((sponsor) => (
                  <button
                    key={sponsor.id}
                    onClick={() => setSelectedSponsor(sponsor)}
                    className="text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 hover:shadow-sm transition-all flex flex-col items-center"
                  >
                    {sponsor.logoUrl ? (
                      <img src={sponsor.logoUrl} alt={sponsor.name} className="h-14 w-auto object-contain mb-3 rounded" />
                    ) : (
                      <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${gradientFor(sponsor.name ?? "")} flex items-center justify-center mb-3 text-xl font-bold text-white`}>
                        {initials(sponsor.name)}
                      </div>
                    )}
                    <p className="font-medium text-sm">{sponsor.name}</p>
                    {sponsor.tier && (
                      <Badge className={"mt-2 text-xs border " + (TIER_COLORS[sponsor.tier] ?? "bg-gray-100 text-gray-500")}>
                        {sponsor.tier.charAt(0).toUpperCase() + sponsor.tier.slice(1)}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Reviews */}
        {eventStarted && (
          <Card className="card-enhanced">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Star className="h-6 w-6 text-primary" /> Reviews
                </h2>
                {reviews.length > 0 && (
                  <div className="text-right">
                    <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
                    <div className="flex gap-0.5 justify-end">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={"h-4 w-4 " + (s <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                  </div>
                )}
              </div>
              {isEnrolled && !submitted ? (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium mb-3 text-sm">Leave a review</p>
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map((s) => (
                      <button key={s} type="button" onClick={() => setMyRating(s)} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}>
                        <Star className={"h-7 w-7 transition-colors " + (s <= (hoverRating || myRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                      </button>
                    ))}
                  </div>
                  <Textarea placeholder="Share your experience (optional)…" value={myComment} onChange={(e) => setMyComment(e.target.value)} rows={3} className="mb-3" />
                  <Button onClick={handleReviewSubmit} disabled={!myRating || submitting} size="sm">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Review
                  </Button>
                </div>
              ) : isEnrolled && submitted ? (
                <div className="mb-6 p-4 bg-green-50 rounded-lg text-green-700 text-sm font-medium">
                  Your review has been submitted. Thank you!
                </div>
              ) : null}
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {review.avatar ? (
                            <img src={review.avatar} alt={review.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradientFor(review.name)} flex items-center justify-center text-xs font-bold text-white`}>
                              {initials(review.name)}
                            </div>
                          )}
                          <span className="font-medium text-sm">{review.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={"h-4 w-4 " + (s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-gray-700 text-sm">{review.comment}</p>}
                      <p className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Ticket Detail Popup */}
      <Dialog open={!!viewTicket} onOpenChange={(o) => !o && setViewTicket(null)}>
        <DialogContent className="sm:max-w-sm">
          {viewTicket && (() => {
            const remaining = viewTicket.maxQuantity > 0 ? viewTicket.maxQuantity - viewTicket.soldQuantity : null;
            const soldOut = viewTicket.maxQuantity > 0 && viewTicket.soldQuantity >= viewTicket.maxQuantity;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{viewTicket.name}</DialogTitle>
                </DialogHeader>
                <div className="h-1 rounded-full -mt-1" style={{ backgroundColor: viewTicket.color }} />
                <div className="space-y-3 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">Price</span>
                    <span className="font-bold text-xl" style={{ color: viewTicket.color }}>
                      {viewTicket.price === 0 ? "Free" : `$${viewTicket.price}`}
                    </span>
                  </div>
                  {viewTicket.maxQuantity > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Availability</span>
                      <span className={`text-sm font-medium ${soldOut ? "text-red-500" : remaining! <= 10 ? "text-orange-500" : "text-gray-700"}`}>
                        {soldOut ? "Sold out" : `${remaining} / ${viewTicket.maxQuantity} remaining`}
                      </span>
                    </div>
                  )}
                  {viewTicket.description && (
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Description</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{viewTicket.description}</p>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full mt-1"
                  disabled={soldOut || isPast}
                  onClick={() => { setViewTicket(null); handleEnroll(viewTicket); }}
                >
                  {isPast
                    ? "Registration Closed"
                    : soldOut
                      ? "Sold Out"
                      : viewTicket.price === 0 ? "Register Free" : `Enroll for $${viewTicket.price}`}
                  {!soldOut && !isPast && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Speaker Popup */}
      <Dialog open={!!selectedSpeaker} onOpenChange={(o) => !o && setSelectedSpeaker(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedSpeaker && (
            <>
              <DialogHeader>
                <DialogTitle>Speaker Profile</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center text-center pt-2">
                {selectedSpeaker.imageUrl ? (
                  <img src={selectedSpeaker.imageUrl} alt={selectedSpeaker.name} className="w-24 h-24 rounded-full object-cover mb-4 shadow" />
                ) : (
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradientFor(selectedSpeaker.name ?? "")} flex items-center justify-center mb-4 text-3xl font-bold text-white shadow`}>
                    {initials(selectedSpeaker.name)}
                  </div>
                )}
                <h3 className="text-xl font-bold">{selectedSpeaker.name}</h3>
                {selectedSpeaker.title && <p className="text-primary font-medium mt-0.5">{selectedSpeaker.title}</p>}
                {selectedSpeaker.company && <p className="text-gray-500 text-sm">{selectedSpeaker.company}</p>}
              </div>
              {selectedSpeaker.bio && (
                <p className="text-gray-700 text-sm leading-relaxed mt-2">{selectedSpeaker.bio}</p>
              )}
              {(selectedSpeaker.social?.linkedin || selectedSpeaker.social?.twitter) && (
                <div className="flex gap-3 justify-center mt-4">
                  {selectedSpeaker.social.linkedin && (
                    <a href={selectedSpeaker.social.linkedin} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </a>
                  )}
                  {selectedSpeaker.social.twitter && (
                    <a href={selectedSpeaker.social.twitter} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-sky-500 hover:underline">
                      <Twitter className="h-4 w-4" /> Twitter
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Sponsor Popup */}
      <Dialog open={!!selectedSponsor} onOpenChange={(o) => !o && setSelectedSponsor(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedSponsor && (
            <>
              <DialogHeader>
                <DialogTitle>Sponsor Details</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center text-center pt-2">
                {selectedSponsor.logoUrl ? (
                  <img src={selectedSponsor.logoUrl} alt={selectedSponsor.name} className="h-20 w-auto object-contain mb-4 rounded" />
                ) : (
                  <div className={`w-20 h-20 rounded-lg bg-gradient-to-br ${gradientFor(selectedSponsor.name ?? "")} flex items-center justify-center mb-4 text-2xl font-bold text-white`}>
                    {initials(selectedSponsor.name)}
                  </div>
                )}
                <h3 className="text-xl font-bold">{selectedSponsor.name}</h3>
                {selectedSponsor.tier && (
                  <Badge className={"mt-2 border " + (TIER_COLORS[selectedSponsor.tier] ?? "bg-gray-100 text-gray-500")}>
                    {selectedSponsor.tier.charAt(0).toUpperCase() + selectedSponsor.tier.slice(1)} Sponsor
                  </Badge>
                )}
              </div>
              {selectedSponsor.description && (
                <p className="text-gray-700 text-sm leading-relaxed mt-3">{selectedSponsor.description}</p>
              )}
              <div className="space-y-2 mt-3">
                {selectedSponsor.website && (
                  <a href={selectedSponsor.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Globe className="h-4 w-4 shrink-0" />
                    {selectedSponsor.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                )}
                {selectedSponsor.contactName && (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 shrink-0 text-gray-400" /> {selectedSponsor.contactName}
                  </p>
                )}
                {selectedSponsor.contactEmail && (
                  <a href={"mailto:" + selectedSponsor.contactEmail}
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Mail className="h-4 w-4 shrink-0" /> {selectedSponsor.contactEmail}
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EventDetail;

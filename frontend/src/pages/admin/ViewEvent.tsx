import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEvent } from "@/hooks/useApi";
import {
  ArrowLeft, Edit, Settings, Calendar, MapPin, Users, DollarSign,
  Mic, Clock, Building, Tag, Loader2, Globe, Mail, Phone, FileText,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-700 border-green-200",
  draft:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

const ViewEvent = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(uuid || "");

  if (isLoading) {
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

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/admin/events")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                <Badge className={`${STATUS_COLORS[event.status] ?? ""} border`}>
                  {event.status}
                </Badge>
              </div>
              <p className="text-gray-500 mt-1">Event overview</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/events/${uuid}/manage`)}>
              <Settings className="mr-2 h-4 w-4" /> Manage
            </Button>
            <Button onClick={() => navigate(`/admin/events/${uuid}/edit`)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Event
            </Button>
          </div>
        </div>

        {/* Event banner */}
        {event.image_url && (
          <div className="rounded-xl overflow-hidden h-56 w-full">
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — main details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic info */}
            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-gray-700">
                  <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>
                    {fmtDate(event.start_date)}
                    {event.end_date ? ` – ${fmtDate(event.end_date)}` : ""}
                    {event.start_time ? ` · ${event.start_time}` : ""}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700">
                  <Users className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>{event.current_attendees} / {event.max_attendees || "∞"} attendees</span>
                </div>
                {event.price > 0 && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <DollarSign className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                    <span>Base price: {event.currency || "USD"} {Number(event.price).toFixed(2)}</span>
                  </div>
                )}
                {event.contact_email && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <Mail className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                    <span>{event.contact_email}</span>
                  </div>
                )}
                {event.contact_phone && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <Phone className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                    <span>{event.contact_phone}</span>
                  </div>
                )}
                {event.website_url && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <Globe className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                    <a href={event.website_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{event.website_url}</a>
                  </div>
                )}
                {(event.tags || []).length > 0 && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <Tag className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {(event.tags || []).map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            {event.description && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /> Description</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{event.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Speakers */}
            {(event.speakers || []).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mic className="h-4 w-4 text-gray-400" /> Speakers</CardTitle></CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {(event.speakers || []).map((s: any, i: number) => (
                      <div key={i} className="py-3 flex items-center gap-3">
                        {s.photo_url
                          ? <img src={s.photo_url} alt={s.name} className="h-9 w-9 rounded-full object-cover" />
                          : <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center"><Mic className="h-4 w-4 text-gray-400" /></div>
                        }
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                          {s.title && <p className="text-xs text-gray-500">{s.title}{s.company ? ` · ${s.company}` : ""}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sessions */}
            {(event.sessions || []).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" /> Sessions</CardTitle></CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {(event.sessions || []).map((s: any, i: number) => (
                      <div key={i} className="py-3">
                        <p className="text-sm font-medium text-gray-900">{s.title}</p>
                        {(s.start_time || s.end_time) && (
                          <p className="text-xs text-gray-500 mt-0.5">{s.start_time}{s.end_time ? ` – ${s.end_time}` : ""}</p>
                        )}
                        {s.location && <p className="text-xs text-gray-500">{s.location}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exhibitors */}
            {(event.exhibitors || []).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building className="h-4 w-4 text-gray-400" /> Exhibitors</CardTitle></CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {(event.exhibitors || []).map((e: any, i: number) => (
                      <div key={i} className="py-3 flex items-center gap-3">
                        {e.logo_url
                          ? <img src={e.logo_url} alt={e.company_name} className="h-9 w-9 rounded object-cover" />
                          : <div className="h-9 w-9 rounded bg-gray-100 flex items-center justify-center"><Building className="h-4 w-4 text-gray-400" /></div>
                        }
                        <div>
                          <p className="text-sm font-medium text-gray-900">{e.company_name}</p>
                          {e.booth_number && <p className="text-xs text-gray-500">Booth {e.booth_number}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right — ticket categories + venue */}
          <div className="space-y-6">

            {/* Ticket categories */}
            {(event.ticket_categories || []).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4 text-gray-400" /> Tickets</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(event.ticket_categories || []).map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.name}</p>
                        {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{t.sold_quantity ?? 0} / {t.max_quantity ?? "∞"} sold</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {t.price > 0 ? `$${Number(t.price).toFixed(2)}` : "Free"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Venue details */}
            {event.venue_details && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> Venue</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{event.venue_details}</p>
                </CardContent>
              </Card>
            )}

            {/* Stats summary */}
            <Card>
              <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Speakers</span><span className="font-medium">{(event.speakers || []).length}</span></div>
                <div className="flex justify-between text-gray-600"><span>Sessions</span><span className="font-medium">{(event.sessions || []).length}</span></div>
                <div className="flex justify-between text-gray-600"><span>Exhibitors</span><span className="font-medium">{(event.exhibitors || []).length}</span></div>
                <div className="flex justify-between text-gray-600"><span>Ticket types</span><span className="font-medium">{(event.ticket_categories || []).length}</span></div>
                <div className="flex justify-between text-gray-600"><span>Registrations</span><span className="font-medium">{event.current_attendees}</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ViewEvent;

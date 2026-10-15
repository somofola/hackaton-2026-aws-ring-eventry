import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Preloader from "@/components/ui/preloader";
import api from "@/services/api";
import { BRAND_NAME } from "@/lib/brand";
import type { Event } from "@/types";
import {
  Calendar, MapPin, Users, Clock, Tag, ArrowLeft, ArrowRight, LogIn, Globe,
} from "lucide-react";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

const PublicEventDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    api.get(`/events/slug/${slug}`)
      .then((res) => setEvent(res.data))
      .catch(() => setEvent(null));
  }, [slug]);

  const authRedirect = `/events/${slug}`;

  const header = (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt={BRAND_NAME} className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold text-gradient">{BRAND_NAME}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to={`/login?redirect=${encodeURIComponent(authRedirect)}`}>
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link to={`/register?redirect=${encodeURIComponent(authRedirect)}`}>
            <Button size="sm" className="btn-primary">Register</Button>
          </Link>
        </div>
      </div>
    </header>
  );

  if (event === undefined) {
    return (
      <div className="min-h-screen bg-white">
        {header}
        <div className="flex justify-center items-center py-24">
          <Preloader message="Loading event..." />
        </div>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-white">
        {header}
        <div className="text-center py-24">
          <p className="text-gray-500 text-lg mb-4">Event not found.</p>
          <Link to="/" className="text-primary font-medium">Back to home</Link>
        </div>
      </div>
    );
  }

  const ticketCategories = event.ticket_categories ?? [];
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const lowestPrice = ticketCategories.length > 0
    ? Math.min(...ticketCategories.map((tc) => tc.price))
    : 0;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {header}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <Link to="/#events" className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-6">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to events
        </Link>

        <div className="rounded-2xl border border-gray-100 shadow-lg overflow-hidden mb-8">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="w-full h-64 object-cover" />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-primary to-blue-700" />
          )}
          <div className="p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold">{event.title}</h1>
              {event.status === "live" && (
                <Badge className="bg-green-500 hover:bg-green-500 text-white border-0 shrink-0">Live</Badge>
              )}
            </div>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">{event.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-gray-700">
                <Calendar className="mr-3 h-5 w-5 text-primary shrink-0" />
                <div>
                  <div className="font-medium">Date</div>
                  <div className="text-sm">{fmtDate(event.start_date)}</div>
                </div>
              </div>
              <div className="flex items-center text-gray-700">
                <Clock className="mr-3 h-5 w-5 text-primary shrink-0" />
                <div>
                  <div className="font-medium">Time</div>
                  <div className="text-sm">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</div>
                </div>
              </div>
              {event.location && (
                <div className="flex items-center text-gray-700">
                  {event.event_type === "virtual" ? (
                    <Globe className="mr-3 h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <MapPin className="mr-3 h-5 w-5 text-primary shrink-0" />
                  )}
                  <div>
                    <div className="font-medium">Location</div>
                    <div className="text-sm">{event.location}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center text-gray-700">
                <Users className="mr-3 h-5 w-5 text-primary shrink-0" />
                <div>
                  <div className="font-medium">Attendees</div>
                  <div className="text-sm">{event.current_attendees}/{event.max_attendees} registered</div>
                </div>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                    <Tag className="mr-1 h-3 w-3" />{tag}
                  </Badge>
                ))}
              </div>
            )}

            {ticketCategories.length > 0 && (
              <div className="mb-6">
                <p className="font-medium text-gray-700 mb-3">Tickets</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ticketCategories.map((tc) => {
                    const remaining = tc.maxQuantity > 0 ? tc.maxQuantity - tc.soldQuantity : null;
                    const soldOut = tc.maxQuantity > 0 && tc.soldQuantity >= tc.maxQuantity;
                    return (
                      <div key={tc.id} className={`border-2 rounded-xl overflow-hidden ${soldOut ? "opacity-50" : ""}`} style={{ borderColor: tc.color }}>
                        <div className="h-1" style={{ backgroundColor: tc.color }} />
                        <div className="p-3">
                          <p className="font-semibold text-sm">{tc.name}</p>
                          {tc.description && <p className="text-xs text-gray-500 mt-0.5">{tc.description}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <p className="font-bold text-sm" style={{ color: tc.color }}>
                              {tc.price === 0 ? "Free" : `$${tc.price}`}
                            </p>
                            {remaining !== null && (
                              <p className={`text-xs font-medium ${remaining <= 10 ? "text-orange-500" : "text-gray-400"}`}>
                                {soldOut ? "Sold out" : `${remaining} left`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Register / Login to buy */}
            <div className="border-t border-gray-100 pt-6 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-gray-500">
                {lowestPrice === 0 ? "Free to attend" : `Starting from $${lowestPrice}`} — create an account or log in to get your ticket.
              </p>
              <div className="flex gap-3">
                <Link to={`/register?redirect=${encodeURIComponent(authRedirect)}`}>
                  <Button size="lg" className="btn-primary px-8">
                    Register to Buy <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to={`/login?redirect=${encodeURIComponent(authRedirect)}`}>
                  <Button size="lg" variant="outline" className="px-8">
                    <LogIn className="mr-2 h-5 w-5" /> Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicEventDetail;

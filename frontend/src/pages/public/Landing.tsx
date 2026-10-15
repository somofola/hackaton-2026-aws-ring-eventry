import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ScanFace, Radio, Ticket, ShieldCheck, Calendar, MapPin, Users,
  ArrowRight, Sparkles, Github, Mail, Boxes, Cpu, Cloud, Code2, Linkedin, Server, Database, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EventIconsBg from "@/components/landing/EventIconsBg";
import api from "@/services/api";
import { BRAND_NAME } from "@/lib/brand";
import type { Event } from "@/types";

const EVENT_GRADIENTS = [
  { from: "#3b82f6", to: "#7c3aed" },
  { from: "#10b981", to: "#0891b2" },
  { from: "#f59e0b", to: "#ef4444" },
  { from: "#ec4899", to: "#8b5cf6" },
];

function eventGradient(id: number | string) {
  const n = typeof id === "number" ? id : Array.from(String(id)).reduce((s, c) => s + c.charCodeAt(0), 0);
  return EVENT_GRADIENTS[n % EVENT_GRADIENTS.length];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const FEATURES = [
  {
    Icon: Radio,
    title: "Ring Device Check-In",
    desc: "Attendees are recognized and checked in automatically as they approach the entrance — no app, no ticket to pull up.",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    Icon: ScanFace,
    title: "Facial Recognition",
    desc: "Opt-in face matching against AWS Rekognition confirms identity in under a second, even without a Ring device on site.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    Icon: Ticket,
    title: "Ticketed Registration",
    desc: "Sell or issue tickets, collect payment via Stripe or Paystack, and generate a QR badge automatically on confirmation.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    Icon: ShieldCheck,
    title: "Privacy-First by Design",
    desc: "Face data is opt-in only. Photos are never stored — only a match vector, scoped to a single event, deleted after.",
    gradient: "from-amber-500 to-orange-600",
  },
];

const STACK = [
  { Icon: Code2, label: "React + Vite + TypeScript" },
  { Icon: Boxes, label: "Laravel + Sanctum + PostgreSQL" },
  { Icon: Cpu, label: "AWS Rekognition" },
  { Icon: Cloud, label: "Ring Device API" },
  { Icon: Server, label: "AWS Lightsail (nginx + PHP-FPM)" },
  { Icon: Database, label: "AWS S3 (storage)" },
  { Icon: Brain, label: "AWS Bedrock (AI captions)" },
];

const Landing: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [liveRes, completedRes] = await Promise.allSettled([
          api.get("/events/status/live"),
          api.get("/events/status/completed"),
        ]);
        const toList = (res: PromiseSettledResult<any>) =>
          res.status === "fulfilled"
            ? (Array.isArray(res.value.data) ? res.value.data : (res.value.data?.data ?? []))
            : [];
        const merged = [...toList(liveRes), ...toList(completedRes)]
          .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
          .slice(0, 3);
        if (!cancelled) setEvents(merged);
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header
        className={`sticky top-0 z-30 transition-colors duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-gray-100"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt={BRAND_NAME} className="w-full h-full object-cover" />
            </div>
            <span className={`text-xl font-bold transition-colors ${scrolled ? "text-gradient" : "text-white drop-shadow"}`}>
              {BRAND_NAME}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button
                variant={scrolled ? "ghost" : "outline"}
                size="sm"
                className={scrolled ? "" : "text-white border-2 border-white/50 bg-white/5 backdrop-blur-sm hover:bg-white/15 hover:text-white hover:border-white/70"}
              >
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button
                size="sm"
                className={
                  scrolled
                    ? "btn-primary"
                    : "bg-gradient-to-r from-yellow-300 to-orange-300 text-gray-900 font-semibold hover:from-yellow-200 hover:to-orange-200 shadow-lg shadow-black/20"
                }
              >
                Register
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden -mt-16 text-white">
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/testimonials-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-blue-700/65 to-blue-900/75" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl animate-blob pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-blob animation-delay-2000 pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-16 py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full mb-5">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              Hackathon build · AWS Ring + Rekognition
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
              Event check-in that{" "}
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                recognizes your guests
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed max-w-2xl">
              {BRAND_NAME} pairs a Ring smart-device camera with AWS facial recognition to check attendees
              into an event automatically — no scanning, no queueing, no app required at the door.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-yellow-300 to-orange-300 text-gray-900 font-semibold hover:from-yellow-200 hover:to-orange-200 shadow-xl shadow-black/30 group w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#events">
                <Button size="lg" variant="outline" className="border-2 border-white/40 backdrop-blur-sm bg-white/5 text-white hover:bg-white/10 hover:border-white/60 w-full sm:w-auto">
                  View Events
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="relative py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
                About this build
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-5 tracking-tight">
                A hackathon entry for <span className="text-gradient">smarter event entry</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                {BRAND_NAME} is a holistic, modern event platform. For this hackathon we focused on one problem:
                getting attendees through the door without friction, using hardware most venues
                already own — a Ring camera — paired with opt-in facial recognition.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Queue-based check-in (QR scanning, manual guest lists) breaks down at scale and adds a staffed
                bottleneck at the one moment that sets the tone for the whole event. We wanted entry to require
                zero action from the attendee — not "pull up your ticket," just walk in.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                An attendee registers and pays for a ticket, optionally opts in with a quick selfie, and
                from then on the Ring device at the entrance (or a staff member's face-check-in tablet)
                recognizes them automatically and checks them in — chime included.
              </p>

              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">The flow, end to end</h3>
                {[
                  { n: "1", t: "Register & pay", d: "Attendee buys a ticket via Stripe or Paystack; a QR badge is issued as a fallback." },
                  { n: "2", t: "Opt in with a selfie", d: "One photo is captured, converted to a face vector via AWS Rekognition — scoped to this event only." },
                  { n: "3", t: "Ring detects arrival", d: "A motion/doorbell event fires a signed webhook with a captured frame to the backend." },
                  { n: "4", t: "Match & check in", d: "Rekognition compares the frame to opted-in attendees; a confident match auto-checks them in and chimes the Ring device." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-3">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {s.n}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      <span className="font-semibold text-gray-800">{s.t}.</span> {s.d}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-gray-600 leading-relaxed">
                Everything ships in the same build: event authoring, ticket sales, live check-in dashboards, and
                Ring device management — not just the recognition demo, the whole operational loop around it.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Stack &amp; tools</h3>
                <div className="grid grid-cols-2 gap-3">
                  {STACK.map((s) => (
                    <div key={s.label} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <s.Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Where AWS does the work</h3>
                <ul className="space-y-2.5">
                  <li className="flex gap-2.5 text-sm text-gray-600">
                    <ScanFace className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><span className="font-semibold text-gray-800">Rekognition</span> — face enrollment + match-on-arrival, the core check-in decision.</span>
                  </li>
                  <li className="flex gap-2.5 text-sm text-gray-600">
                    <Brain className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><span className="font-semibold text-gray-800">Bedrock (Claude 3 Haiku)</span> — captions Ring-captured thumbnails for the staff activity feed.</span>
                  </li>
                  <li className="flex gap-2.5 text-sm text-gray-600">
                    <Database className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><span className="font-semibold text-gray-800">S3</span> — stores event media and captured check-in frames.</span>
                  </li>
                  <li className="flex gap-2.5 text-sm text-gray-600">
                    <Server className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><span className="font-semibold text-gray-800">Lightsail</span> — hosts the Laravel API (nginx + PHP-FPM), frontend ships via Amplify.</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Team</h3>
                <p className="text-sm text-gray-600">
                  Built by the {BRAND_NAME} team for this hackathon — design, backend, mobile, and AWS
                  integration handled end-to-end by the same small crew that runs the main product.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-16 md:py-24 bg-gray-50 overflow-hidden">
        <EventIconsBg />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
              How it works
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-5 tracking-tight">
              No badge scanning. <span className="text-gradient">Just walk in.</span>
            </h2>
            <p className="text-lg text-gray-600">
              Built for events where the front door should feel effortless — and secure.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative bg-white border border-gray-100 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-none md:hover:-translate-y-1 hover:border-primary/20 transition-all duration-300"
              >
                <div className={`inline-flex h-9 w-9 md:h-12 md:w-12 items-center justify-center rounded-lg md:rounded-xl bg-gradient-to-br ${f.gradient} text-white shadow-md md:shadow-lg mb-3 md:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <f.Icon className="h-4 w-4 md:h-6 md:w-6" />
                </div>
                <h3 className="text-sm md:text-lg font-bold mb-1 md:mb-2 leading-snug group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="hidden md:block text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                <p className="md:hidden text-xs text-gray-500 line-clamp-2 leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Events */}
      <section id="events" className="relative py-16 md:py-24 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
              Live demo data
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-5 tracking-tight">Latest Events</h2>
            <p className="text-lg text-gray-600">Events currently registered on this instance.</p>
          </div>

          {loadingEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No events yet. <Link to="/register" className="text-primary font-medium">Create one</Link> to see it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events.map((event) => {
                const g = eventGradient(event.id);
                return (
                  <div key={event.uuid} className="group bg-white rounded-2xl border border-gray-100 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="h-36 relative overflow-hidden">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)` }} />
                      )}
                      {event.status === "live" && (
                        <Badge className="absolute top-3 right-3 bg-green-500 hover:bg-green-500 text-white border-0">Live</Badge>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDate(event.start_date)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>{event.current_attendees ?? 0} attending</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-primary via-blue-700 to-blue-900 text-white">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        {/* Concentric circles + 4 diameter lines through center, right side.
            Opacity cascade: most visible at center, fading outward. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1240 1240"
          className="absolute -right-72 md:-right-56 top-1/2 -translate-y-1/2 w-[680px] md:w-[920px] h-[680px] md:h-[920px] pointer-events-none"
          fill="none"
          stroke="white"
        >
          {/* Radial gradient — fades from center outward; used for line strokes */}
          <defs>
            <radialGradient id="ctaFadeOut" cx="620" cy="620" r="615" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="white" stopOpacity="0.15" />
              <stop offset="40%"  stopColor="white" stopOpacity="0.10" />
              <stop offset="75%"  stopColor="white" stopOpacity="0.05" />
              <stop offset="100%" stopColor="white" stopOpacity="0.02" />
            </radialGradient>
          </defs>

          {/* Rings — innermost MOST visible, fading outward. Last two rings use increasing gaps. */}
          <circle cx="620" cy="620" r="70"  strokeOpacity="0.15" strokeWidth="1" />
          <circle cx="620" cy="620" r="140" strokeOpacity="0.13" strokeWidth="1" />
          <circle cx="620" cy="620" r="218" strokeOpacity="0.11" strokeWidth="1" />
          <circle cx="620" cy="620" r="305" strokeOpacity="0.09" strokeWidth="1" />
          <circle cx="620" cy="620" r="400" strokeOpacity="0.07" strokeWidth="1" />
          <circle cx="620" cy="620" r="500" strokeOpacity="0.05" strokeWidth="1" />
          <circle cx="620" cy="620" r="615" strokeOpacity="0.03" strokeWidth="1" />

          {/* 4 diameter lines through center — cascade outward via radial gradient stroke */}
          <g stroke="url(#ctaFadeOut)" strokeWidth="1">
            <line x1="5"       y1="620"    x2="1235"    y2="620"    />
            <line x1="620"     y1="5"      x2="620"     y2="1235"   />
            <line x1="185.13"  y1="185.13" x2="1054.87" y2="1054.87"/>
            <line x1="1054.87" y1="185.13" x2="185.13"  y2="1054.87"/>
          </g>
        </svg>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full mb-5">
              Get in touch
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight">Questions about the demo?</h2>
            <p className="text-lg mb-8 text-white/85">
              Reach out and we'll walk you through the Ring + facial-recognition check-in flow.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a
                href="mailto:sholz.hackathon+eventry@gmail.com"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-8 text-base font-semibold text-primary hover:bg-gray-100 shadow-lg shadow-black/20 transition-all hover:scale-105"
              >
                <Mail className="h-4 w-4" />
                sholz.hackathon+eventry@gmail.com
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-white/40 backdrop-blur-sm bg-white/5 px-8 text-base font-semibold text-white hover:bg-white/10 hover:border-white/60 transition-all"
              >
                <Github className="h-4 w-4" />
                View Source
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt={BRAND_NAME} className="w-full h-full object-cover" />
            </div>
            <span className="text-gray-400">
              © {new Date().getFullYear()} {BRAND_NAME} · Built by{" "}
              <a
                href="https://sholaomofola.sixagroup.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors underline underline-offset-2"
              >
                Shola Omofola
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/in/sholaomofola"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors">Login to the platform</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, UserCircle, ShieldCheck, Users, Calendar, Ticket, ScanFace,
  QrCode, Radio, Webcam, Settings, CreditCard, BarChart3, Bell, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

interface GuideSection {
  Icon: React.ElementType;
  title: string;
  steps: string[];
}

const USER_SECTIONS: GuideSection[] = [
  {
    Icon: UserCircle,
    title: "Create an account",
    steps: [
      "Register with email/password, or sign in with Google, Microsoft, or LinkedIn SSO.",
      "Verify your email via the link sent to your inbox.",
    ],
  },
  {
    Icon: Calendar,
    title: "Browse & register for events",
    steps: [
      "Go to Events to see upcoming and live events.",
      "Open an event to view details, then register — paid events route through Stripe or Paystack checkout.",
      "After confirmation you receive a QR ticket, viewable any time under Event History.",
    ],
  },
  {
    Icon: ScanFace,
    title: "Opt in to facial check-in (optional)",
    steps: [
      "On an event you're registered for, opt in with a selfie.",
      "Your photo is converted to a face match vector scoped to that event only — the photo itself is not stored.",
      "At the venue, a Ring device or staff tablet can then recognize and check you in automatically, no QR needed.",
    ],
  },
  {
    Icon: Bell,
    title: "Notifications & settings",
    steps: [
      "Check Notifications for event reminders and check-in confirmations.",
      "Manage your profile, password, and linked SSO accounts under Settings.",
    ],
  },
];

const TEAM_SECTIONS: GuideSection[] = [
  {
    Icon: ClipboardList,
    title: "Team dashboard",
    steps: [
      "View events you've been assigned to staff.",
      "Open an event to see its attendee list and check-in status.",
    ],
  },
  {
    Icon: QrCode,
    title: "Running check-in",
    steps: [
      "Open an event's Check-in screen.",
      "Pick a capture source: Ring Playground camera, or your laptop webcam as a fallback.",
      "Use the switch above the Start button to choose QR Code or Facial Recognition as the check-in method — Facial is the default.",
      "Start Live Check-in — the view polls continuously and checks attendees in automatically as they're detected.",
      "If someone is already checked in, their name is shown so staff can resolve it quickly at the door.",
    ],
  },
];

const ADMIN_SECTIONS: GuideSection[] = [
  {
    Icon: Calendar,
    title: "Event authoring",
    steps: [
      "Create and edit events under Events — set schedule, location, ticket pricing, and capacity.",
      "Assign Ring devices to an event for on-site facial/QR check-in.",
      "Manage a live event's attendees, check-in activity, and analytics from its detail page.",
    ],
  },
  {
    Icon: Radio,
    title: "Ring devices",
    steps: [
      "Onboard Ring devices under Ring Devices.",
      "Assign a device to one or more events so team members can select it on the check-in screen.",
    ],
  },
  {
    Icon: Users,
    title: "User management",
    steps: [
      "View, create, and edit users under Users.",
      "Archive users instead of deleting outright — view archived accounts under Users → Archived.",
    ],
  },
  {
    Icon: CreditCard,
    title: "Payments",
    steps: [
      "Review all payments under Payments, drill into any transaction for Stripe/Paystack details.",
      "Per-event payment totals are available from each event's Payments tab.",
    ],
  },
  {
    Icon: BarChart3,
    title: "Analytics & content",
    steps: [
      "Platform-wide analytics (registrations, check-ins, revenue) under Analytics.",
      "Manage site content (blog posts, FAQs) under Content.",
    ],
  },
  {
    Icon: Settings,
    title: "Settings",
    steps: [
      "Configure platform-level settings under Admin Settings.",
    ],
  },
];

const GuideBlock: React.FC<{ title: string; description: string; sections: GuideSection[] }> = ({
  title,
  description,
  sections,
}) => (
  <div className="mb-16">
    <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{title}</h2>
    <p className="text-gray-600 mb-8 max-w-2xl">{description}</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {sections.map((s) => (
        <div key={s.title} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <s.Icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <h3 className="font-semibold text-gray-800">{s.title}</h3>
          </div>
          <ol className="space-y-2 list-decimal list-inside">
            {s.steps.map((step, i) => (
              <li key={i} className="text-sm text-gray-600 leading-relaxed">{step}</li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  </div>
);

const Guide: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt={BRAND_NAME} className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-gradient">{BRAND_NAME}</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back home
            </Button>
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-br from-primary via-blue-700 to-blue-900 text-white py-14 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full mb-4">
            <ShieldCheck className="h-3.5 w-3.5" /> Platform guide
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Attendee, staff &amp; admin guide
          </h1>
          <p className="text-white/85 max-w-2xl">
            Everything you need to register for events, run check-in at the door, or manage {BRAND_NAME}
            as an administrator.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <GuideBlock
          title="For attendees"
          description="How to find events, register, and get checked in on the day."
          sections={USER_SECTIONS}
        />
        <GuideBlock
          title="For check-in staff (team)"
          description="Running QR or facial-recognition check-in at an event, via a Ring device or a laptop webcam."
          sections={TEAM_SECTIONS}
        />
        <GuideBlock
          title="For admins"
          description="Authoring events, managing users and Ring devices, and monitoring payments and analytics."
          sections={ADMIN_SECTIONS}
        />

        <div className="mt-6 bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-start gap-3">
          <Webcam className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 leading-relaxed">
            No Ring device on hand? Every check-in screen falls back to your laptop's webcam, with the same
            QR / Facial Recognition toggle — useful for testing or small events without dedicated hardware.
          </p>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} {BRAND_NAME} ·{" "}
          <Link to="/" className="hover:text-white transition-colors underline underline-offset-2">
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Guide;

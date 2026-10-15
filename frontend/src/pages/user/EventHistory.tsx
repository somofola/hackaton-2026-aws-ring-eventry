import React, { useEffect, useState } from "react";
import UserLayout from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, MapPin, Clock, ArrowLeft, CheckCircle,
  Download, QrCode, Loader2, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import api from "@/services/api";

interface Sponsor {
  id: number;
  name: string;
  tier: string | null;
  logo_url: string | null;
}

interface Enrollment {
  id: number;
  confirmation_number: string | null;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  enrolled_at: string | null;
  user_name: string;
  event: {
    id: number;
    title: string;
    description: string | null;
    start_date: string | null;
    start_time: string | null;
    location: string | null;
    slug: string;
    issues_certificate: boolean | number;
    organizer?: { name: string; company?: string | null; profile_image_url?: string | null } | null;
    corporate?: { name: string; logo_url?: string | null } | null;
    sponsors?: Sponsor[];
  } | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const loadBase64 = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

const rgbNavy  = [26,  39,  68]  as const;
const rgbGold  = [184, 142,  56]  as const;
const rgbCream = [250, 247, 240] as const;
const rgbGoldL = [240, 228, 190] as const;
const rgbGray  = [100, 108, 130] as const;
const rgbDark  = [ 30,  38,  60]  as const;

// ── certificate generator ─────────────────────────────────────────────────────

async function generateCertificate(enrollment: Enrollment) {
  const ev = enrollment.event!;
  const W = 297, H = 210; // A4 landscape mm

  const organizerLogoUrl =
    ev.corporate?.logo_url ?? ev.organizer?.profile_image_url ?? null;
  const sponsorLogos = ev.sponsors ?? [];

  // Pre-load images
  const [organizerImg, ...sponsorImgs] = await Promise.all([
    organizerLogoUrl ? loadBase64(organizerLogoUrl) : Promise.resolve(null),
    ...sponsorLogos.map((s) => (s.logo_url ? loadBase64(s.logo_url) : Promise.resolve(null))),
  ]);

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // ── 1. Background ────────────────────────────────────────────────────────
  pdf.setFillColor(...rgbCream);
  pdf.rect(0, 0, W, H, "F");

  // Gold outer border
  pdf.setDrawColor(...rgbGold);
  pdf.setLineWidth(3);
  pdf.rect(5, 5, W - 10, H - 10);

  // Navy inner border
  pdf.setDrawColor(...rgbNavy);
  pdf.setLineWidth(0.6);
  pdf.rect(9, 9, W - 18, H - 18);

  // ── 2. Header band (navy) ────────────────────────────────────────────────
  pdf.setFillColor(...rgbNavy);
  pdf.rect(9, 9, W - 18, 32, "F");

  // Gold accent line under header
  pdf.setFillColor(...rgbGold);
  pdf.rect(9, 41, W - 18, 1.5, "F");

  // "CERTIFICATE OF ATTENDANCE" in header
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("CERTIFICATE OF ATTENDANCE", W / 2, 21, { align: "center" });

  // Subtitle in header
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...rgbGoldL);
  pdf.text("Eventry · Official Attendance Record", W / 2, 30, { align: "center" });

  // ── 3. Organizer logo (header left) ──────────────────────────────────────
  if (organizerImg) {
    try { pdf.addImage(organizerImg, "PNG", 14, 11, 28, 28, undefined, "FAST"); } catch { /* skip */ }
  }

  // ── 4. Decorative corner ornaments ───────────────────────────────────────
  const corners = [[13, 13], [W - 13, 13], [13, H - 13], [W - 13, H - 13]] as const;
  pdf.setFillColor(...rgbGold);
  corners.forEach(([cx, cy]) => { pdf.circle(cx, cy, 1.2, "F"); });

  // ── 5. Main content ───────────────────────────────────────────────────────
  // "This certifies that"
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...rgbGray);
  pdf.text("This certifies that", W / 2, 58, { align: "center" });

  // Attendee name
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(30);
  pdf.setTextColor(...rgbNavy);
  pdf.text(enrollment.user_name || "Attendee", W / 2, 74, { align: "center" });

  // Gold ornamental rule
  const midY = 81;
  pdf.setDrawColor(...rgbGold);
  pdf.setLineWidth(0.5);
  pdf.line(W / 2 - 55, midY, W / 2 - 8, midY);
  pdf.line(W / 2 + 8, midY, W / 2 + 55, midY);
  pdf.setFillColor(...rgbGold);
  pdf.circle(W / 2, midY, 1.4, "F");
  pdf.circle(W / 2 - 6, midY, 0.6, "F");
  pdf.circle(W / 2 + 6, midY, 0.6, "F");

  // "has successfully attended"
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...rgbGray);
  pdf.text("has successfully attended", W / 2, 89, { align: "center" });

  // Event title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...rgbNavy);
  const titleLines = pdf.splitTextToSize(ev.title, W - 80) as string[];
  pdf.text(titleLines, W / 2, 101, { align: "center" });

  // Date • Location
  const contentY = titleLines.length > 1 ? 117 : 113;
  if (ev.start_date || ev.location) {
    const datePart = ev.start_date
      ? new Date(ev.start_date).toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })
      : "";
    const locPart = ev.location ?? "";
    const detail = [datePart, locPart].filter(Boolean).join("   ·   ");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...rgbGray);
    pdf.text(detail, W / 2, contentY, { align: "center" });
  }

  // Organizer name
  const orgName = ev.corporate?.name ?? ev.organizer?.company ?? ev.organizer?.name ?? null;
  if (orgName) {
    pdf.setFontSize(8.5);
    pdf.setTextColor(...rgbGold);
    pdf.text(`Organized by  ${orgName}`, W / 2, contentY + 8, { align: "center" });
  }

  // ── 6. Footer band ────────────────────────────────────────────────────────
  pdf.setFillColor(...rgbNavy);
  pdf.rect(9, H - 37, W - 18, 28, "F");

  // Gold line at top of footer
  pdf.setFillColor(...rgbGold);
  pdf.rect(9, H - 38, W - 18, 1.5, "F");

  // Footer left — confirmation & date
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...rgbGoldL);
  if (enrollment.confirmation_number) {
    pdf.text(`Confirmation:  ${enrollment.confirmation_number}`, 16, H - 28);
  }
  pdf.text(`Issued:  ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 16, H - 21);
  if (enrollment.checked_in_at) {
    pdf.text(`Checked in:  ${new Date(enrollment.checked_in_at).toLocaleString()}`, 16, H - 14);
  }

  // Footer right — "Powered by Eventry"
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Powered by Eventry", W - 16, H - 14, { align: "right" });

  // ── 7. Sponsor logos (footer centre) ─────────────────────────────────────
  const visibleSponsors = sponsorLogos.filter((_, i) => sponsorImgs[i]);
  if (visibleSponsors.length > 0) {
    const logoH  = 16;
    const logoW  = 24;
    const gap    = 4;
    const totalW = visibleSponsors.length * logoW + (visibleSponsors.length - 1) * gap;
    let startX   = W / 2 - totalW / 2;
    const logoY  = H - 37 + (28 - logoH) / 2;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...rgbGoldL);
    pdf.text("Sponsors", W / 2, H - 37 + 5, { align: "center" });

    visibleSponsors.forEach((_, i) => {
      const img = sponsorImgs[i];
      if (img) {
        try {
          pdf.addImage(img, "PNG", startX, logoY, logoW, logoH, undefined, "FAST");
        } catch { /* skip */ }
      }
      startX += logoW + gap;
    });
  } else {
    // No sponsor logos — show sponsor names as text if any
    const names = sponsorLogos.map((s) => s.name).filter(Boolean);
    if (names.length > 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...rgbGoldL);
      pdf.text(`Sponsors: ${names.join("  ·  ")}`, W / 2, H - 20, { align: "center" });
    }
  }

  pdf.save(`certificate-${ev.title.replace(/\s+/g, "-")}.pdf`);
}

// ── component ─────────────────────────────────────────────────────────────────

const AttendedEventHistory = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [generating, setGenerating]   = useState<number | null>(null);

  useEffect(() => {
    api.get("/my-enrollments")
      .then((res) => setEnrollments(res.data ?? []))
      .catch(() => setError("Failed to load event history."))
      .finally(() => setLoading(false));
  }, []);

  const thisYear     = new Date().getFullYear();
  const attendedCount = enrollments.filter((e) => e.checked_in).length;
  const thisYearCount = enrollments.filter(
    (e) => e.event?.start_date && new Date(e.event.start_date).getFullYear() === thisYear
  ).length;

  const handleDownload = async (enrollment: Enrollment) => {
    setGenerating(enrollment.id);
    try {
      await generateCertificate(enrollment);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/user/events">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Events
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Event History</h1>
            <p className="text-gray-600 mt-1">Your registered events and attendance certificates</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{loading ? "—" : attendedCount}</p>
                <p className="text-sm text-gray-500">Events Attended</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{loading ? "—" : thisYearCount}</p>
                <p className="text-sm text-gray-500">This Year</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Download className="h-5 w-5 text-purple-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{loading ? "—" : attendedCount}</p>
                <p className="text-sm text-gray-500">Certificates Available</p>
              </div>
            </div>
          </Card>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 shrink-0" /> {error}
          </div>
        )}

        {!loading && !error && enrollments.length === 0 && (
          <Card>
            <div className="p-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Yet</h3>
              <p className="text-gray-600">You haven't registered for any events yet.</p>
              <Link to="/user/events"><Button className="mt-4">Browse Events</Button></Link>
            </div>
          </Card>
        )}

        {!loading && !error && enrollments.length > 0 && (
          <div className="space-y-4">
            {enrollments.map((enrollment) => {
              if (!enrollment.event) return null;
              const ev = enrollment.event;
              const orgName = ev.corporate?.name ?? ev.organizer?.company ?? ev.organizer?.name;
              return (
                <Card key={enrollment.id}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-xl font-semibold">{ev.title}</h3>
                          {enrollment.checked_in ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 shrink-0">
                              <CheckCircle className="mr-1 h-3 w-3" /> Attended
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0 capitalize">
                              {enrollment.status ?? "Enrolled"}
                            </Badge>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-gray-600 text-sm line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-sm text-gray-600">
                      {ev.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          {new Date(ev.start_date).toLocaleDateString()}
                        </div>
                      )}
                      {ev.start_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0" />
                          {ev.start_time}
                        </div>
                      )}
                      {ev.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                      {enrollment.confirmation_number && (
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4 shrink-0" />
                          #{enrollment.confirmation_number}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 gap-3 flex-wrap">
                      <div className="text-sm text-gray-500 space-y-0.5">
                        {orgName && <p>Organized by {orgName}</p>}
                        {enrollment.checked_in_at && (
                          <p>Checked in: {new Date(enrollment.checked_in_at).toLocaleString()}</p>
                        )}
                        {!enrollment.checked_in && enrollment.enrolled_at && (
                          <p>Registered: {new Date(enrollment.enrolled_at).toLocaleString()}</p>
                        )}
                      </div>
                      {enrollment.checked_in && !!ev.issues_certificate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(enrollment)}
                          disabled={generating === enrollment.id}
                          className="flex items-center gap-2 shrink-0"
                        >
                          {generating === enrollment.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Download className="h-4 w-4" />}
                          {generating === enrollment.id ? "Generating…" : "Certificate"}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default AttendedEventHistory;

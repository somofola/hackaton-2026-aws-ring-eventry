import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/services/api";
import {
  CheckCircle, Calendar, ArrowRight, Download,
  Mail, MapPin, Clock, Loader2, Globe, ScanFace,
} from "lucide-react";
import QRCode from "react-qr-code";
import ExternalRegistrationModal from "@/components/events/ExternalRegistrationModal";
import { ExternalRegistration } from "@/types";
import { BRAND_NAME } from "@/lib/brand";
import { uploadFaceOptIn } from "@/services/eventService";
import { useToast } from "@/hooks/use-toast";
import FaceCaptureDialog from "@/components/events/FaceCaptureDialog";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function fmtDateShort(iso: string | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

// ── Component ────────────────────────────────────────────────────────────────

const EventConfirmation = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const badgeRef = useRef<HTMLDivElement>(null);

  const [event, setEvent]       = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [profile, setProfile]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [externalReg, setExternalReg] = useState<ExternalRegistration | null>(null);
  const [externalModalOpen, setExternalModalOpen] = useState(false);
  const [faceOptInStatus, setFaceOptInStatus] = useState<"idle" | "uploading" | "enabled">("idle");
  const [faceCaptureOpen, setFaceCaptureOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.get(`/events/slug/${slug}`),
      api.get("/my-enrollments").catch(() => ({ data: [] })),
      api.get("/user/profile").catch(() => ({ data: null })),
    ])
      .then(([evRes, enrollRes, profileRes]) => {
        const ev = evRes.data;
        setEvent(ev);
        setProfile(profileRes.data);
        const enr = (enrollRes.data as any[]).find(
          (e) => e.event?.uuid === ev.uuid || e.event?.slug === slug
        );
        setEnrollment(enr ?? null);

        // Pick up the 3rd-party handoff payload the checkout stashed.
        const raw = sessionStorage.getItem(`extReg_${ev.id}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ExternalRegistration;
            setExternalReg(parsed);
            setExternalModalOpen(true);
          } catch { /* ignore */ }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const userName          = profile?.name || enrollment?.user_name || "Attendee";
  const userEmail         = profile?.email || enrollment?.user_email || "";
  const userCompany       = profile?.company || "";
  const confirmationNumber = enrollment?.confirmation_number || "CONF-??????";
  const qrValue           = enrollment?.qr_code || `e:${event?.uuid}:u:0:0`;
  const ticketName        = enrollment?.ticket_category?.name ?? null;

  const nameParts  = userName.trim().split(/\s+/);
  const firstName  = nameParts[0] ?? "";
  const lastName   = nameParts.slice(1).join(" ");

  const handleDownloadPDF = async () => {
    if (!badgeRef.current) return;
    setPdfLoading(true);

    // Proxy external images through the backend so html2canvas can read them
    // without CORS restrictions (avoids tainted-canvas errors).
    const apiBase = (import.meta.env.VITE_API_URL as string) || "https://eventry.app/backend/api";
    const imgEls = Array.from(badgeRef.current.querySelectorAll<HTMLImageElement>("img"));
    const origSrcs = imgEls.map((el) => el.src);

    const toDataUrl = async (src: string): Promise<string | null> => {
      if (!src || src.startsWith("data:")) return null;
      try {
        const isExternal = !src.startsWith(window.location.origin) && src.startsWith("http");
        const fetchUrl = isExternal
          ? `${apiBase}/image-proxy?url=${encodeURIComponent(src)}`
          : src;
        const res = await fetch(fetchUrl);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };

    // Replace srcs with data URLs, wait for images to settle
    await Promise.all(imgEls.map(async (el, i) => {
      const dataUrl = await toDataUrl(origSrcs[i]);
      if (dataUrl) {
        el.src = dataUrl;
        await new Promise<void>((res) => {
          if (el.complete) { res(); return; }
          el.onload = () => res();
          el.onerror = () => res();
        });
      }
    }));

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const canvas = await html2canvas(badgeRef.current, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Badge width 90 mm, padding 8 mm on each side → page 106 mm wide
      const badgeWidthMm  = 102;
      const paddingMm     = 2;
      const pageWidthMm   = badgeWidthMm + paddingMm * 2;
      const pxPerMm       = canvas.width / badgeWidthMm;
      const badgeHeightMm = canvas.height / pxPerMm;
      const pageHeightMm  = badgeHeightMm + paddingMm * 2;

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ unit: "mm", format: [pageWidthMm, pageHeightMm], orientation: "portrait" });
      pdf.addImage(imgData, "JPEG", paddingMm, paddingMm, badgeWidthMm, badgeHeightMm);
      pdf.save(`eventry-badge-${confirmationNumber}.pdf`);
    } finally {
      // Restore original srcs
      imgEls.forEach((el, i) => { el.src = origSrcs[i]; });
      setPdfLoading(false);
    }
  };

  const handleFaceOptIn = async (file: File) => {
    if (!event?.uuid || !enrollment?.id) return;
    setFaceOptInStatus("uploading");
    try {
      await uploadFaceOptIn(event.uuid, enrollment.id, file);
      setFaceOptInStatus("enabled");
      setFaceCaptureOpen(false);
      toast({ title: "Face check-in enabled", description: "You can now check in at this event's Ring-equipped entrance without scanning your QR code." });
    } catch (err: any) {
      setFaceOptInStatus("idle");
      toast({
        title: "Couldn't enable face check-in",
        description: err?.response?.data?.message || "No usable face detected in that photo — try a clearer, front-facing photo.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Event not found</h1>
          <Button onClick={() => navigate("/user/events")}>
            <ArrowRight className="mr-2 h-4 w-4" /> Browse Events
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const hasEndDate = event.end_date && event.end_date !== event.start_date;
  const companyLogo =
    event.corporate?.profile_image_url ||
    event.organizer?.profile_image_url ||
    null;

  return (
    <DashboardLayout>
      <ExternalRegistrationModal
        open={externalModalOpen}
        registration={externalReg}
        onClose={() => setExternalModalOpen(false)}
      />

      <div className="space-y-6 max-w-2xl mx-auto">

        {/* ── Success header ── */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Registration Confirmed!</h1>
          <p className="text-gray-600">You're all set for <span className="font-semibold">{event.title}</span></p>
        </div>

        {externalReg && (
          <Card className="border-amber-300 bg-amber-50">
            <div className="p-4 flex items-start gap-3">
              <Globe className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-amber-900">
                  Complete your 3rd-party ticket on {externalReg.origin}
                </div>
                <div className="text-sm text-amber-800 mt-1">
                  Your {BRAND_NAME} registration is confirmed. The event organiser also needs you to finalise registration on their platform.
                </div>
              </div>
              <Button size="sm" onClick={() => setExternalModalOpen(true)}>Continue</Button>
            </div>
          </Card>
        )}

        {/* ── Confirmation details ── */}
        <Card className="card-enhanced">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Confirmation Details</h2>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
              <h3 className="font-semibold text-base">{event.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <div>{fmtDate(event.start_date)}</div>
                    {hasEndDate && (
                      <div className="text-gray-400">to {fmtDate(event.end_date)}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {event.start_time}
                    {event.end_time ? ` – ${event.end_time}` : ""}
                  </span>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>{event.location}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Attendee</span>
                  <p className="font-medium">{userName}</p>
                </div>
                {ticketName && (
                  <div>
                    <span className="text-gray-400">Ticket</span>
                    <p className="font-medium">{ticketName}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Confirmation #</span>
                  <p className="font-mono font-semibold text-primary">{confirmationNumber}</p>
                </div>
              </div>
            </div>

            {userEmail && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
                <Mail className="h-4 w-4 shrink-0" />
                A confirmation has been sent to <span className="font-medium text-gray-700">{userEmail}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => navigate("/user/events")} className="flex-1">
                <Calendar className="mr-2 h-4 w-4" /> Browse Events
              </Button>
              <Button onClick={() => navigate("/user")} className="btn-primary flex-1">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Event Badge ── */}
        <Card className="card-enhanced">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold">Your Event Badge</h2>
                <p className="text-sm text-gray-500">Present this at event check-in</p>
              </div>
              <Button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                variant="outline"
                size="sm"
              >
                {pdfLoading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Download className="mr-2 h-4 w-4" />}
                Download PDF
              </Button>
            </div>

            {/* Badge — captured for PDF */}
            <div className="flex justify-center">
              <div
                ref={badgeRef}
                style={{ width: 360, fontFamily: "Arial, sans-serif" }}
                className="rounded-2xl overflow-hidden shadow-xl bg-white border border-gray-100"
              >
                {/* Banner */}
                <div
                  className="relative flex flex-col items-center justify-end pb-5 pt-8 px-6 text-white overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #0ea5e9 100%)",
                    minHeight: 120,
                  }}
                >
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      alt=""
                      className="absolute left-0 w-full h-auto top-1/2 -translate-y-1/2 opacity-20"
                    />
                  )}
                  <div className="relative z-10 w-full flex items-start justify-between gap-3">
                    <div className="text-left flex-1">
                      <p className="text-xs font-semibold tracking-widest uppercase opacity-80 mb-1">Event Badge</p>
                      <h3
                        className="font-bold leading-tight"
                        style={{
                          fontSize: event.title.length > 60 ? 11
                            : event.title.length > 40 ? 13
                            : event.title.length > 25 ? 15
                            : 18,
                        }}
                      >{event.title}</h3>
                      {(event.corporate?.name || event.organizer?.company || event.organizer?.name) && (
                        <p className="text-xs opacity-70 mt-1">
                          by {event.corporate?.name || event.organizer?.company || event.organizer?.name}
                        </p>
                      )}
                    </div>
                    {companyLogo && (
                      <img
                        src={companyLogo}
                        alt="Organizer"
                        className="h-16 w-16 rounded-full object-cover border-2 border-white/60 shadow shrink-0"
                      />
                    )}
                  </div>
                </div>

                {/* Attendee section */}
                <div className="px-6 py-5 flex flex-col items-center text-center border-b border-dashed border-gray-200">
                  {profile?.profile_image_url ? (
                    <img
                      src={profile.profile_image_url}
                      alt={userName}
                      className="w-14 h-14 rounded-full object-cover mb-3 shadow border-2 border-gray-100"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3 shadow"
                      style={{ background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)" }}
                    >
                      {initials(userName)}
                    </div>
                  )}
                  <p className="text-3xl font-bold text-gray-800 leading-tight">{firstName}</p>
                  {lastName && <p className="text-sm font-medium text-gray-600 mt-0.5">{lastName}</p>}
                  {userCompany && <p className="text-xs text-gray-400 mt-0.5">{userCompany}</p>}
                  {ticketName && (
                    <span
                      className="mt-2 inline-block text-xs font-semibold px-3 py-1 rounded-full text-white"
                      style={{ background: "linear-gradient(90deg, #1d4ed8, #0ea5e9)" }}
                    >
                      {ticketName}
                    </span>
                  )}
                </div>

                {/* Event meta */}
                <div className="px-6 py-4 space-y-1.5 text-xs text-gray-600 border-b border-dashed border-gray-200">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div>{fmtDate(event.start_date)}{event.start_time ? `, ${event.start_time}` : ""}</div>
                      {(hasEndDate || event.end_time) && (
                        <div className="text-gray-400">
                          to {hasEndDate ? fmtDate(event.end_date) : fmtDate(event.start_date)}
                          {event.end_time ? `, ${event.end_time}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
                    <span>{event.location}</span>
                  </div>
                </div>

                {/* QR code */}
                <div className="px-6 py-5 flex flex-col items-center border-b border-dashed border-gray-200">
                  <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm mb-3">
                    <QRCode value={qrValue} size={100} />
                  </div>
                  <p className="font-mono text-sm font-bold text-gray-700 tracking-wider">{confirmationNumber}</p>
                  <p className="text-xs text-gray-400 mt-1">Scan at event check-in</p>
                </div>

                {/* Branding footer */}
                <div
                  className="px-5 py-2.5"
                  style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)" }}
                >
                  <div className="flex items-center justify-between">
                    <img src="/logo_lite.png" alt="Eventry" className="h-5 w-auto object-contain" />
                    <div className="text-right text-white/80" style={{ fontSize: 9, lineHeight: 1.5 }}>
                      <div>For enquiries &amp; support</div>
                      <div>support@eventry.app &nbsp;|&nbsp; eventry.app</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Face check-in opt-in (optional) ── */}
        {enrollment?.id && (
          <Card className="card-enhanced">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <ScanFace className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Enable fast check-in with face recognition (optional)</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    We'll open your camera for a couple seconds and grab one clear frame to skip the QR scan at this
                    event's entrance. Used only for this event — your photo is matched locally, never stored, and all
                    face data is permanently deleted once the event ends. Off by default; your QR badge above always
                    works regardless.
                  </p>
                </div>
              </div>

              {faceOptInStatus === "enabled" ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0" /> Face check-in enabled for this event.
                </div>
              ) : (
                <Button
                  variant="outline"
                  disabled={faceOptInStatus === "uploading"}
                  onClick={() => setFaceCaptureOpen(true)}
                >
                  {faceOptInStatus === "uploading"
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                    : <><ScanFace className="mr-2 h-4 w-4" /> Capture My Face</>}
                </Button>
              )}
            </div>
          </Card>
        )}

        <FaceCaptureDialog
          open={faceCaptureOpen}
          onOpenChange={setFaceCaptureOpen}
          onCapture={handleFaceOptIn}
          uploading={faceOptInStatus === "uploading"}
        />

      </div>
    </DashboardLayout>
  );
};

export default EventConfirmation;

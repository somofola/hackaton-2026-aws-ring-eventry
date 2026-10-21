
import React, { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import QrScannerWorkerPath from "qr-scanner/qr-scanner-worker.min.js?url";

// Falls back to this worker on browsers without the native BarcodeDetector API
// (e.g. Firefox/Safari); Chrome/Edge use BarcodeDetector directly and never load it.
QrScanner.WORKER_PATH = QrScannerWorkerPath;
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Video, VideoOff, CheckCircle, Loader2, QrCode, Webcam, ScanFace, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  openRingWhep,
  closeRingWhep,
  testRingCapture,
  detectByQr,
  detectByFace,
  confirmCheckIn,
} from "@/services/eventService";

type CaptureSource = "ring" | "webcam";
type CaptureMode = "face" | "qr";
type CheckInMode = "confirm" | "auto";

interface RingCheckInViewProps {
  eventUuid: string;
  ringDeviceId: string;
  checkedInBy: string;
  /** Called after a successful check-in so parent lists/counters can refresh. */
  onCheckedIn?: (enrollment: unknown) => void;
}

const CAPTURE_POLL_INTERVAL_MS = 1500;

function base64ToBlob(base64: string, mimeType = "image/jpeg"): Blob {
  const cleaned = base64.includes(",") ? base64.split(",")[1] : base64;
  const bytes = atob(cleaned);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new Blob([buffer], { type: mimeType });
}

/**
 * Live "counter kiosk" view for check-in — no physical device required:
 * opens a real WHEP session against the Ring Playground's virtual device
 * (same trick as scripts/ring-test-capture.sh) so the camera has footage to
 * serve, or falls back to the laptop's own webcam. Either source can be
 * scanned for a QR code or matched via facial recognition — toggled with
 * the mode buttons below, default facial.
 *
 * This mirrors the real no-kiosk flow (RingArrivalCaptureService polls
 * snapshots on a person_detected webhook) but drives it from a live demo
 * button instead of a real motion event, since a Playground device never
 * fires real webhooks.
 */
const RingCheckInView: React.FC<RingCheckInViewProps> = ({
  eventUuid,
  ringDeviceId,
  checkedInBy,
  onCheckedIn,
}) => {
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "matched" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [source, setSource] = useState<CaptureSource>("ring");
  const [mode, setMode] = useState<CaptureMode>("face");
  const [checkInMode, setCheckInMode] = useState<CheckInMode>("confirm");
  const [noMatchStreak, setNoMatchStreak] = useState(0);
  const [pendingMatch, setPendingMatch] = useState<{ enrollmentId: number; userName: string; method: CaptureMode } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const pendingRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const sessionUrlRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);
  const lastErrorRef = useRef<string>("");
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);

  const { toast } = useToast();

  // Ring caps WHEP live sessions at 30s for battery-powered devices (60s
  // line-powered) — see docs/ring/api-documentation.html#session-duration-limits.
  // Re-opening a fresh session on this cadence keeps the device's media
  // buffer continuously warm so test-capture doesn't start 416ing the moment
  // the prior session auto-expires server-side.
  const SESSION_REFRESH_MS = 20_000;
  const NO_MATCH_THRESHOLD = 8;

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const stopRefreshLoop = () => {
    if (refreshRef.current) {
      clearInterval(refreshRef.current);
      refreshRef.current = null;
    }
  };

  const closeCurrentSession = async () => {
    peerRef.current?.close();
    peerRef.current = null;

    if (sessionUrlRef.current) {
      const url = sessionUrlRef.current;
      sessionUrlRef.current = null;
      try {
        await closeRingWhep(ringDeviceId, url);
      } catch {
        // best-effort — battery-powered sessions auto-expire anyway
      }
    }
  };

  const stopWebcam = () => {
    webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
    webcamStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const teardown = async () => {
    stoppedRef.current = true;
    stopPolling();
    stopRefreshLoop();
    await closeCurrentSession();
    stopWebcam();
  };

  /** Grabs the current <video> frame as a JPEG blob, or null if it isn't ready. */
  const captureVideoFrame = (): Blob | null | Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9));
  };

  /** Opens one WHEP session + RTCPeerConnection. Returns true on success. */
  const openSession = async (): Promise<boolean> => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerRef.current = pc;

      pc.addTransceiver("video", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", check);
        // Ring's WHEP endpoint doesn't need trickle ICE, but don't hang forever
        // waiting on a candidate that'll never arrive in this sandboxed offer.
        setTimeout(resolve, 2000);
      });

      const session = await openRingWhep(ringDeviceId, pc.localDescription?.sdp || offer.sdp || "");
      sessionUrlRef.current = session.session_url;

      await pc.setRemoteDescription({ type: "answer", sdp: session.sdp });

      return true;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not start Ring live view — check RING_ACCESS_TOKEN and device ID.";
      console.error("Ring WHEP session open failed:", err);
      lastErrorRef.current = message;
      return false;
    }
  };

  const startRefreshLoop = () => {
    refreshRef.current = setInterval(async () => {
      if (stoppedRef.current) return;

      const oldPeer = peerRef.current;
      const oldSessionUrl = sessionUrlRef.current;
      peerRef.current = null;
      sessionUrlRef.current = null;

      const opened = await openSession();

      // Close the previous session/peer after the new one's confirmed live,
      // so there's no gap where the device's buffer goes cold again.
      oldPeer?.close();
      if (oldSessionUrl) {
        closeRingWhep(ringDeviceId, oldSessionUrl).catch(() => {});
      }

      if (!opened && !stoppedRef.current) {
        const message = lastErrorRef.current || "Ring live view dropped — check RING_ACCESS_TOKEN and retry.";
        setErrorMessage(message);
        toast({ title: "Ring live view error", description: message, variant: "destructive" });
        setStatus("error");
        await teardown();
      }
    }, SESSION_REFRESH_MS);
  };

  /** Face frame matched a candidate — auto-commits in "auto" mode, otherwise hands off to the confirm popup. */
  const handleFaceMatch = async (image: Blob) => {
    processingRef.current = true;
    try {
      const res = await detectByFace(eventUuid, image);
      stopPolling();
      setNoMatchStreak(0);
      const userName = res.enrollment.user_name || "Attendee";
      if (checkInMode === "auto") {
        await commitMatch(res.enrollment.id, userName, "face");
      } else {
        pendingRef.current = true;
        setPendingMatch({ enrollmentId: res.enrollment.id, userName, method: "face" });
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        // no confident match in this frame — normal, keep polling
        setNoMatchStreak((n) => n + 1);
      } else if (status === 409) {
        stopPolling();
        const enrollment = (err as { response?: { data?: { enrollment?: { user_name?: string } } } })?.response?.data?.enrollment;
        const name = enrollment?.user_name || "Attendee";
        setMatchedName(name);
        setStatus("matched");
        toast({ title: "Already checked in", description: `${name} is already checked in`, variant: "destructive" });
        await teardown();
      } else {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Face match failed";
        toast({ title: "Face match failed", description: message, variant: "destructive" });
      }
    } finally {
      processingRef.current = false;
    }
  };

  /** Decoded QR matched a candidate — auto-commits in "auto" mode, otherwise hands off to the confirm popup. */
  const handleQrResult = async (qrCode: string, successDescription: string, retry: () => void) => {
    try {
      const res = await detectByQr(eventUuid, qrCode);
      const userName = res.enrollment.user_name || "Attendee";
      if (checkInMode === "auto") {
        await commitMatch(res.enrollment.id, userName, "qr");
      } else {
        pendingRef.current = true;
        setPendingMatch({ enrollmentId: res.enrollment.id, userName, method: "qr" });
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        stopPolling();
        const enrollment = (err as { response?: { data?: { enrollment?: { user_name?: string } } } })?.response?.data?.enrollment;
        const name = enrollment?.user_name || "Attendee";
        setMatchedName(name);
        setStatus("matched");
        toast({ title: "Already checked in", description: `${name} is already checked in`, variant: "destructive" });
        await teardown();
        return;
      }
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Check-in failed for the decoded QR code";
      toast({ title: "Check-in failed", description: message, variant: "destructive" });
      // Keep polling — could've been a stale/already-checked-in badge caught mid-frame.
      retry();
    }
  };

  /**
   * Commits a check-in for a resolved enrollment. In "auto" mode (unattended
   * booth) the feed stays live and resumes scanning for the next attendee
   * after a brief "matched" flash; in "confirm" mode (staff-operated) the
   * feed stops so staff can review before starting the next check-in.
   */
  const commitMatch = async (enrollmentId: number, userName: string, method: CaptureMode) => {
    try {
      const res = await confirmCheckIn(
        eventUuid,
        enrollmentId,
        checkedInBy,
        source === "ring" ? ringDeviceId : undefined,
        method
      );
      setMatchedName(userName);
      setStatus("matched");
      onCheckedIn?.(res);
      toast({ title: "Checked in!", description: `${userName} checked in via ${method === "face" ? "facial recognition" : "QR code"}.` });

      if (checkInMode === "auto" && !stoppedRef.current) {
        setTimeout(() => {
          if (stoppedRef.current) return;
          setStatus("live");
          setMatchedName(null);
          resumeScanning();
        }, 2000);
      } else {
        await teardown();
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message =
        status === 409
          ? "Already checked in"
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Check-in failed";
      toast({ title: "Check-in failed", description: message, variant: "destructive" });
      resumeScanning();
    }
  };

  const confirmPendingMatch = async () => {
    if (!pendingMatch) return;
    setConfirming(true);
    pendingRef.current = false;
    const { enrollmentId, userName, method } = pendingMatch;
    setPendingMatch(null);
    try {
      await commitMatch(enrollmentId, userName, method);
    } finally {
      setConfirming(false);
    }
  };

  const cancelPendingMatch = () => {
    pendingRef.current = false;
    setPendingMatch(null);
    resumeScanning();
  };

  /** Resumes polling after a cancelled/failed confirm, matching whatever source+mode is active. */
  const resumeScanning = () => {
    if (stoppedRef.current) return;
    if (source === "webcam") {
      if (mode === "qr") pollForQrWebcam();
      else pollForFaceWebcam();
    } else {
      if (mode === "qr") pollForQr();
      else pollForFaceRing();
    }
  };

  const pollForQr = () => {
    pollRef.current = setInterval(async () => {
      if (stoppedRef.current || pendingRef.current) return;

      try {
        const result = await testRingCapture(ringDeviceId);

        if (result.success && result.qr_result) {
          stopPolling();
          await handleQrResult(result.qr_result, "Attendee matched via Ring QR capture.", pollForQr);
        }
      } catch {
        // transient snapshot miss — keep polling silently
      }
    }, CAPTURE_POLL_INTERVAL_MS);
  };

  const pollForFaceRing = () => {
    pollRef.current = setInterval(async () => {
      if (stoppedRef.current || processingRef.current || pendingRef.current) return;

      try {
        const result = await testRingCapture(ringDeviceId);
        if (result.success && result.image_base64) {
          await handleFaceMatch(base64ToBlob(result.image_base64));
        }
      } catch {
        // transient snapshot miss — keep polling silently
      }
    }, CAPTURE_POLL_INTERVAL_MS);
  };

  const pollForQrWebcam = () => {
    pollRef.current = setInterval(async () => {
      if (stoppedRef.current || pendingRef.current || !videoRef.current) return;

      try {
        const { data: qrCode } = await QrScanner.scanImage(videoRef.current, {
          returnDetailedScanResult: true,
        });

        stopPolling();
        await handleQrResult(qrCode, "Attendee matched via webcam QR capture.", pollForQrWebcam);
      } catch {
        // no QR code in this frame — keep polling silently
      }
    }, CAPTURE_POLL_INTERVAL_MS);
  };

  const pollForFaceWebcam = () => {
    pollRef.current = setInterval(async () => {
      if (stoppedRef.current || processingRef.current || pendingRef.current) return;

      const frame = await captureVideoFrame();
      if (!frame) return;

      await handleFaceMatch(frame);
    }, CAPTURE_POLL_INTERVAL_MS);
  };

  useEffect(() => {
    if (noMatchStreak >= NO_MATCH_THRESHOLD) {
      // Not fatal — just a sign the camera framing is off. Keep polling, reset the streak.
      setNoMatchStreak(0);
    }
  }, [noMatchStreak]);

  /**
   * Dev-playground alternative to the Ring Playground WHEP flow — uses the
   * laptop's own camera so the check-in demo can be run end-to-end without a
   * Ring Playground access token or any Ring account at all.
   */
  const startWebcam = async () => {
    stoppedRef.current = false;
    setStatus("connecting");
    setErrorMessage("");
    setMatchedName(null);
    setNoMatchStreak(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("live");
      if (mode === "qr") pollForQrWebcam();
      else pollForFaceWebcam();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not access webcam — check browser permissions.";
      setErrorMessage(message);
      toast({ title: "Webcam error", description: message, variant: "destructive" });
      setStatus("error");
      await teardown();
    }
  };

  const start = async () => {
    if (source === "webcam") {
      await startWebcam();
      return;
    }

    stoppedRef.current = false;
    setStatus("connecting");
    setErrorMessage("");
    setMatchedName(null);
    setNoMatchStreak(0);
    lastErrorRef.current = "";

    const opened = await openSession();

    if (opened) {
      setStatus("live");
      startRefreshLoop();
      if (mode === "qr") pollForQr();
      else pollForFaceRing();
    } else {
      const message = lastErrorRef.current || "Could not start Ring live view — check RING_ACCESS_TOKEN and device ID.";
      setErrorMessage(message);
      toast({ title: "Ring live view error", description: message, variant: "destructive" });
      setStatus("error");
      await teardown();
    }
  };

  const stop = async () => {
    pendingRef.current = false;
    setPendingMatch(null);
    await teardown();
    setStatus("idle");
  };

  useEffect(() => {
    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canChangeSettings = status === "idle" || status === "error";

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {mode === "face" ? <ScanFace className="h-5 w-5 text-gray-500" /> : <QrCode className="h-5 w-5 text-gray-500" />}
          Check-in (live demo)
        </h3>
      </div>
      <p className="text-sm text-gray-500">
        {source === "ring"
          ? `Opens a live view on the Ring Playground device and watches for ${mode === "face" ? "a matching face" : "an attendee's QR code"} — no physical camera required.`
          : `Uses this laptop's webcam to simulate a Ring device, matching by ${mode === "face" ? "face" : "QR code"} for demoing check-in without a Ring Playground token or account.`}
      </p>

      {canChangeSettings && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={source === "ring" ? "default" : "outline"}
            size="sm"
            onClick={() => setSource("ring")}
          >
            <Video className="mr-2 h-3.5 w-3.5" /> Ring Playground
          </Button>
          <Button
            type="button"
            variant={source === "webcam" ? "default" : "outline"}
            size="sm"
            onClick={() => setSource("webcam")}
          >
            <Webcam className="mr-2 h-3.5 w-3.5" /> Laptop Webcam (dev playground)
          </Button>
        </div>
      )}

      <div className="flex flex-col items-center">
        <div className="relative bg-black rounded-lg overflow-hidden w-full max-w-sm aspect-square mb-4">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />

          {status === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
              Not connected
            </div>
          )}

          {status === "connecting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Connecting to device...</span>
            </div>
          )}

          {status === "live" && (
            <>
              <div className="absolute inset-0 border-2 border-white/30 rounded-lg">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary animate-pulse" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary animate-pulse" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary animate-pulse" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-3/4 aspect-square"
                  style={{ animation: "scan-region-breathe 0.4s ease-in-out infinite alternate" }}
                >
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 238 238"
                    preserveAspectRatio="none"
                    style={{ fill: "none", stroke: "#e9b213", strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" }}
                  >
                    <path d="M31 2H10a8 8 0 0 0-8 8v21M207 2h21a8 8 0 0 1 8 8v21m0 176v21a8 8 0 0 1-8 8h-21m-176 0H10a8 8 0 0 1-8-8v-21" />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 text-xs text-blue-200">
                {mode === "face" ? (
                  <>
                    <ScanFace className="h-3.5 w-3.5 animate-pulse" />
                    Scanning for a face...
                  </>
                ) : (
                  <>
                    <QrCode className="h-3.5 w-3.5 animate-pulse" />
                    Waiting for QR code...
                  </>
                )}
              </div>
            </>
          )}

          {status === "matched" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-green-900/70 text-white">
              <CheckCircle className="h-10 w-10 text-green-300" />
              <span className="font-medium">{matchedName} checked in</span>
            </div>
          )}
        </div>

        {status === "error" && <p className="text-red-500 text-sm mb-2">{errorMessage}</p>}

        {canChangeSettings && (
          <div className="flex items-center gap-2 mb-3">
            <QrCode className={`h-4 w-4 ${mode === "qr" ? "text-primary" : "text-gray-400"}`} />
            <Label htmlFor="capture-mode-switch" className="text-sm text-gray-500">QR</Label>
            <Switch
              id="capture-mode-switch"
              checked={mode === "face"}
              onCheckedChange={(checked) => setMode(checked ? "face" : "qr")}
            />
            <Label htmlFor="capture-mode-switch" className="text-sm text-gray-500">Facial Recognition</Label>
            <ScanFace className={`h-4 w-4 ${mode === "face" ? "text-primary" : "text-gray-400"}`} />
          </div>
        )}

        {canChangeSettings && (
          <div className="flex items-center gap-2 mb-3">
            <Label htmlFor="checkin-confirm-switch" className="text-sm text-gray-500">Confirm popup</Label>
            <Switch
              id="checkin-confirm-switch"
              checked={checkInMode === "auto"}
              onCheckedChange={(checked) => setCheckInMode(checked ? "auto" : "confirm")}
            />
            <Label htmlFor="checkin-confirm-switch" className="text-sm text-gray-500">Auto check-in (unattended booth)</Label>
          </div>
        )}

        <div className="flex gap-2">
          {status === "idle" || status === "error" || status === "matched" ? (
            <Button onClick={start} disabled={source === "ring" && !ringDeviceId}>
              <Video className="mr-2 h-4 w-4" /> Start Live Check-in
            </Button>
          ) : (
            <Button variant="outline" onClick={stop}>
              <VideoOff className="mr-2 h-4 w-4" /> Stop
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={!!pendingMatch} onOpenChange={(open) => { if (!open && !confirming) cancelPendingMatch(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Attendee detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMatch
                ? `${pendingMatch.userName} matched via ${pendingMatch.method === "face" ? "facial recognition" : "QR code"}. Check them in?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming} onClick={cancelPendingMatch}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction disabled={confirming} onClick={confirmPendingMatch}>
              {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              Check in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default RingCheckInView;

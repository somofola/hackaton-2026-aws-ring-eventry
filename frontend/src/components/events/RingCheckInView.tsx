import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, CheckCircle, Loader2, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  openRingWhep,
  closeRingWhep,
  testRingCapture,
  checkInByQr,
} from "@/services/eventService";

interface RingCheckInViewProps {
  eventUuid: string;
  ringDeviceId: string;
  checkedInBy: string;
  /** Called after a successful check-in so parent lists/counters can refresh. */
  onCheckedIn?: (enrollment: unknown) => void;
}

const CAPTURE_POLL_INTERVAL_MS = 1500;

/**
 * Live "counter kiosk" view for Ring check-in — no physical device required:
 * opens a real WHEP session against the Ring Playground's virtual device
 * (same trick as scripts/ring-test-capture.sh) so the camera has footage to
 * serve, then polls the existing test-capture endpoint until a frame
 * decodes a QR code, and checks the attendee in via checkInByQr.
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const sessionUrlRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);
  const lastErrorRef = useRef<string>("");

  const { toast } = useToast();

  // Ring caps WHEP live sessions at 30s for battery-powered devices (60s
  // line-powered) — see docs/ring/api-documentation.html#session-duration-limits.
  // Re-opening a fresh session on this cadence keeps the device's media
  // buffer continuously warm so test-capture doesn't start 416ing the moment
  // the prior session auto-expires server-side.
  const SESSION_REFRESH_MS = 20_000;

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

  const teardown = async () => {
    stoppedRef.current = true;
    stopPolling();
    stopRefreshLoop();
    await closeCurrentSession();
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

  const pollForQr = () => {
    pollRef.current = setInterval(async () => {
      if (stoppedRef.current) return;

      try {
        const result = await testRingCapture(ringDeviceId);

        if (result.success && result.qr_result) {
          stopPolling();

          try {
            const res = await checkInByQr(eventUuid, result.qr_result, checkedInBy, ringDeviceId);
            setMatchedName((res?.user_name as string) || "Attendee");
            setStatus("matched");
            onCheckedIn?.(res);
            toast({ title: "Checked in!", description: "Attendee matched via Ring QR capture." });
            await teardown();
          } catch (err) {
            const message =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              "Check-in failed for the decoded QR code";
            toast({ title: "Check-in failed", description: message, variant: "destructive" });
            // Keep polling — could've been a stale/already-checked-in badge caught mid-frame.
            pollForQr();
          }
        }
      } catch {
        // transient snapshot miss — keep polling silently
      }
    }, CAPTURE_POLL_INTERVAL_MS);
  };

  const start = async () => {
    stoppedRef.current = false;
    setStatus("connecting");
    setErrorMessage("");
    setMatchedName(null);
    lastErrorRef.current = "";

    const opened = await openSession();

    if (opened) {
      setStatus("live");
      startRefreshLoop();
      pollForQr();
    } else {
      const message = lastErrorRef.current || "Could not start Ring live view — check RING_ACCESS_TOKEN and device ID.";
      setErrorMessage(message);
      toast({ title: "Ring live view error", description: message, variant: "destructive" });
      setStatus("error");
      await teardown();
    }
  };

  const stop = async () => {
    await teardown();
    setStatus("idle");
  };

  useEffect(() => {
    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Video className="h-5 w-5 text-gray-500" />
          Ring Counter Check-in (live demo)
        </h3>
      </div>
      <p className="text-sm text-gray-500">
        Opens a live view on the Ring Playground device and watches for an attendee's QR code —
        no physical camera required.
      </p>

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
                <QrCode className="h-3.5 w-3.5 animate-pulse" />
                Waiting for QR code...
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

        <div className="flex gap-2">
          {status === "idle" || status === "error" || status === "matched" ? (
            <Button onClick={start} disabled={!ringDeviceId}>
              <Video className="mr-2 h-4 w-4" /> Start Live Check-in
            </Button>
          ) : (
            <Button variant="outline" onClick={stop}>
              <VideoOff className="mr-2 h-4 w-4" /> Stop
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RingCheckInView;

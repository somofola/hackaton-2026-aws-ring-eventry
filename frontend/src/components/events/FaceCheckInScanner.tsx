import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, ScanFace, SearchX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFaceCapture } from "@/hooks/useFaceCapture";
import { checkInByFace } from "@/services/eventService";

interface FaceCheckInScannerProps {
  eventUuid: string;
  checkedInBy: string;
  ringDeviceId?: string;
  onCheckedIn?: (enrollment: unknown) => void;
}

const POLL_INTERVAL_MS = 1500;
const NO_MATCH_THRESHOLD = 8;

/**
 * Staff-triggered face check-in — live camera, polls a captured frame
 * against the event's Rekognition collection every ~1.5s (same cadence as
 * RingCheckInView's QR polling). Most frames simply won't match (no face
 * centered, or the attendee never opted in) — that's expected; after
 * NO_MATCH_THRESHOLD consecutive misses a "not found" hint surfaces instead
 * of spamming it every single poll.
 */
const FaceCheckInScanner: React.FC<FaceCheckInScannerProps> = ({ eventUuid, checkedInBy, ringDeviceId, onCheckedIn }) => {
  const { videoRef, start, stop, captureFrame, ready, error } = useFaceCapture();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastMatchName, setLastMatchName] = useState<string | null>(null);
  const [noMatchStreak, setNoMatchStreak] = useState(0);
  const [stoppedNotFound, setStoppedNotFound] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const tryMatch = async () => {
    if (processing) return;
    const frame = await captureFrame();
    if (!frame) return;

    setProcessing(true);
    try {
      const result = await checkInByFace(eventUuid, frame, checkedInBy, ringDeviceId);
      setNoMatchStreak(0);
      setLastMatchName(result.user_name || "Attendee");
      toast({ title: "Checked in!", description: `${result.user_name || "Attendee"} matched via face recognition.` });
      onCheckedIn?.(result);
      handleStop();
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      if (status === 409) {
        setNoMatchStreak(0);
        const enrollment = (err as { response?: { data?: { enrollment?: { user_name?: string } } } })?.response?.data?.enrollment;
        setLastMatchName(enrollment?.user_name || "Attendee");
        toast({
          title: "Already checked in",
          description: enrollment?.user_name ? `${enrollment.user_name} is already checked in` : "This attendee is already checked in",
          variant: "destructive",
        });
        handleStop();
      } else if (status === 404) {
        // "no confident match" is the normal no-op case for most polled frames — only surface a hint after repeated misses.
        setNoMatchStreak((n) => n + 1);
      } else {
        console.error("Face check-in error:", err);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleStart = async () => {
    setLastMatchName(null);
    setNoMatchStreak(0);
    setStoppedNotFound(false);
    setScanning(true);
    await start();
  };

  const handleStop = () => {
    stopPolling();
    stop();
    setScanning(false);
    setNoMatchStreak(0);
  };

  useEffect(() => {
    if (scanning && ready) {
      pollRef.current = setInterval(tryMatch, POLL_INTERVAL_MS);
    }
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, ready]);

  useEffect(() => {
    if (noMatchStreak >= NO_MATCH_THRESHOLD) {
      setStoppedNotFound(true);
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noMatchStreak]);

  useEffect(() => stop, [stop]);

  return (
    <div className="text-center space-y-4 pt-2">
      {!scanning ? (
        <div className="space-y-4">
          {stoppedNotFound ? (
            <div className="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <SearchX className="h-4 w-4" />
              <span className="font-medium">No matching face found — camera stopped</span>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">Scan attendees' faces instead of their QR badge</p>
          )}
          <Button onClick={handleStart} className="w-full" size="lg">
            <ScanFace className="mr-2 h-4 w-4" />
            Start Face Check-in
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden w-full max-w-sm mx-auto aspect-square">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-white/80 text-sm">
                Camera access needed: {error}
              </div>
            ) : (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />

                {!ready && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}

                {ready && (
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
                      <ScanFace className="h-3.5 w-3.5 animate-pulse" />
                      Scanning for a face...
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <Button variant="outline" onClick={handleStop} className="w-full">
            Stop Scanner
          </Button>
        </div>
      )}

      {lastMatchName && (
        <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium">Last match: {lastMatchName}</span>
        </div>
      )}
    </div>
  );
};

export default FaceCheckInScanner;

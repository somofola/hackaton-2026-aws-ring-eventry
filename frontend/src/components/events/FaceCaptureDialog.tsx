import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ScanFace, RotateCcw, Check } from "lucide-react";
import { useFaceCapture } from "@/hooks/useFaceCapture";

interface FaceCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the captured (or manually-picked, via fallback) photo. */
  onCapture: (file: File) => void | Promise<void>;
  uploading: boolean;
}

const COUNTDOWN_SECONDS = 3;

/**
 * Live-camera face capture for event registration opt-in. Auto-grabs one
 * frame after a short countdown (reads as "a quick video moment" to the
 * user) rather than storing any actual video — only the single best still
 * ever leaves the browser. Falls back to a plain file input (still with
 * capture="user" so it opens the camera on mobile) if getUserMedia is
 * unavailable or denied, so the feature never hard-blocks a user.
 */
const FaceCaptureDialog: React.FC<FaceCaptureDialogProps> = ({ open, onOpenChange, onCapture, uploading }) => {
  const { videoRef, start, stop, captureFrame, ready, error } = useFaceCapture();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setCapturedBlob(null);
      setCapturedUrl(null);
      setCountdown(null);
      start();
    } else {
      stop();
    }
    return () => {
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (ready && open && !capturedBlob) {
      setCountdown(COUNTDOWN_SECONDS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      captureFrame().then((blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedUrl(URL.createObjectURL(blob));
          stop();
        }
      });
      return;
    }
    countdownTimer.current = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => {
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    start();
  };

  const handleUse = async () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], "face-capture.jpg", { type: "image/jpeg" });
    await onCapture(file);
  };

  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-primary" /> Enable Face Check-in
          </DialogTitle>
          <DialogDescription>
            We'll open your camera for a couple seconds and grab one clear frame. Nothing is recorded or stored as
            video — just a single photo used to match you at this event's entrance.
          </DialogDescription>
        </DialogHeader>

        <div className="relative bg-black rounded-lg overflow-hidden aspect-square w-full max-w-xs mx-auto">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-white/80 text-sm">
              <p>Couldn't access your camera: {error}</p>
              <label className="inline-block">
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFallbackFile} />
                <Button variant="outline" size="sm">
                  Upload a photo instead
                </Button>
              </label>
            </div>
          ) : capturedUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={capturedUrl} className="w-full h-full object-cover" alt="Captured face" />
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              {ready && countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="text-5xl font-bold text-white">{countdown}</span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {capturedUrl ? (
            <>
              <Button variant="outline" onClick={handleRetake} disabled={uploading}>
                <RotateCcw className="mr-2 h-4 w-4" /> Retake
              </Button>
              <Button onClick={handleUse} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Use This Photo
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FaceCaptureDialog;

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared camera-capture mechanics for anything that needs "take a live frame
 * of a face" — the one-shot registration opt-in (FaceCaptureDialog) and the
 * polling check-in scanner (FaceCheckInScanner). Keeps getUserMedia
 * lifecycle + canvas frame-grab in one place instead of duplicated per
 * component.
 */
export function useFaceCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not access camera — check browser permissions."
      );
      setReady(false);
    }
  }, []);

  /** Grabs the current video frame as a JPEG blob, or null if the video isn't ready. */
  const captureFrame = useCallback((): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) {
      return Promise.resolve(null);
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9));
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, start, stop, captureFrame, ready, error };
}

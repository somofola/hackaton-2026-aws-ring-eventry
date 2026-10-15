/**
 * Parses a naive date + time string as a moment in the app's configured timezone
 * (VITE_TIMEZONE), returning a UTC millisecond timestamp.
 *
 * Falls back to the browser's local timezone when VITE_TIMEZONE is not set.
 *
 * Usage:
 *   const ms = parseEventDateTime("2024-03-15", "18:00");
 *   const isPast = Date.now() > ms;
 */

export const APP_TZ: string =
  (import.meta.env.VITE_TIMEZONE as string | undefined) ||
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export function parseEventDateTime(
  dateStr: string | null | undefined,
  timeStr?: string | null,
): number {
  if (!dateStr) return 0;
  const t = timeStr ?? "23:59";
  // Ensure HH:MM:SS format for reliable Date parsing
  const tFull = t.length <= 5 ? `${t}:00` : t;
  const naive = new Date(`${dateStr}T${tFull}`);
  if (isNaN(naive.getTime())) return 0;

  try {
    // Find the wall-clock representation of `naive`'s UTC moment in APP_TZ,
    // then compute the offset so the *input* strings are treated as APP_TZ local time.
    const tzWall = new Date(
      naive.toLocaleString("en-US", { timeZone: APP_TZ }),
    );
    if (isNaN(tzWall.getTime())) return naive.getTime();
    return naive.getTime() + (naive.getTime() - tzWall.getTime());
  } catch {
    return naive.getTime(); // fallback: treat as browser local time
  }
}

/** Returns true when the event's end (or start) datetime has passed. */
export function isEventPast(event: {
  status?: string;
  end_date?: string | null;
  start_date?: string | null;
  end_time?: string | null;
  start_time?: string | null;
}): boolean {
  if (event.status === "completed") return true;
  const dateStr = event.end_date ?? event.start_date;
  const timeStr = event.end_time ?? event.start_time ?? "23:59";
  const endMs = parseEventDateTime(dateStr, timeStr);
  return endMs > 0 && Date.now() > endMs;
}

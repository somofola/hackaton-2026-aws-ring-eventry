// User-facing brand label for this hackathon build. Renamed from "PassIDy"
// to "Eventry" to reflect the event-check-in-only scope of this demo.
export const BRAND_NAME = "Eventry";

const WEBSITE_URL = (import.meta.env.VITE_WEBSITE_URL || "https://eventry.app").replace(/\/$/, "");

export const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || `support@${new URL(WEBSITE_URL).hostname}`;

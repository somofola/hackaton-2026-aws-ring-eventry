/**
 * useUserProfile
 *
 * Fetches /user/profile once per session and caches the result in
 * sessionStorage so that navigating between pages (which re-mounts the
 * layout) never triggers a redundant network request.
 *
 * Cache lifetime: 5 minutes. A background refresh fires silently when the
 * cache is stale so the UI always shows fresh data on the next render.
 *
 * Invalidation: call `invalidateProfile()` after a profile update (e.g.
 * settings save) or dispatch the "eventry:profile-updated" window event.
 */

import { useState, useEffect } from "react";
import api from "@/services/api";

const CACHE_KEY = "eventry_user_profile";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  ts: number;
}

function readCache(): any | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as CacheEntry).data;
  } catch {
    return null;
  }
}

function isCacheFresh(): boolean {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    return Date.now() - (JSON.parse(raw) as CacheEntry).ts < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

function writeCache(data: any) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() } as CacheEntry));
  } catch {}
}

export function clearProfileCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

export function invalidateProfile() {
  clearProfileCache();
  window.dispatchEvent(new Event("eventry:profile-updated"));
}

export function useUserProfile() {
  // Initialise from cache synchronously â€” no flash of missing avatar/name
  const [user, setUser] = useState<any>(() => readCache());

  useEffect(() => {
    let cancelled = false;

    const fetch = () =>
      api.get("/user/profile")
        .then((r) => {
          if (cancelled) return;
          writeCache(r.data);
          setUser(r.data);
        })
        .catch(() => {});

    if (!isCacheFresh()) {
      fetch();
    }

    // Re-fetch when another part of the app signals a profile change
    const handler = () => fetch();
    window.addEventListener("eventry:profile-updated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("eventry:profile-updated", handler);
    };
  }, []);

  return user;
}


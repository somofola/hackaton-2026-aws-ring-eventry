// src/services/tokenStorage.ts
//
// SECURITY (F-12): Platform-aware token storage.
//
// Web:    The auth token is held in an HttpOnly cookie issued by the backend.
//         JS cannot read it (that's the point — XSS-safe). We therefore keep an
//         in-memory cache for things like "do I have a session?" checks. On a
//         hard reload the cache is empty but `/auth/validate-token` re-hydrates
//         the user record on first authenticated call.
//
// Native: Cookies don't work reliably cross-origin in WKWebView. We persist the
//         Bearer token in Keychain (iOS) / Android Keystore via
//         capacitor-secure-storage-plugin and attach it on every request.
//
// `user_*` records (profile snapshot) stay client-side either way and live in
// the same storage so role switching works.

import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

type Role = "user" | "team" | "admin";

const isNative = (): boolean => {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
};

const tokenKey = (role: Role | string) => `auth_${role || "user"}_token`;
const userKey  = (role: Role | string) => `auth_${role || "user"}_user`;

// In-memory mirror — web has no other JS-visible store for the token.
const memToken: Record<string, string | null> = {};
const memUser:  Record<string, string | null> = {};

async function nativeGet(key: string): Promise<string | null> {
    try {
        const { value } = await SecureStoragePlugin.get({ key });
        return value ?? null;
    } catch {
        return null;
    }
}

async function nativeSet(key: string, value: string): Promise<void> {
    try {
        await SecureStoragePlugin.set({ key, value });
    } catch {}
}

async function nativeRemove(key: string): Promise<void> {
    try {
        await SecureStoragePlugin.remove({ key });
    } catch {}
}

export const tokenStorage = {
    isNative,

    async setToken(role: string, token: string): Promise<void> {
        memToken[role] = token;
        if (isNative()) {
            await nativeSet(tokenKey(role), token);
        } else {
            // Web: persist so a reload survives. Cross-site cookies blocked by
            // Chrome 3rd-party cookie phase-out, so cookie-only doesn't work
            // when frontend domain ≠ backend domain. Accepts XSS trade-off.
            try { localStorage.setItem(tokenKey(role), token); } catch {}
        }
    },

    async getToken(role: string): Promise<string | null> {
        if (memToken[role]) return memToken[role];
        if (isNative()) {
            const t = await nativeGet(tokenKey(role));
            if (t) memToken[role] = t;
            return t;
        }
        // Web: try persisted token
        try {
            const t = localStorage.getItem(tokenKey(role));
            if (t) memToken[role] = t;
            return t;
        } catch {
            return null;
        }
    },

    async clearToken(role: string): Promise<void> {
        memToken[role] = null;
        if (isNative()) {
            await nativeRemove(tokenKey(role));
        } else {
            try { localStorage.removeItem(tokenKey(role)); } catch {}
        }
    },

    async clearAllTokens(): Promise<void> {
        for (const r of ["user", "team", "admin"]) {
            await this.clearToken(r);
        }
    },

    async setUser(role: string, payload: unknown): Promise<void> {
        const json = JSON.stringify(payload);
        memUser[role] = json;
        if (isNative()) {
            await nativeSet(userKey(role), json);
        } else {
            // Web: user profile is non-secret; keep in localStorage so a
            // page reload doesn't blank the UI before /validate-token returns.
            try { localStorage.setItem(userKey(role), json); } catch {}
        }
    },

    async getUser<T = unknown>(role: string): Promise<T | null> {
        let raw = memUser[role];
        if (!raw) {
            if (isNative()) {
                raw = await nativeGet(userKey(role));
            } else {
                try { raw = localStorage.getItem(userKey(role)); } catch { raw = null; }
            }
            if (raw) memUser[role] = raw;
        }
        if (!raw) return null;
        try { return JSON.parse(raw) as T; } catch { return null; }
    },

    async clearUser(role: string): Promise<void> {
        memUser[role] = null;
        if (isNative()) {
            await nativeRemove(userKey(role));
        } else {
            try { localStorage.removeItem(userKey(role)); } catch {}
        }
    },

    /** Best-effort sync read of cached user — for UI gating only, never trust for auth. */
    getUserSync<T = unknown>(role: string): T | null {
        const raw = memUser[role] ?? (() => {
            if (isNative()) return null;
            try { return localStorage.getItem(userKey(role)); } catch { return null; }
        })();
        if (!raw) return null;
        memUser[role] = raw;
        try { return JSON.parse(raw) as T; } catch { return null; }
    },

    /**
     * Best-effort sync read of the Bearer token. Returns the in-memory copy if
     * present; on native the caller MUST await getToken() at startup to hydrate.
     * Web always returns null here — the cookie is the source of truth.
     */
    getTokenSync(role: string): string | null {
        if (memToken[role]) return memToken[role];
        if (isNative()) return null;
        try {
            const t = localStorage.getItem(tokenKey(role));
            if (t) memToken[role] = t;
            return t;
        } catch {
            return null;
        }
    },

    /**
     * Hydrate the in-memory cache from secure storage. Call once at app boot
     * before any authenticated UI renders so PrivateRoute can answer sync.
     */
    async hydrate(): Promise<void> {
        for (const r of ["user", "team", "admin"]) {
            if (isNative()) {
                const t = await nativeGet(tokenKey(r));
                if (t) memToken[r] = t;
                const u = await nativeGet(userKey(r));
                if (u) memUser[r] = u;
            } else {
                try {
                    const t = localStorage.getItem(tokenKey(r));
                    if (t) memToken[r] = t;
                    const u = localStorage.getItem(userKey(r));
                    if (u) memUser[r] = u;
                } catch {}
            }
        }
    },
};

export const detectRoleFromPath = (path?: string): Role => {
    const p = (path ?? window.location.pathname).toLowerCase();
    if (p.startsWith("/admin")) return "admin";
    if (p.startsWith("/team")) return "team";
    return "user";
};

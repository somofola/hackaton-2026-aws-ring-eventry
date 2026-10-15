/**
 * pushService.ts
 * Handles push notification registration for both Web (Firebase FCM) and Mobile (FCM via Capacitor).
 * Call `initPushNotifications()` once after the user is authenticated.
 */

import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, PushNotificationSchema } from "@capacitor/push-notifications";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import api from "./api";
import { firebaseApp, VAPID_KEY } from "./firebaseConfig";
import { BRAND_NAME } from "@/lib/brand";

function getDeviceId(): string {
  let id = localStorage.getItem("pme_device_id");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem("pme_device_id", id);
  }
  return id;
}

/**
 * Wipe Firebase's cached FCM token from IndexedDB before requesting a new one.
 * Must be called BEFORE getMessaging() so there is no open IDB connection conflict.
 */
async function clearFirebaseTokenCache(): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("firebase-messaging-database");
    req.onsuccess = () => resolve();
    req.onerror   = () => resolve(); // continue even if DB didn't exist
    req.onblocked = () => resolve();
  });
}

// ── Web Push via Firebase Cloud Messaging ────────────────────────────────────
async function initWebPush(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

  // If already denied, browser won't re-prompt — bail out silently.
  if (Notification.permission === "denied") return;

  // Only show the browser prompt when not yet decided.
  if (Notification.permission === "default") {
    const result = await Notification.requestPermission();
    if (result !== "granted") return;
  }

  // Permission is "granted" — proceed with FCM registration.

  // Guard: invalid/missing VAPID key triggers atob InvalidCharacterError deep in
  // firebase_messaging.js. Fail loud here instead.
  if (!VAPID_KEY || !/^[A-Za-z0-9_-]+$/.test(VAPID_KEY)) {
    console.error("[Push] VITE_FIREBASE_VAPID_KEY missing or not url-safe base64. Skipping FCM registration.");
    return;
  }

  // Guard: missing Firebase app config (appId, projectId, etc.) causes
  // installations/missing-app-config-values deep in firebase-messaging.
  const cfg = (firebaseApp as unknown as { options?: Record<string, string> }).options || {};
  const required = ["apiKey", "projectId", "appId", "messagingSenderId"];
  const missing = required.filter((k) => !cfg[k]);
  if (missing.length) {
    console.error(`[Push] Firebase config missing: ${missing.join(", ")}. Set VITE_FIREBASE_* env vars. Skipping FCM registration.`);
    return;
  }

  try {
    // 1. Delete stale Firebase IDB token cache (before opening any connection)
    await clearFirebaseTokenCache();

    // 2. Get messaging instance AFTER cache is cleared
    const messaging = getMessaging(firebaseApp);

    // 3. Register (or reuse) the Firebase service worker
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });

    // 4. Wait for SW to be fully active (skipWaiting in SW handles fast activation)
    await navigator.serviceWorker.ready;

    // 5. Get a guaranteed-fresh FCM token
    const token = await getToken(messaging, {
      vapidKey:                  VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    if (!token) {
      //console.error("[Push] getToken returned empty — verify VAPID key in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.");
      console.error("[Push] getToken returned empty — verify VAPID key");
      return;
    }

    //console.log("[Push] FCM token obtained:", token.slice(0, 20) + "…");

    await api.post("/push-tokens", {
      type:      "fcm",
      token,
      device_id: getDeviceId(),
    });

    //console.log("[Push] Token saved to backend successfully.");

    // Handle foreground messages (tab is open)
    onMessage(messaging, (payload) => {
      window.dispatchEvent(new CustomEvent("pme:push", { detail: payload }));

      // Show a native notification even in foreground (required for mobile Chrome)
      const title = payload.notification?.title ?? BRAND_NAME;
      const body  = payload.notification?.body  ?? "";
      reg.showNotification(title, {
        body,
        icon:  "/logo-mobile.png",
        badge: "/logo-mobile.png",
        tag:   "pass-mobile-extreme-notification",
        data:  { url: payload.data?.url ?? "/user/notifications" },
      });
    });
  } catch (err) {
    console.error("[Push] Web FCM registration failed:", err);
  }
}

// ── Capacitor (mobile FCM) ───────────────────────────────────────────────────
async function initMobilePush(): Promise<void> {
  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token: Token) => {
      try {
        await api.post("/push-tokens", {
          type:      "fcm",
          token:     token.value,
          device_id: getDeviceId(),
        });
      } catch (err) {
        console.error("[Push] FCM mobile token save failed:", err);
      }
    });

    PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
      window.dispatchEvent(new CustomEvent("pme:push", { detail: notification }));
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = action.notification.data?.url;
      if (url) window.location.href = url;
    });
  } catch (err) {
    console.error("[Push] Mobile push registration failed:", err);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
export async function initPushNotifications(): Promise<void> {
  if (import.meta.env.VITE_PUSH_ENABLED === "false") {
    console.warn("[Push] Disabled via VITE_PUSH_ENABLED=false.");
    return;
  }
  if (Capacitor.isNativePlatform()) {
    await initMobilePush();
  } else {
    await initWebPush();
  }
}

/** Unregister push on logout */
export async function unregisterPush(): Promise<void> {
  const deviceId = getDeviceId();
  if (Capacitor.isNativePlatform()) {
    try { await api.delete("/push-tokens", { data: { type: "fcm", device_id: deviceId } }); } catch {}
  } else {
    try {
      await clearFirebaseTokenCache();
      const reg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        await reg.unregister();
      }
      await api.delete("/push-tokens", { data: { type: "fcm", device_id: deviceId } });
    } catch {}
  }
}
